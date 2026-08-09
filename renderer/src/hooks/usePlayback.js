import { useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'

/**
 * Play a single segment or all done segments in sequence.
 */
export function usePlayback() {
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)
  const queueRef = useRef([])

  const revoke = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    revoke()
    queueRef.current = []
    useStore.getState().setPlayingSegmentId(null)
    useStore.getState().setIsPlayingAll(false)
  }, [])

  const playBuffer = useCallback(async (arrayBuffer, mime = 'audio/wav') => {
    revoke()
    const blob = new Blob([arrayBuffer], { type: mime })
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url

    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('Playback failed'))
      audio.play().catch(reject)
    })
  }, [])

  const loadFile = useCallback(async (filePath) => {
    if (!window.electronAPI) {
      throw new Error('Playback requires Electron')
    }
    if (filePath.startsWith('local://')) {
      throw new Error('No audio data available in browser preview')
    }
    return window.electronAPI.readAudioFile(filePath)
  }, [])

  const playSegment = useCallback(
    async (segment) => {
      stop()
      if (!segment?.filePath) return

      useStore.getState().setPlayingSegmentId(segment.id)
      try {
        const buffer = await loadFile(segment.filePath)
        await playBuffer(buffer)
      } catch (err) {
        useStore.getState().setWarning(err.message)
      } finally {
        useStore.getState().setPlayingSegmentId(null)
      }
    },
    [loadFile, playBuffer, stop]
  )

  const playAll = useCallback(async () => {
    stop()
    const done = useStore.getState().getDoneSegments()
    if (!done.length) return

    useStore.getState().setIsPlayingAll(true)
    queueRef.current = [...done]

    try {
      for (const segment of queueRef.current) {
        if (!useStore.getState().isPlayingAll) break
        useStore.getState().setPlayingSegmentId(segment.id)
        const buffer = await loadFile(segment.filePath)
        await playBuffer(buffer)
      }
    } catch (err) {
      useStore.getState().setWarning(err.message)
    } finally {
      useStore.getState().setPlayingSegmentId(null)
      useStore.getState().setIsPlayingAll(false)
    }
  }, [loadFile, playBuffer, stop])

  const playFinal = useCallback(
    async (filePath) => {
      stop()
      if (!filePath) return
      useStore.getState().setIsPlayingAll(true)
      try {
        const buffer = await loadFile(filePath)
        const isMp3 = filePath.toLowerCase().endsWith('.mp3')
        await playBuffer(buffer, isMp3 ? 'audio/mpeg' : 'audio/wav')
      } catch (err) {
        useStore.getState().setWarning(err.message)
      } finally {
        useStore.getState().setIsPlayingAll(false)
      }
    },
    [loadFile, playBuffer, stop]
  )

  return { playSegment, playAll, playFinal, stop }
}
