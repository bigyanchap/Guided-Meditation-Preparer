const path = require('path')
const fs = require('fs')
const os = require('os')

function getBaseDir() {
  return path.join(os.homedir(), 'Documents', 'MeditationPreparer', 'sessions')
}

function getSessionPaths(folder) {
  return {
    folder,
    rawDir: folder,
    processedDir: path.join(folder, 'processed'),
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
  store.set('finalOutputPath', null)
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

module.exports = {
  ensureSession,
  createNewSession,
  getSessionPaths,
  getBaseDir,
}
