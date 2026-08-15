import React, { useEffect, useCallback } from 'react'
import TitleBar from './components/TitleBar'
import LeftPanel from './components/LeftPanel'
import CenterPanel from './components/CenterPanel'
import RightPanel from './components/RightPanel'
import { useStore } from './store/useStore'
import { useRecorder } from './hooks/useRecorder'
import { usePlayback } from './hooks/usePlayback'
import './index.css'

export default function App() {
  const { startRecording, stopRecording } = useRecorder()
  const { playSegment, playAll, playFinal, stop } = usePlayback()

  const isRecording = useStore((s) => s.isRecording)
  const isPlayingAll = useStore((s) => s.isPlayingAll)
  const setSessionFolder = useStore((s) => s.setSessionFolder)
  const setProcessingStep = useStore((s) => s.setProcessingStep)
  const markPipelineDone = useStore((s) => s.markPipelineDone)
  const markPipelineError = useStore((s) => s.markPipelineError)
  const setWarning = useStore((s) => s.setWarning)
  const resetSegment = useStore((s) => s.resetSegment)
  const clearWarning = useStore((s) => s.clearWarning)

  useEffect(() => {
    async function init() {
      if (!window.electronAPI) return
      try {
        const session = await window.electronAPI.getSession()
        setSessionFolder(session.folder)
      } catch (err) {
        setWarning(`Session error: ${err.message}`)
      }
    }
    init()
  }, [setSessionFolder, setWarning])

  useEffect(() => {
    if (!window.electronAPI) return undefined

    const offProgress = window.electronAPI.onProcessingProgress(({ step }) => {
      setProcessingStep(step)
    })
    const offDone = window.electronAPI.onProcessingDone(({ path }) => {
      markPipelineDone(path)
    })
    const offError = window.electronAPI.onProcessingError(({ message }) => {
      markPipelineError()
      setWarning(message)
    })

    return () => {
      offProgress?.()
      offDone?.()
      offError?.()
    }
  }, [setProcessingStep, markPipelineDone, markPipelineError, setWarning])

  const handleToggleRecord = useCallback(async () => {
    clearWarning()
    let store = useStore.getState()
    let active = store.getActiveSegment()
    if (!active) {
      store.addSegment()
      store = useStore.getState()
      active = store.getActiveSegment()
    }
    if (!active) return

    if (store.isRecording) {
      store.setTeleprompterAutoplay(false)
      await stopRecording(active.id)
      return
    }

    // If retaking a done segment, clear file first
    if (active.status === 'done' && active.filePath && window.electronAPI) {
      await window.electronAPI.deleteSegment(active.filePath)
      resetSegment(active.id)
    }

    const result = await startRecording(active.id)
    const latest = useStore.getState()
    if (result?.ok && latest.scriptText.trim()) {
      latest.setTeleprompterEditing(false)
      latest.setTeleprompterAutoplay(true)
    }
  }, [startRecording, stopRecording, resetSegment, clearWarning])

  const handleRetake = useCallback(
    async (segment) => {
      if (isRecording) return
      clearWarning()
      stop()
      if (segment.filePath && window.electronAPI) {
        await window.electronAPI.deleteSegment(segment.filePath)
      }
      resetSegment(segment.id)
      useStore.getState().selectSegment(segment.id)
    },
    [isRecording, resetSegment, stop, clearWarning]
  )

  const handlePlaySegment = useCallback(
    (segment, startAt = 0) => {
      clearWarning()
      const playing = useStore.getState().playingSegmentId
      if (playing === segment.id) {
        stop()
        return
      }
      playSegment(segment, startAt)
    },
    [playSegment, stop, clearWarning]
  )

  const handleListenAll = useCallback(() => {
    clearWarning()
    if (isPlayingAll) {
      stop()
      return
    }
    playAll()
  }, [isPlayingAll, playAll, stop, clearWarning])

  const handleTrimRemaining = useCallback(
    async (segment, keepUntil) => {
      clearWarning()
      stop()
      if (!segment?.filePath || !window.electronAPI) {
        setWarning('Trimming requires the Electron app.')
        return
      }
      const latest =
        useStore.getState().segments.find((s) => s.id === segment.id) || segment
      const result = await window.electronAPI.trimKeepStart({
        filePath: latest.filePath,
        keepUntil,
      })
      if (!result.ok) {
        setWarning(result.error || 'Trim failed')
        return
      }
      useStore.getState().updateSegmentAudio(latest.id, {
        filePath: result.filePath,
        duration: result.duration,
        waveformData: result.waveformData,
      })
    },
    [clearWarning, stop, setWarning]
  )

  const handlePreviewStitched = useCallback(async () => {
    clearWarning()
    stop()

    const done = useStore.getState().getDoneSegments()
    const all = useStore.getState().segments
    const skipped = all.filter((s) => s.status !== 'done')

    if (!done.length) {
      setWarning('No completed segments to process.')
      return
    }

    if (skipped.length) {
      setWarning(
        `Skipping ${skipped.length} incomplete segment${skipped.length > 1 ? 's' : ''} (not Done).`
      )
    }

    if (!window.electronAPI) {
      setWarning('Processing requires the Electron app.')
      return
    }

    setProcessingStep('noise')
    const paths = done.map((s) => s.filePath)
    const result = await window.electronAPI.runProcessingPipeline(paths)

    if (!result.ok) {
      markPipelineError()
      setWarning(result.error || 'Processing failed')
      return
    }

    markPipelineDone(result.path)
    await playFinal(result.path)
  }, [
    clearWarning,
    stop,
    setWarning,
    setProcessingStep,
    markPipelineError,
    markPipelineDone,
    playFinal,
  ])

  const handleDownload = useCallback(async () => {
    clearWarning()
    const path = useStore.getState().finalOutputPath
    if (!path || !window.electronAPI) return
    const result = await window.electronAPI.saveFile(path)
    if (result.ok) {
      setWarning(`Saved to ${result.path}`)
    } else if (!result.canceled) {
      setWarning(result.error || 'Save failed')
    }
  }, [clearWarning, setWarning])

  const handleSaveToProject = useCallback(async () => {
    clearWarning()
    const path = useStore.getState().finalOutputPath
    if (!path || !window.electronAPI) return
    const result = await window.electronAPI.saveToProject(path)
    if (result.ok) {
      setWarning(`Saved to project: ${result.path}`)
    } else {
      setWarning(result.error || 'Save failed')
    }
  }, [clearWarning, setWarning])

  return (
    <div className="app-shell">
      <div className="app-bg" />
      <div className="app-veil" />
      <TitleBar />
      <div className="app-body">
        <LeftPanel
          onPlaySegment={handlePlaySegment}
          onRetake={handleRetake}
          onTrimRemaining={handleTrimRemaining}
        />
        <CenterPanel onToggleRecord={handleToggleRecord} />
        <RightPanel
          onListenAll={handleListenAll}
          onPreviewStitched={handlePreviewStitched}
          onDownload={handleDownload}
          onSaveToProject={handleSaveToProject}
        />
      </div>
    </div>
  )
}
