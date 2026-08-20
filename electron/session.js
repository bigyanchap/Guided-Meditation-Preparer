const path = require('path')
const fs = require('fs')
const os = require('os')

const PROJECT_FILE = 'project.json'

function getBaseDir() {
  return path.join(os.homedir(), 'Documents', 'MeditationPreparer', 'sessions')
}

function getSessionPaths(folder) {
  return {
    folder,
    rawDir: folder,
    processedDir: path.join(folder, 'processed'),
    projectFile: path.join(folder, PROJECT_FILE),
  }
}

function ensureDirs(folder) {
  const { processedDir } = getSessionPaths(folder)
  fs.mkdirSync(folder, { recursive: true })
  fs.mkdirSync(processedDir, { recursive: true })
}

function createNewSession(store) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19)
  const folder = path.join(getBaseDir(), timestamp)
  ensureDirs(folder)

  const session = {
    folder,
    createdAt: Date.now(),
  }

  store.set('lastProjectFolder', folder)
  store.set('sessionCreatedAt', session.createdAt)
  store.set('finalOutputPath', null)

  saveProjectState(folder, {
    version: 1,
    savedAt: Date.now(),
    createdAt: session.createdAt,
    projectName: '',
    activeSegmentId: null,
    scriptText: '',
    teleprompterEditing: true,
    finalOutputPath: null,
    pipelineStatuses: {
      noise: 'pending',
      voice: 'pending',
      trim: 'pending',
      stitch: 'pending',
    },
    segments: [],
  })

  return session
}

function ensureSession(store) {
  const last = store.get('lastProjectFolder')
  if (last && fs.existsSync(last)) {
    ensureDirs(last)
    return {
      folder: last,
      createdAt: store.get('sessionCreatedAt') || Date.now(),
    }
  }
  return createNewSession(store)
}

function sanitizeProjectState(raw) {
  if (!raw || typeof raw !== 'object') return null

  const segments = Array.isArray(raw.segments)
    ? raw.segments.map((s) => {
        const filePath = s.filePath || null
        const fileOk = Boolean(filePath && fs.existsSync(filePath))
        const wasDone = s.status === 'done' || s.status === 'recording'
        return {
          id: Number(s.id) || 1,
          label: s.label || `Record ${s.id}`,
          status: fileOk ? 'done' : wasDone && !fileOk ? 'pending' : s.status === 'recording' ? 'pending' : s.status || 'pending',
          filePath: fileOk ? filePath : null,
          duration: fileOk ? Number(s.duration) || 0 : 0,
          waveformData: fileOk && Array.isArray(s.waveformData) ? s.waveformData : [],
        }
      })
    : []

  const activeSegmentId =
    segments.some((s) => s.id === raw.activeSegmentId) ? raw.activeSegmentId : segments[0]?.id || null

  const finalOutputPath =
    raw.finalOutputPath && fs.existsSync(raw.finalOutputPath) ? raw.finalOutputPath : null

  const pipelineStatuses = raw.pipelineStatuses || {
    noise: 'pending',
    voice: 'pending',
    trim: 'pending',
    stitch: 'pending',
  }

  return {
    version: 1,
    savedAt: raw.savedAt || Date.now(),
    createdAt: raw.createdAt || Date.now(),
    projectName:
      typeof raw.projectName === 'string' && raw.projectName.trim()
        ? raw.projectName.trim()
        : '',
    activeSegmentId,
    scriptText: typeof raw.scriptText === 'string' ? raw.scriptText : '',
    teleprompterEditing:
      typeof raw.teleprompterEditing === 'boolean'
        ? raw.teleprompterEditing
        : !String(raw.scriptText || '').trim(),
    finalOutputPath,
    pipelineStatuses,
    segments,
  }
}

function sanitizeFolderName(name) {
  const cleaned = String(name || 'Untitled Project')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
  return cleaned || 'Untitled Project'
}

/**
 * Save project under parentDir/projectName, copying audio files if relocating.
 */
function saveProjectAs(store, { parentDir, projectName, state, currentFolder }) {
  if (!parentDir) throw new Error('Choose a save location')
  const niceName = String(projectName || '').trim() || 'Untitled Project'
  const folderName = sanitizeFolderName(niceName)
  const destFolder = path.join(parentDir, folderName)

  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true })
  }

  const sameFolder =
    currentFolder && path.resolve(currentFolder) === path.resolve(destFolder)

  if (!sameFolder && fs.existsSync(destFolder)) {
    const existing = path.join(destFolder, PROJECT_FILE)
    if (fs.existsSync(existing)) {
      throw new Error(`A project named "${folderName}" already exists in that location.`)
    }
  }

  ensureDirs(destFolder)

  const nextState = {
    ...state,
    projectName: niceName,
    segments: Array.isArray(state.segments) ? state.segments.map((s) => ({ ...s })) : [],
  }

  // Relocate / refresh segment audio into the destination folder
  nextState.segments = nextState.segments.map((seg) => {
    if (!seg.filePath || !fs.existsSync(seg.filePath)) {
      return { ...seg, filePath: null, status: seg.status === 'done' ? 'pending' : seg.status }
    }
    const destFile = path.join(destFolder, `segment_${seg.id}.wav`)
    if (path.resolve(seg.filePath) !== path.resolve(destFile)) {
      fs.copyFileSync(seg.filePath, destFile)
    }
    return { ...seg, filePath: destFile, status: 'done' }
  })

  if (state.finalOutputPath && fs.existsSync(state.finalOutputPath)) {
    const destFinal = path.join(destFolder, 'final_meditation.mp3')
    if (path.resolve(state.finalOutputPath) !== path.resolve(destFinal)) {
      fs.copyFileSync(state.finalOutputPath, destFinal)
    }
    nextState.finalOutputPath = destFinal
  } else {
    nextState.finalOutputPath = null
  }

  const saved = saveProjectState(destFolder, nextState)
  store.set('lastProjectFolder', destFolder)
  store.set('sessionCreatedAt', saved.createdAt || Date.now())
  store.set('finalOutputPath', saved.finalOutputPath || null)

  return {
    folder: destFolder,
    createdAt: saved.createdAt || Date.now(),
    project: sanitizeProjectState({ ...saved, folder: destFolder }),
    savedAt: saved.savedAt,
  }
}

function saveProjectState(folder, state) {
  if (!folder) throw new Error('No project folder')
  ensureDirs(folder)
  const payload = {
    ...state,
    version: 1,
    savedAt: Date.now(),
  }
  fs.writeFileSync(getSessionPaths(folder).projectFile, JSON.stringify(payload, null, 2), 'utf8')
  return payload
}

function loadProjectState(folder) {
  if (!folder || !fs.existsSync(folder)) return null
  const projectFile = getSessionPaths(folder).projectFile
  if (!fs.existsSync(projectFile)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(projectFile, 'utf8'))
    return sanitizeProjectState({ ...raw, folder })
  } catch {
    return null
  }
}

function listProjects() {
  const base = getBaseDir()
  if (!fs.existsSync(base)) return []
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const folder = path.join(base, d.name)
      const project = loadProjectState(folder)
      return {
        folder,
        name: d.name,
        savedAt: project?.savedAt || fs.statSync(folder).mtimeMs,
        segmentCount: project?.segments?.length || 0,
        hasScript: Boolean(project?.scriptText?.trim()),
      }
    })
    .sort((a, b) => b.savedAt - a.savedAt)
}

function openProjectFolder(store, folder) {
  if (!folder || !fs.existsSync(folder)) {
    throw new Error('Project folder not found')
  }
  ensureDirs(folder)
  store.set('lastProjectFolder', folder)
  const project = loadProjectState(folder)
  store.set('sessionCreatedAt', project?.createdAt || Date.now())
  store.set('finalOutputPath', project?.finalOutputPath || null)
  return {
    folder,
    createdAt: project?.createdAt || Date.now(),
    project,
  }
}

module.exports = {
  ensureSession,
  createNewSession,
  getSessionPaths,
  getBaseDir,
  saveProjectState,
  saveProjectAs,
  loadProjectState,
  listProjects,
  openProjectFolder,
}
