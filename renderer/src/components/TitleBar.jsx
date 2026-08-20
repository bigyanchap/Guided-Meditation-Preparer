import React from 'react'

export default function TitleBar({ onClose } = {}) {
  const api = window.electronAPI
  const isMac = api?.platform === 'darwin'

  const handleClose = async () => {
    if (onClose) await onClose()
    else await api?.close()
  }

  return (
    <header className={`titlebar${isMac ? ' is-mac' : ' is-win'}`}>
      {isMac && <div className="titlebar-traffic-safe" aria-hidden />}
      <div className="titlebar-drag">
        <img className="titlebar-logo" src="./icon.png" alt="" width="22" height="22" />
        <h1 className="titlebar-title">Guided Meditation Preparer</h1>
      </div>
      {!isMac && (
        <div className="titlebar-controls">
          <button
            type="button"
            className="win-btn"
            aria-label="Minimize"
            onClick={() => api?.minimize()}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            type="button"
            className="win-btn"
            aria-label="Maximize"
            onClick={() => api?.maximize()}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            type="button"
            className="win-btn win-btn-close"
            aria-label="Close"
            onClick={handleClose}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      )}
    </header>
  )
}
