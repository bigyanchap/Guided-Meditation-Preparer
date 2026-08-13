import React from 'react'
import { useStore } from '../store/useStore'
import Waveform from './Waveform'
import { formatDuration } from '../utils/audio'

function MicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

export default function CenterPanel({ onToggleRecord }) {
  const active = useStore((s) => s.getActiveSegment())
  const isRecording = useStore((s) => s.isRecording)
  const recordingElapsed = useStore((s) => s.recordingElapsed)
  const liveWaveform = useStore((s) => s.liveWaveform)
  const micError = useStore((s) => s.micError)
  const shortSegmentWarning = useStore((s) => s.shortSegmentWarning)

  if (!active) {
    return (
      <main className="panel panel-center glass">
        <div className="studio-empty">
          <img className="studio-logo" src="/icon.png" alt="" width="88" height="88" />
          <p className="studio-brand">Guided Meditation Preparer</p>
          <h2>Ready when you are</h2>
          <p>
            Add a recording segment on the left, then press the mic to capture
            one portion of your script.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="panel panel-center glass">
      <div className="studio">
        <p className="studio-eyebrow">Recording Segment {active.id}</p>
        <h2 className="studio-title">{active.label}</h2>

        {micError && <div className="alert alert-error">{micError}</div>}
        {shortSegmentWarning && active.status === 'done' && (
          <div className="alert alert-warn">{shortSegmentWarning}</div>
        )}

        <button
          type="button"
          className={`record-btn ${isRecording ? 'is-recording' : ''}`}
          onClick={onToggleRecord}
          aria-pressed={isRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span className="record-btn-ring" />
          <span className="record-btn-core">
            {isRecording ? <StopIcon /> : <MicIcon />}
          </span>
        </button>

        <p className="record-label">{isRecording ? 'Stop' : 'Record'}</p>
        <p className="record-timer">
          {isRecording
            ? formatDuration(recordingElapsed)
            : active.status === 'done'
              ? formatDuration(active.duration)
              : '0:00'}
        </p>

        <div className="studio-wave">
          <Waveform
            data={isRecording ? liveWaveform : active.waveformData}
            live={isRecording}
          />
        </div>

        <p className="studio-hint">
          {isRecording
            ? 'Press to stop this segment. Each segment is one portion of your script.'
            : active.status === 'done'
              ? 'Segment saved. Retake anytime, or add the next portion.'
              : 'Press to record this segment. Speak clearly into your microphone.'}
        </p>
      </div>
    </main>
  )
}
