import { useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'

/**
 * Play a single segment or all done segments in sequence.
 */
export function usePlayback() {
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)
  const queueRef = useRef([])
  const rafRef = useRef(0)

  const stopTimeLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }

  const startTimeLoop = () => {
    stopTimeLoop()
    const tick = () => {
      const audio = audioRef.current
      if (!audio) return
      useStore.getState().setPlaybackTime(audio.currentTime || 0)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const revoke = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }

  const stop = useCallback(() => {
    stopTimeLoop()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    revoke()
    queueRef.current = []
    useStore.getState().setPlayingSegmentId(null)
    useStore.getState().setIsPlayingAll(false)
    useStore.getState().setPlaybackTime(0)
  }, [])

  const playBuffer = useCallback(async (arrayBuffer, mime = 'audio/wav', startAt = 0) => {
    revoke()
    stopTimeLoop()
    const blob = new Blob([arrayBuffer], { type: mime })
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url

    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audioRef.current = audio

      const finish = () => {
        stopTimeLoop()
        if (audioRef.current === audio) {
          useStore.getState().setPlaybackTime(audio.duration || audio.currentTime || 0)
        }
        resolve()
      }

      audio.onended = finish
      audio.onerror = () => {
        stopTimeLoop()
        reject(new Error('Playback failed'))
      }

      const seek = Math.max(0, Number(startAt) || 0)
      const startPlayback = () => {
        if (seek > 0) {
          const max = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.05) : seek
          audio.currentTime = Math.min(seek, max)
        }
        useStore.getState().setPlaybackTime(audio.currentTime || seek)
        startTimeLoop()
        audio.play().catch((err) => {
          stopTimeLoop()
          reject(err)
        })
      }

      if (audio.readyState >= 1) startPlayback()
      else audio.onloadedmetadata = startPlayback
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
    async (segment, startAt = 0) => {
      stop()
      if (!segment?.filePath) return

      useStore.getState().setPlayingSegmentId(segment.id)
      useStore.getState().setPlaybackTime(startAt || 0)
      try {
        const buffer = await loadFile(segment.filePath)
        await playBuffer(buffer, 'audio/wav', startAt)
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
        useStore.getState().setPlaybackTime(0)
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
      useStore.getState().setPlaybackTime(0)
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
