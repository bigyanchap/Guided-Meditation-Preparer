export {}

type ProjectState = {
  version?: number
  savedAt?: number
  createdAt?: number
  projectName?: string
  activeSegmentId?: number | null
  scriptText?: string
  teleprompterEditing?: boolean
  finalOutputPath?: string | null
  pipelineStatuses?: {
    noise: string
    voice: string
    trim: string
    stitch: string
  }
  segments?: Array<{
    id: number
    label: string
    status: string
    filePath: string | null
    duration: number
    waveformData: number[]
  }>
}

declare global {
  interface Window {
    electronAPI?: {
      platform?: NodeJS.Platform
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      getSession: () => Promise<{
        folder: string
        createdAt: number
        project?: ProjectState | null
      }>
      newSession: () => Promise<{
        folder: string
        createdAt: number
        project?: ProjectState | null
      }>
      saveProject: (state: ProjectState) => Promise<{
        ok: boolean
        savedAt?: number
        folder?: string
        error?: string
      }>
      saveProjectAs: (payload: {
        parentDir: string
        projectName: string
        state: ProjectState
      }) => Promise<{
        ok: boolean
        folder?: string
        createdAt?: number
        project?: ProjectState | null
        savedAt?: number
        error?: string
      }>
      pickDirectory: (opts?: {
        title?: string
        defaultPath?: string
      }) => Promise<{ ok: boolean; path?: string; canceled?: boolean }>
      getDefaultSaveDir: () => Promise<{ ok: boolean; path?: string }>
      listProjects: () => Promise<{
        ok: boolean
        projects: Array<{
          folder: string
          name: string
          savedAt: number
          segmentCount: number
          hasScript: boolean
        }>
        error?: string
      }>
      openProject: () => Promise<{
        ok: boolean
        canceled?: boolean
        folder?: string
        createdAt?: number
        project?: ProjectState | null
        error?: string
      }>
      openRecentProject: (folder: string) => Promise<{
        ok: boolean
        folder?: string
        createdAt?: number
        project?: ProjectState | null
        error?: string
      }>
      saveSegment: (payload: {
        segmentId: number
        buffer: ArrayBuffer
        waveformData: number[]
        duration: number
      }) => Promise<{ filePath: string; waveformData: number[]; duration: number }>
      deleteSegment: (filePath: string) => Promise<{ ok: boolean; error?: string }>
      readAudioFile: (filePath: string) => Promise<ArrayBuffer | Uint8Array>
      fileExists: (filePath: string) => Promise<boolean>
      trimKeepStart: (payload: {
        filePath: string
        keepUntil: number
      }) => Promise<{
        ok: boolean
        filePath?: string
        duration?: number
        waveformData?: number[]
        error?: string
      }>
      runProcessingPipeline: (
        segmentPaths: string[]
      ) => Promise<{ ok: boolean; path?: string; error?: string }>
      saveFile: (
        sourcePath: string
      ) => Promise<{ ok: boolean; path?: string; error?: string; canceled?: boolean }>
      saveToProject: (
        sourcePath: string
      ) => Promise<{ ok: boolean; path?: string; error?: string }>
      showInFolder: (filePath: string) => Promise<void>
      onProcessingProgress: (
        callback: (data: { step: string }) => void
      ) => () => void
      onProcessingDone: (callback: (data: { path: string }) => void) => () => void
      onProcessingError: (
        callback: (data: { message: string }) => void
      ) => () => void
    }
  }
}
