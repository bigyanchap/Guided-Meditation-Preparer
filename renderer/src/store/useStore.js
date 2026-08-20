import { create } from 'zustand'

const nextId = (segments) =>
  segments.length === 0 ? 1 : Math.max(...segments.map((s) => s.id)) + 1

const SCRIPT_KEY = 'meditation-script'

const DEFAULT_PIPELINE = {
  noise: 'pending',
  voice: 'pending',
  trim: 'pending',
  stitch: 'pending',
}

function loadScript() {
  try {
    return localStorage.getItem(SCRIPT_KEY) || ''
  } catch {
    return ''
  }
}

export const useStore = create((set, get) => ({
  segments: [],
  activeSegmentId: null,
  isRecording: false,
  recordingElapsed: 0,
  liveWaveform: [],
  micError: null,
  sessionFolder: null,
  processingStep: null, // null | 'noise' | 'voice' | 'trim' | 'stitch'
  pipelineStatuses: { ...DEFAULT_PIPELINE },
  finalOutputPath: null,
  isProcessing: false,
  isPlayingAll: false,
  playingSegmentId: null,
  playbackTime: 0,
  warning: null,
  shortSegmentWarning: null,
  scriptText: loadScript(),
  teleprompterEditing: !loadScript().trim(),
  teleprompterAutoplay: false,
  projectName: '',
  projectDirty: false,
  projectSavedAt: null,
  projectSaving: false,

  setSessionFolder: (folder) => set({ sessionFolder: folder }),

  setProjectName: (projectName) => set({ projectName, projectDirty: true }),

  setScriptText: (scriptText) => {
    try {
      localStorage.setItem(SCRIPT_KEY, scriptText)
    } catch {
      /* ignore quota */
    }
    set({ scriptText, projectDirty: true })
  },

  setTeleprompterEditing: (teleprompterEditing) =>
    set({ teleprompterEditing, projectDirty: true }),

  setTeleprompterAutoplay: (teleprompterAutoplay) => set({ teleprompterAutoplay }),

  setMicError: (micError) => set({ micError }),

  setWarning: (warning) => set({ warning }),

  clearWarning: () => set({ warning: null, shortSegmentWarning: null }),

  setProjectSaving: (projectSaving) => set({ projectSaving }),

  markProjectSaved: (savedAt) =>
    set({ projectDirty: false, projectSavedAt: savedAt || Date.now(), projectSaving: false }),

  markProjectDirty: () => set({ projectDirty: true }),

  getProjectSnapshot: () => {
    const s = get()
    return {
      version: 1,
      projectName: s.projectName || '',
      activeSegmentId: s.activeSegmentId,
      scriptText: s.scriptText,
      teleprompterEditing: s.teleprompterEditing,
      finalOutputPath: s.finalOutputPath,
      pipelineStatuses: s.pipelineStatuses,
      segments: s.segments.map((seg) => ({
        id: seg.id,
        label: seg.label,
        status: seg.status === 'recording' ? 'pending' : seg.status,
        filePath: seg.filePath,
        duration: seg.duration,
        waveformData: seg.waveformData || [],
      })),
    }
  },

  hydrateProject: (project, folder) => {
    if (!project) {
      set({
        sessionFolder: folder || get().sessionFolder,
        projectName: '',
        segments: [],
        activeSegmentId: null,
        scriptText: '',
        teleprompterEditing: true,
        finalOutputPath: null,
        pipelineStatuses: { ...DEFAULT_PIPELINE },
        processingStep: null,
        isProcessing: false,
        isRecording: false,
        teleprompterAutoplay: false,
        projectDirty: false,
        projectSavedAt: null,
      })
      try {
        localStorage.setItem(SCRIPT_KEY, '')
      } catch {
        /* ignore */
      }
      return
    }

    try {
      localStorage.setItem(SCRIPT_KEY, project.scriptText || '')
    } catch {
      /* ignore */
    }

    set({
      sessionFolder: folder || get().sessionFolder,
      projectName: project.projectName || '',
      segments: project.segments || [],
      activeSegmentId: project.activeSegmentId,
      scriptText: project.scriptText || '',
      teleprompterEditing: Boolean(project.teleprompterEditing),
      finalOutputPath: project.finalOutputPath || null,
      pipelineStatuses: project.pipelineStatuses || { ...DEFAULT_PIPELINE },
      processingStep: null,
      isProcessing: false,
      isRecording: false,
      recordingElapsed: 0,
      liveWaveform: [],
      teleprompterAutoplay: false,
      playingSegmentId: null,
      playbackTime: 0,
      projectDirty: false,
      projectSavedAt: project.savedAt || Date.now(),
      shortSegmentWarning: null,
    })
  },

  addSegment: () => {
    const { segments } = get()
    const id = nextId(segments)
    const segment = {
      id,
      label: `Record ${id}`,
      status: 'pending',
      filePath: null,
      duration: 0,
      waveformData: [],
    }
    set({
      segments: [...segments, segment],
      activeSegmentId: id,
      projectDirty: true,
    })
    return id
  },

  selectSegment: (id) => {
    if (get().isRecording) return
    set({ activeSegmentId: id, projectDirty: true })
  },

  setRecording: (isRecording) => set({ isRecording }),

  setRecordingElapsed: (recordingElapsed) => set({ recordingElapsed }),

  setLiveWaveform: (liveWaveform) => set({ liveWaveform }),

  markRecording: (id) => {
    set({
      segments: get().segments.map((s) =>
        s.id === id ? { ...s, status: 'recording' } : s
      ),
      isRecording: true,
      activeSegmentId: id,
      projectDirty: true,
    })
  },

  completeSegment: (id, { filePath, duration, waveformData }) => {
    set({
      segments: get().segments.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'done',
              filePath,
              duration,
              waveformData: waveformData || [],
            }
          : s
      ),
      isRecording: false,
      recordingElapsed: 0,
      liveWaveform: [],
      projectDirty: true,
      shortSegmentWarning:
        duration < 2
          ? 'Segment too short — did you forget to record?'
          : null,
    })
  },

  updateSegmentAudio: (id, { filePath, duration, waveformData }) => {
    set({
      segments: get().segments.map((s) =>
        s.id === id
          ? {
              ...s,
              filePath: filePath ?? s.filePath,
              duration,
              waveformData: waveformData || [],
              status: 'done',
            }
          : s
      ),
      projectDirty: true,
    })
  },

  resetSegment: (id) => {
    set({
      segments: get().segments.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'pending',
              filePath: null,
              duration: 0,
              waveformData: [],
            }
          : s
      ),
      shortSegmentWarning: null,
      projectDirty: true,
    })
  },

  removeSegment: (id) => {
    const { segments, activeSegmentId } = get()
    const next = segments.filter((s) => s.id !== id)
    const nextActive =
      activeSegmentId === id
        ? next[0]?.id ?? null
        : activeSegmentId
    set({
      segments: next,
      activeSegmentId: nextActive,
      shortSegmentWarning: null,
      projectDirty: true,
    })
  },

  setPlayingSegmentId: (playingSegmentId) => set({ playingSegmentId }),

  setPlaybackTime: (playbackTime) => set({ playbackTime }),

  setIsPlayingAll: (isPlayingAll) => set({ isPlayingAll }),

  setProcessingStep: (step) => {
    const order = ['noise', 'voice', 'trim', 'stitch']
    const statuses = { ...DEFAULT_PIPELINE }

    if (step === null) {
      set({ processingStep: null, pipelineStatuses: statuses, isProcessing: false })
      return
    }

    const idx = order.indexOf(step)
    order.forEach((key, i) => {
      if (i < idx) statuses[key] = 'done'
      else if (i === idx) statuses[key] = 'processing'
      else statuses[key] = 'pending'
    })

    set({
      processingStep: step,
      pipelineStatuses: statuses,
      isProcessing: true,
      projectDirty: true,
    })
  },

  markPipelineDone: (finalOutputPath) => {
    set({
      processingStep: null,
      isProcessing: false,
      finalOutputPath,
      pipelineStatuses: {
        noise: 'done',
        voice: 'done',
        trim: 'done',
        stitch: 'done',
      },
      projectDirty: true,
    })
  },

  markPipelineError: () => {
    set({
      processingStep: null,
      isProcessing: false,
      projectDirty: true,
    })
  },

  getDoneSegments: () => get().segments.filter((s) => s.status === 'done' && s.filePath),

  getActiveSegment: () => {
    const { segments, activeSegmentId } = get()
    return segments.find((s) => s.id === activeSegmentId) || null
  },
}))
