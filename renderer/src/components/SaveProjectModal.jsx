import React, { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

export default function SaveProjectModal({ open, onClose, onSaved }) {
  const projectName = useStore((s) => s.projectName)
  const sessionFolder = useStore((s) => s.sessionFolder)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setBusy(false)
    setName(projectName || '')
    async function loadDefault() {
      if (!window.electronAPI?.getDefaultSaveDir) {
        setLocation(sessionFolder ? sessionFolder.replace(/[/\\][^/\\]+$/, '') : '')
        return
      }
      const res = await window.electronAPI.getDefaultSaveDir()
      const parent =
        sessionFolder && projectName
          ? sessionFolder.replace(/[/\\][^/\\]+$/, '')
          : res?.path || ''
      setLocation(parent)
    }
    loadDefault()
  }, [open, projectName, sessionFolder])

  if (!open) return null

  const browse = async () => {
    const res = await window.electronAPI?.pickDirectory?.({
      title: 'Choose project location',
      defaultPath: location || undefined,
    })
    if (res?.ok && res.path) setLocation(res.path)
  }

  const submit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a project name.')
      return
    }
    if (!location.trim()) {
      setError('Choose a save location.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const snapshot = useStore.getState().getProjectSnapshot()
      snapshot.projectName = trimmed
      const result = await window.electronAPI.saveProjectAs({
        parentDir: location.trim(),
        projectName: trimmed,
        state: snapshot,
      })
      if (!result?.ok) {
        setError(result?.error || 'Could not save project')
        setBusy(false)
        return
      }
      useStore.getState().hydrateProject(result.project, result.folder)
      useStore.getState().markProjectSaved(result.savedAt)
      onSaved?.(result)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Could not save project')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-project-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="save-project-title">Save Project</h3>
        <p className="modal-sub">Choose a name and folder for this meditation project.</p>

        <form className="modal-form" onSubmit={submit}>
          <label className="modal-field">
            <span>Project name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning Calm"
              autoFocus
              disabled={busy}
            />
          </label>

          <label className="modal-field">
            <span>Location</span>
            <div className="modal-location-row">
              <input type="text" value={location} readOnly placeholder="Choose a folder…" />
              <button type="button" className="btn-ghost modal-browse" onClick={browse} disabled={busy}>
                Browse…
              </button>
            </div>
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-solid" disabled={busy}>
              {busy ? 'Saving…' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
