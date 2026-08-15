import React from 'react'
import { useStore } from '../store/useStore'
import Teleprompter from './Teleprompter'
import { formatDuration } from '../utils/audio'

export default function CenterPanel({ onToggleRecord }) {
  const isRecording = useStore((s) => s.isRecording)
  const active = useStore((s) => s.getActiveSegment())
  const recordingElapsed = useStore((s) => s.recordingElapsed)
  const micError = useStore((s) => s.micError)

  return (
    <main className="panel panel-center glass">
      <div className="center-top">
        <div className="center-heading">
          <h2>Teleprompter</h2>
          <p>Read and record your script</p>
        </div>
        {isRecording && active && (
          <div className="teleprompter-rec-pill" aria-live="polite">
            <span className="teleprompter-rec-dot" />
            Recording · {formatDuration(recordingElapsed)}
          </div>
        )}
      </div>

      {micError && <div className="alert alert-error center-alert">{micError}</div>}

      <Teleprompter />

      <div className="teleprompter-dock">
        <button
          type="button"
          className={`dock-record ${isRecording ? 'is-recording' : ''}`}
          onClick={onToggleRecord}
          aria-pressed={isRecording}
        >
          {isRecording
            ? 'Stop recording'
            : active
              ? `Record ${active.label}`
              : 'Add segment & record'}
        </button>
      </div>
    </main>
  )
}
