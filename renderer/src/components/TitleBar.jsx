import React from 'react'

export default function TitleBar() {
  const api = window.electronAPI

  return (
    <header className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-mark" aria-hidden />
        <h1 className="titlebar-title">Guided Meditation Preparer</h1>
      </div>
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
          onClick={() => api?.close()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </header>
  )
}
