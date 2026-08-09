import { useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { encodeWav, buildWaveform } from '../utils/audio'

/**
 * Microphone capture via Web Audio API.
 * Collects PCM samples, streams live levels, encodes WAV on stop.
 */
export function useRecorder() {
  const mediaStreamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const processorRef = useRef(null)
  const sourceRef = useRef(null)
  const samplesRef = useRef([])
  const timerRef = useRef(null)
  const startedAtRef = useRef(0)
  const levelBufRef = useRef([])

  const startRecording = useCallback(async (segmentId) => {
    const store = useStore.getState()
    if (store.isRecording) return { ok: false, error: 'Already recording' }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      })

      mediaStreamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source

      // ScriptProcessor is deprecated but widely supported; fine for v1 desktop
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      samplesRef.current = []
      levelBufRef.current = []

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        samplesRef.current.push(new Float32Array(input))

        // RMS for live waveform
        let sum = 0
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
        const rms = Math.sqrt(sum / input.length)
        const level = Math.min(1, rms * 4.5)

        levelBufRef.current.push(level)
        if (levelBufRef.current.length > 64) levelBufRef.current.shift()
        useStore.getState().setLiveWaveform([...levelBufRef.current])
      }

      // Keep the processor graph alive without monitoring playback
      const silent = ctx.createGain()
      silent.gain.value = 0
      source.connect(processor)
      processor.connect(silent)
      silent.connect(ctx.destination)

      startedAtRef.current = Date.now()
      store.markRecording(segmentId)
      store.setMicError(null)

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startedAtRef.current) / 1000
        useStore.getState().setRecordingElapsed(elapsed)
      }, 200)

      return { ok: true }
    } catch (err) {
      const message =
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow mic access and try again.'
          : `Microphone error: ${err.message}`
      useStore.getState().setMicError(message)
      return { ok: false, error: message }
    }
  }, [])

  const stopRecording = useCallback(async (segmentId) => {
    const store = useStore.getState()

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      processorRef.current?.disconnect()
      sourceRef.current?.disconnect()
    } catch {
      /* ignore */
    }

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null

    const ctx = audioCtxRef.current
    const sampleRate = ctx?.sampleRate || 44100
    if (ctx) {
      try {
        await ctx.close()
      } catch {
        /* ignore */
      }
    }
    audioCtxRef.current = null
    processorRef.current = null
    sourceRef.current = null

    // Flatten samples
    const chunks = samplesRef.current
    samplesRef.current = []
    const totalLength = chunks.reduce((n, c) => n + c.length, 0)
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    const duration = totalLength / sampleRate
    const waveformData = buildWaveform(merged, 48)
    const wavBuffer = encodeWav(merged, sampleRate)

    if (!window.electronAPI) {
      // Dev fallback without Electron
      store.completeSegment(segmentId, {
        filePath: `local://segment_${segmentId}.wav`,
        duration,
        waveformData,
      })
      return { ok: true, duration }
    }

    const result = await window.electronAPI.saveSegment({
      segmentId,
      buffer: wavBuffer,
      waveformData,
      duration,
    })

    store.completeSegment(segmentId, {
      filePath: result.filePath,
      duration,
      waveformData,
    })

    return { ok: true, duration, filePath: result.filePath }
  }, [])

  return { startRecording, stopRecording }
}
