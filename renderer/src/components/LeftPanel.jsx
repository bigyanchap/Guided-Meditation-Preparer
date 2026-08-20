import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import RecordCard from './RecordCard'
import SaveProjectModal from './SaveProjectModal'

export default function LeftPanel({
  onPlaySegment,
  onRetake,
  onDeleteSegment,
  onTrimRemaining,
  onOpenProject,
}) {
  const segments = useStore((s) => s.segments)
  const activeSegmentId = useStore((s) => s.activeSegmentId)
  const playingSegmentId = useStore((s) => s.playingSegmentId)
  const isRecording = useStore((s) => s.isRecording)
  const addSegment = useStore((s) => s.addSegment)
  const selectSegment = useStore((s) => s.selectSegment)
  const projectSaving = useStore((s) => s.projectSaving)
  const projectName = useStore((s) => s.projectName)
  const [saveOpen, setSaveOpen] = useState(false)

  return (
    <aside className="panel panel-left glass">
      <div className="panel-header">
        <div className="project-bar project-bar-top">
          <div className="project-actions">
            <button
              type="button"
              className="btn-ghost project-btn"
              disabled={isRecording || projectSaving}
              onClick={() => setSaveOpen(true)}
            >
              Save Project
            </button>
            <button
              type="button"
              className="btn-ghost project-btn"
              disabled={isRecording || projectSaving}
              onClick={onOpenProject}
            >
              Open Project
            </button>
          </div>
          <p className="project-saved-to" title={projectName || undefined}>
            {projectName ? `Saved to ${projectName}` : 'Not saved as a named project yet'}
          </p>
        </div>

        <h2>Segments</h2>
        <p className="panel-sub">Build your script piece by piece</p>
      </div>

      <div className="segment-list">
        {segments.length === 0 ? (
          <div className="empty-state">
            <p>No segments yet.</p>
            <p className="empty-hint">Add your first recording below. Progress auto-saves.</p>
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
              onDelete={() => onDeleteSegment(seg)}
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

      <SaveProjectModal open={saveOpen} onClose={() => setSaveOpen(false)} />
    </aside>
  )
}
