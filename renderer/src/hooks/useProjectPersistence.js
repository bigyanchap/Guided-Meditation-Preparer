import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

/**
 * Auto-save project state to the session folder and restore on launch.
 */
export function useProjectPersistence() {
  const timerRef = useRef(null)
  const savingRef = useRef(false)

  const saveProjectNow = useCallback(async ({ force = false } = {}) => {
    if (!window.electronAPI?.saveProject) return { ok: false, error: 'Unavailable' }
    const store = useStore.getState()
    if (!force && !store.projectDirty) return { ok: true, skipped: true }
    if (savingRef.current) return { ok: true, skipped: true }

    savingRef.current = true
    store.setProjectSaving(true)
    try {
      const snapshot = store.getProjectSnapshot()
      const result = await window.electronAPI.saveProject(snapshot)
      if (result?.ok) {
        useStore.getState().markProjectSaved(result.savedAt)
      } else {
        useStore.getState().setProjectSaving(false)
        useStore.getState().setWarning(result?.error || 'Could not save project')
      }
      return result
    } catch (err) {
      useStore.getState().setProjectSaving(false)
      useStore.getState().setWarning(err.message || 'Could not save project')
      return { ok: false, error: err.message }
    } finally {
      savingRef.current = false
    }
  }, [])

  const hydrateFromSession = useCallback(async (session) => {
    const store = useStore.getState()
    store.hydrateProject(session?.project || null, session?.folder)
    if (session?.folder) store.setSessionFolder(session.folder)
  }, [])

  // Restore last project on launch
  useEffect(() => {
    async function init() {
      if (!window.electronAPI?.getSession) return
      try {
        const session = await window.electronAPI.getSession()
        await hydrateFromSession(session)
      } catch (err) {
        useStore.getState().setWarning(`Could not restore project: ${err.message}`)
      }
    }
    init()
  }, [hydrateFromSession])

  // Debounced auto-save whenever project becomes dirty
  const projectDirty = useStore((s) => s.projectDirty)
  const segments = useStore((s) => s.segments)
  const scriptText = useStore((s) => s.scriptText)
  const activeSegmentId = useStore((s) => s.activeSegmentId)
  const finalOutputPath = useStore((s) => s.finalOutputPath)
  const pipelineStatuses = useStore((s) => s.pipelineStatuses)

  useEffect(() => {
    if (!projectDirty || !window.electronAPI?.saveProject) return undefined
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveProjectNow()
    }, 600)
    return () => clearTimeout(timerRef.current)
  }, [
    projectDirty,
    segments,
    scriptText,
    activeSegmentId,
    finalOutputPath,
    pipelineStatuses,
    saveProjectNow,
  ])

  // Flush save before window unload / quit (macOS traffic-light close included)
  useEffect(() => {
    const flush = () => {
      if (!window.electronAPI?.saveProject) return
      const snapshot = useStore.getState().getProjectSnapshot()
      window.electronAPI.saveProject(snapshot)
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  // Also save when Electron window is closing via native controls
  useEffect(() => {
    if (!window.electronAPI) return undefined
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveProjectNow({ force: true })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [saveProjectNow])

  const newProject = useCallback(async () => {
    if (!window.electronAPI?.newSession) return
    if (useStore.getState().isRecording) {
      useStore.getState().setWarning('Stop recording before starting a new project.')
      return
    }
    await saveProjectNow({ force: true })
    const session = await window.electronAPI.newSession()
    await hydrateFromSession(session)
    useStore.getState().setWarning('Started a new project.')
  }, [hydrateFromSession, saveProjectNow])

  const openProject = useCallback(async () => {
    if (!window.electronAPI?.openProject) return
    if (useStore.getState().isRecording) {
      useStore.getState().setWarning('Stop recording before opening another project.')
      return
    }
    await saveProjectNow({ force: true })
    const result = await window.electronAPI.openProject()
    if (result?.canceled) return
    if (!result?.ok) {
      useStore.getState().setWarning(result?.error || 'Could not open project')
      return
    }
    await hydrateFromSession(result)
    useStore.getState().setWarning('Project restored.')
  }, [hydrateFromSession, saveProjectNow])

  return {
    saveProjectNow,
    newProject,
    openProject,
  }
}
