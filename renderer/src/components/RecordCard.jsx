import React from 'react'
import Waveform from './Waveform'
import { formatDuration } from '../utils/audio'

const STATUS_LABEL = {
  pending: 'Pending',
  recording: 'Recording…',
  done: 'Done',
}

export default function RecordCard({
  segment,
  active,
  playing,
  onSelect,
  onPlay,
  onRetake,
}) {
  return (
    <article
      className={`record-card ${active ? 'is-active' : ''} status-${segment.status}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="record-card-top">
        <span className="record-card-label">{segment.label.toUpperCase()}</span>
        <span className={`badge badge-${segment.status}`}>
          {STATUS_LABEL[segment.status]}
        </span>
      </div>

      <Waveform
        data={segment.waveformData}
        compact
        live={segment.status === 'recording'}
      />

      <div className="record-card-meta">
        <span className="duration">
          {segment.status === 'done' ? formatDuration(segment.duration) : '—:—'}
        </span>
        <div className="record-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn-ghost"
            disabled={segment.status !== 'done'}
            onClick={onPlay}
            title="Play segment"
          >
            {playing ? '■' : '▶'} Play
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={segment.status === 'recording'}
            onClick={onRetake}
            title="Retake segment"
          >
            ↺ Retake
          </button>
        </div>
      </div>
    </article>
  )
}
