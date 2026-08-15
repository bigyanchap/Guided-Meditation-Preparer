import { create } from 'zustand'

const nextId = (segments) =>
  segments.length === 0 ? 1 : Math.max(...segments.map((s) => s.id)) + 1

const SCRIPT_KEY = 'meditation-script'

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
  pipelineStatuses: {
    noise: 'pending',
    voice: 'pending',
    trim: 'pending',
    stitch: 'pending',
  },
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

  setSessionFolder: (folder) => set({ sessionFolder: folder }),

  setScriptText: (scriptText) => {
    try {
      localStorage.setItem(SCRIPT_KEY, scriptText)
    } catch {
      /* ignore quota */
    }
    set({ scriptText })
  },

  setTeleprompterEditing: (teleprompterEditing) => set({ teleprompterEditing }),

  setTeleprompterAutoplay: (teleprompterAutoplay) => set({ teleprompterAutoplay }),

  setMicError: (micError) => set({ micError }),

  setWarning: (warning) => set({ warning }),

  clearWarning: () => set({ warning: null, shortSegmentWarning: null }),

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
    })
    return id
  },

  selectSegment: (id) => {
    if (get().isRecording) return
    set({ activeSegmentId: id })
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
    })
  },

  setPlayingSegmentId: (playingSegmentId) => set({ playingSegmentId }),

  setPlaybackTime: (playbackTime) => set({ playbackTime }),

  setIsPlayingAll: (isPlayingAll) => set({ isPlayingAll }),

  setProcessingStep: (step) => {
    const order = ['noise', 'voice', 'trim', 'stitch']
    const statuses = { noise: 'pending', voice: 'pending', trim: 'pending', stitch: 'pending' }

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
    })
  },

  markPipelineError: () => {
    set({
      processingStep: null,
      isProcessing: false,
    })
  },

  getDoneSegments: () => get().segments.filter((s) => s.status === 'done' && s.filePath),

  getActiveSegment: () => {
    const { segments, activeSegmentId } = get()
    return segments.find((s) => s.id === activeSegmentId) || null
  },
}))
