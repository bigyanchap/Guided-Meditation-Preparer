import React, { useCallback, useEffect, useRef, useState } from 'react'
import Waveform from './Waveform'
import { formatDuration } from '../utils/audio'
import { useStore } from '../store/useStore'

const STATUS_LABEL = {
  pending: 'Pending',
  recording: 'Recording…',
  done: 'Done',
}

function buildTicks(duration) {
  if (!duration || duration <= 0) return []
  const step = duration > 60 ? 10 : duration > 20 ? 5 : duration > 8 ? 2 : 1
  const ticks = []
  for (let t = 0; t <= duration + 0.0001; t += step) {
    ticks.push(Number(t.toFixed(2)))
  }
  if (ticks[ticks.length - 1] < duration - 0.05) ticks.push(duration)
  return ticks
}

export default function RecordCard({
  segment,
  active,
  playing,
  onSelect,
  onPlay,
  onRetake,
  onTrimRemaining,
}) {
  const playbackTime = useStore((s) => s.playbackTime)
  const [playhead, setPlayhead] = useState(0)
  const [trimming, setTrimming] = useState(false)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef(null)

  useEffect(() => {
    setPlayhead(0)
  }, [segment.id])

  useEffect(() => {
    setPlayhead((t) => {
      const max = segment.duration || 0
      if (max <= 0) return 0
      // Keep playhead on the clip after a trim so further cuts stay easy
      return Math.min(t, max)
    })
  }, [segment.duration])

  useEffect(() => {
    if (playing && !dragging) {
      setPlayhead(playbackTime)
    }
  }, [playing, playbackTime, dragging])

  const duration = segment.duration || 0
  const clampedPlayhead = Math.min(Math.max(0, playhead), duration)
  const ratio = duration > 0 ? clampedPlayhead / duration : 0
  const ticks = buildTicks(duration)

  const timeFromClientX = useCallback(
    (clientX) => {
      const el = trackRef.current
      if (!el || duration <= 0) return 0
      const rect = el.getBoundingClientRect()
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width)
      return (x / rect.width) * duration
    },
    [duration]
  )

  const onPointerDown = (e) => {
    if (segment.status !== 'done' || trimming) return
    e.preventDefault()
    e.stopPropagation()
    const t = timeFromClientX(e.clientX)
    setPlayhead(t)
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    e.preventDefault()
    setPlayhead(timeFromClientX(e.clientX))
  }

  const onPointerUp = (e) => {
    if (!dragging) return
    e.preventDefault()
    setPlayhead(timeFromClientX(e.clientX))
    setDragging(false)
  }

  const canTrim =
    segment.status === 'done' &&
    duration > 0.15 &&
    clampedPlayhead >= 0.05 &&
    clampedPlayhead < duration - 0.05

  const handleTrim = async () => {
    if (!canTrim || trimming) return
    setTrimming(true)
    const cutAt = clampedPlayhead
    try {
      await onTrimRemaining?.(segment, cutAt)
      // Sit at the new end so the user can scrub left and trim again
      setPlayhead(cutAt)
    } finally {
      setTrimming(false)
    }
  }

  const handlePlay = () => {
    if (playing) {
      onPlay(clampedPlayhead)
      return
    }
    // At the end (or near it): restart from the beginning
    const atEnd = duration > 0 && clampedPlayhead >= duration - 0.08
    const startAt = atEnd ? 0 : clampedPlayhead
    if (atEnd) setPlayhead(0)
    onPlay(startAt)
  }

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

      {segment.status === 'done' && duration > 0 ? (
        <div
          className={`clip-timeline${playing ? ' is-playing' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={trackRef}
            className="clip-scrub"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="clip-ruler" aria-hidden>
              {ticks.map((t) => (
                <span
                  key={t}
                  className="clip-tick"
                  style={{ left: `${(t / duration) * 100}%` }}
                >
                  <i />
                  <em>{formatDuration(t)}</em>
                </span>
              ))}
            </div>

            <div
              className="clip-playhead"
              style={{ left: `${ratio * 100}%` }}
              aria-hidden
            >
              <span className="clip-playhead-cap" />
              <span className="clip-playhead-blade" />
            </div>
          </div>

          <div className="clip-track">
            <Waveform data={segment.waveformData} compact />
            <div
              className="split-discard-overlay"
              style={{ left: `${ratio * 100}%` }}
              aria-hidden
            />
            <div
              className="clip-playhead-trackline"
              style={{ left: `${ratio * 100}%` }}
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <div className="record-card-wave-wrap">
          <Waveform
            data={segment.waveformData}
            compact
            live={segment.status === 'recording'}
          />
        </div>
      )}

      <div className="record-card-meta">
        <span className="duration">
          {segment.status === 'done'
            ? `${formatDuration(clampedPlayhead)} / ${formatDuration(duration)}`
            : '—:—'}
        </span>
        <div className="record-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn-ghost"
            disabled={segment.status !== 'done'}
            onClick={handlePlay}
            title={playing ? 'Stop segment' : 'Play from playhead'}
          >
            {playing ? '■ Stop' : '▶ Play'}
          </button>
          <button
            type="button"
            className="btn-ghost split-delete"
            disabled={!canTrim || trimming}
            onClick={handleTrim}
            title="Delete audio after the playhead"
          >
            {trimming ? 'Trimming…' : 'Delete remaining'}
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
