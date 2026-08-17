export {}

declare global {
  interface Window {
    electronAPI?: {
      platform?: NodeJS.Platform
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      getSession: () => Promise<{ folder: string; createdAt: number }>
      newSession: () => Promise<{ folder: string; createdAt: number }>
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
