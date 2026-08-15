import React from 'react'

export default function Waveform({ data = [], live = false, compact = false }) {
  const bars = data.length
    ? data
    : Array(compact ? 32 : 48).fill(0.12)

  return (
    <div
      className={`waveform ${live ? 'waveform-live' : ''} ${compact ? 'waveform-compact' : ''}`}
      aria-hidden
    >
      {bars.map((v, i) => {
        const level = Math.max(0, Math.min(1, v))
        const spoken = level >= 0.28
        return (
          <span
            key={i}
            className={`waveform-bar${spoken ? ' is-spoken' : ' is-quiet'}`}
            style={{
              height: `${Math.max(compact ? 12 : 10, level * 100)}%`,
              opacity: 0.28 + level * 0.72,
              animationDelay: live ? `${(i % 8) * 0.05}s` : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
