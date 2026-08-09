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
      {bars.map((v, i) => (
        <span
          key={i}
          className="waveform-bar"
          style={{
            height: `${Math.max(8, v * 100)}%`,
            animationDelay: live ? `${(i % 8) * 0.05}s` : undefined,
          }}
        />
      ))}
    </div>
  )
}
