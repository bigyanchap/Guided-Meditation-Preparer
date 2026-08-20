const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Window
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Session / project
  getSession: () => ipcRenderer.invoke('session:get'),
  newSession: () => ipcRenderer.invoke('session:new'),
  saveProject: (state) => ipcRenderer.invoke('session:saveProject', state),
  saveProjectAs: (payload) => ipcRenderer.invoke('session:saveProjectAs', payload),
  pickDirectory: (opts) => ipcRenderer.invoke('session:pickDirectory', opts),
  getDefaultSaveDir: () => ipcRenderer.invoke('session:getDefaultSaveDir'),
  listProjects: () => ipcRenderer.invoke('session:listProjects'),
  openProject: () => ipcRenderer.invoke('session:openProject'),
  openRecentProject: (folder) => ipcRenderer.invoke('session:openRecent', folder),

  // Audio file I/O
  saveSegment: (payload) => ipcRenderer.invoke('audio:saveSegment', payload),
  deleteSegment: (filePath) => ipcRenderer.invoke('audio:deleteSegment', filePath),
  readAudioFile: (filePath) => ipcRenderer.invoke('audio:readFile', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('audio:fileExists', filePath),
  trimKeepStart: (payload) => ipcRenderer.invoke('audio:trimKeepStart', payload),

  // Processing
  runProcessingPipeline: (segmentPaths) =>
    ipcRenderer.invoke('audio:runPipeline', segmentPaths),

  // Export
  saveFile: (sourcePath) => ipcRenderer.invoke('audio:saveDialog', sourcePath),
  saveToProject: (sourcePath) => ipcRenderer.invoke('audio:saveToProject', sourcePath),
  showInFolder: (filePath) => ipcRenderer.invoke('shell:showItem', filePath),

  // Events (Main → React)
  onProcessingProgress: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('processing:progress', handler)
    return () => ipcRenderer.removeListener('processing:progress', handler)
  },
  onProcessingDone: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('processing:done', handler)
    return () => ipcRenderer.removeListener('processing:done', handler)
  },
  onProcessingError: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('processing:error', handler)
    return () => ipcRenderer.removeListener('processing:error', handler)
  },
})
