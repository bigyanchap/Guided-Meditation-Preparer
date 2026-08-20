const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const {
  ensureSession,
  createNewSession,
  getSessionPaths,
  saveProjectState,
  saveProjectAs,
  loadProjectState,
  listProjects,
  openProjectFolder,
  getBaseDir,
} = require('./session')
const { processPipeline, getFfmpegPath, trimKeepStart } = require('./audioProcessor')

const isDev = process.env.NODE_ENV === 'development'
const store = new Store({ name: 'meditation-preparer' })

let mainWindow = null
let currentSession = null

const isMac = process.platform === 'darwin'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 16, y: 14 },
        }
      : {}),
    backgroundColor: '#d5e0d9',
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

app.whenReady().then(() => {
  // Verify ffmpeg is available
  try {
    const ffmpegPath = getFfmpegPath()
    if (!fs.existsSync(ffmpegPath)) {
      console.error('ffmpeg-static binary missing at', ffmpegPath)
    }
  } catch (err) {
    console.error('ffmpeg setup error:', err)
  }

  currentSession = ensureSession(store)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Window controls ──────────────────────────────────────────────
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

// ── Session / project ────────────────────────────────────────────
ipcMain.handle('session:get', () => {
  if (!currentSession) currentSession = ensureSession(store)
  const project = loadProjectState(currentSession.folder)
  return {
    ...currentSession,
    project,
  }
})

ipcMain.handle('session:new', () => {
  currentSession = createNewSession(store)
  const project = loadProjectState(currentSession.folder)
  return {
    ...currentSession,
    project,
  }
})

ipcMain.handle('session:saveProject', async (_event, state) => {
  if (!currentSession) currentSession = ensureSession(store)
  try {
    const saved = saveProjectState(currentSession.folder, state)
    if (state?.finalOutputPath) store.set('finalOutputPath', state.finalOutputPath)
    return { ok: true, savedAt: saved.savedAt, folder: currentSession.folder }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('session:saveProjectAs', async (_event, { parentDir, projectName, state }) => {
  if (!currentSession) currentSession = ensureSession(store)
  try {
    const result = saveProjectAs(store, {
      parentDir,
      projectName,
      state,
      currentFolder: currentSession.folder,
    })
    currentSession = { folder: result.folder, createdAt: result.createdAt }
    return { ok: true, ...result }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('session:pickDirectory', async (_event, { title, defaultPath } = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || 'Choose Folder',
    defaultPath: defaultPath || getBaseDir(),
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true }
  }
  return { ok: true, path: result.filePaths[0] }
})

ipcMain.handle('session:getDefaultSaveDir', async () => {
  const base = getBaseDir()
  fs.mkdirSync(base, { recursive: true })
  return { ok: true, path: base }
})

ipcMain.handle('session:listProjects', async () => {
  try {
    return { ok: true, projects: listProjects() }
  } catch (err) {
    return { ok: false, error: err.message, projects: [] }
  }
})

ipcMain.handle('session:openProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Meditation Project',
    defaultPath: getBaseDir(),
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true }
  }
  try {
    const opened = openProjectFolder(store, result.filePaths[0])
    currentSession = { folder: opened.folder, createdAt: opened.createdAt }
    return { ok: true, ...opened }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('session:openRecent', async (_event, folder) => {
  try {
    const opened = openProjectFolder(store, folder)
    currentSession = { folder: opened.folder, createdAt: opened.createdAt }
    return { ok: true, ...opened }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ── File I/O ─────────────────────────────────────────────────────
ipcMain.handle('audio:saveSegment', async (_event, { segmentId, buffer, waveformData, duration }) => {
  if (!currentSession) currentSession = ensureSession(store)
  const { rawDir } = getSessionPaths(currentSession.folder)
  const filePath = path.join(rawDir, `segment_${segmentId}.wav`)

  const data = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer))
  fs.writeFileSync(filePath, data)

  return { filePath, waveformData, duration }
})

ipcMain.handle('audio:deleteSegment', async (_event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('audio:readFile', async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Audio file not found')
  }
  const data = fs.readFileSync(filePath)
  return new Uint8Array(data)
})

ipcMain.handle('audio:fileExists', async (_event, filePath) => {
  return Boolean(filePath && fs.existsSync(filePath))
})

ipcMain.handle('audio:trimKeepStart', async (_event, { filePath, keepUntil }) => {
  try {
    const result = await trimKeepStart(filePath, keepUntil)
    return { ok: true, ...result }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ── Processing pipeline ──────────────────────────────────────────
ipcMain.handle('audio:runPipeline', async (_event, segmentPaths) => {
  if (!currentSession) currentSession = ensureSession(store)
  const { processedDir } = getSessionPaths(currentSession.folder)

  try {
    const finalPath = await processPipeline(segmentPaths, processedDir, (step) => {
      send('processing:progress', { step })
    })
    store.set('finalOutputPath', finalPath)
    send('processing:done', { path: finalPath })
    return { ok: true, path: finalPath }
  } catch (err) {
    send('processing:error', { message: err.message })
    return { ok: false, error: err.message }
  }
})

// ── Export ───────────────────────────────────────────────────────
ipcMain.handle('audio:saveDialog', async (_event, sourcePath) => {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, error: 'No final audio to save. Run the pipeline first.' }
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Final Meditation Audio',
    defaultPath: 'final_meditation.mp3',
    filters: [{ name: 'MP3 Audio', extensions: ['mp3'] }],
  })

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true }
  }

  fs.copyFileSync(sourcePath, result.filePath)
  return { ok: true, path: result.filePath }
})

ipcMain.handle('audio:saveToProject', async (_event, sourcePath) => {
  if (!currentSession) currentSession = ensureSession(store)
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, error: 'No final audio to save. Run the pipeline first.' }
  }

  const dest = path.join(currentSession.folder, 'final_meditation.mp3')
  fs.copyFileSync(sourcePath, dest)
  return { ok: true, path: dest }
})

ipcMain.handle('shell:showItem', async (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath)
  }
})
