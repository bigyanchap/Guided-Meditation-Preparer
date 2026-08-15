import React from 'react'
import { useStore } from '../store/useStore'
import RecordCard from './RecordCard'

export default function LeftPanel({ onPlaySegment, onRetake, onTrimRemaining }) {
  const segments = useStore((s) => s.segments)
  const activeSegmentId = useStore((s) => s.activeSegmentId)
  const playingSegmentId = useStore((s) => s.playingSegmentId)
  const isRecording = useStore((s) => s.isRecording)
  const addSegment = useStore((s) => s.addSegment)
  const selectSegment = useStore((s) => s.selectSegment)

  return (
    <aside className="panel panel-left glass">
      <div className="panel-header">
        <h2>Segments</h2>
        <p className="panel-sub">Build your script piece by piece</p>
      </div>

      <div className="segment-list">
        {segments.length === 0 ? (
          <div className="empty-state">
            <p>No segments yet.</p>
            <p className="empty-hint">Add your first recording below.</p>
          </div>
        ) : (
          segments.map((seg) => (
            <RecordCard
              key={seg.id}
              segment={seg}
              active={seg.id === activeSegmentId}
              playing={seg.id === playingSegmentId}
              onSelect={() => selectSegment(seg.id)}
              onPlay={(startAt) => onPlaySegment(seg, startAt)}
              onRetake={() => onRetake(seg)}
              onTrimRemaining={onTrimRemaining}
            />
          ))
        )}
      </div>

      <button
        type="button"
        className="btn-add"
        disabled={isRecording}
        onClick={() => addSegment()}
      >
        + New Recording Segment
      </button>
    </aside>
  )
}
