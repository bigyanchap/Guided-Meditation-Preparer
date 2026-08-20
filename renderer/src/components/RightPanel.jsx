import React from 'react'
import { useStore } from '../store/useStore'

const STEPS = [
  {
    key: 'noise',
    title: 'Remove Background Noise',
    desc: 'Light cleanup of fan hiss & room tone',
  },
  {
    key: 'voice',
    title: 'Deepen Voice',
    desc: 'Gentle low-end warmth (+2 dB)',
  },
  {
    key: 'trim',
    title: 'Trim Edges',
    desc: 'Drop first 1s and last 1s',
  },
  {
    key: 'stitch',
    title: 'Consolidate & Stitch',
    desc: 'Join into final_meditation.mp3',
  },
]

const STATUS_LABEL = {
  pending: 'Pending',
  processing: 'Processing',
  done: 'Done',
}

export default function RightPanel({
  onListenAll,
  onPreviewStitched,
  onDownload,
}) {
  const doneCount = useStore((s) => s.segments.filter((x) => x.status === 'done').length)
  const isProcessing = useStore((s) => s.isProcessing)
  const isPlayingAll = useStore((s) => s.isPlayingAll)
  const pipelineStatuses = useStore((s) => s.pipelineStatuses)
  const finalOutputPath = useStore((s) => s.finalOutputPath)
  const warning = useStore((s) => s.warning)
  const isRecording = useStore((s) => s.isRecording)

  const hasDone = doneCount > 0
  const canExport = Boolean(finalOutputPath)

  return (
    <aside className="panel panel-right glass">
      <div className="panel-header">
        <h2>Pipeline</h2>
        <p className="panel-sub">Process & export</p>
      </div>

      <section className="right-section">
        <h3 className="section-label">Playback</h3>
        <button
          type="button"
          className="btn-block"
          disabled={!hasDone || isRecording || isProcessing}
          onClick={onListenAll}
        >
          {isPlayingAll ? '■ Stop' : '▶▶ Listen to All Together'}
        </button>
        <button
          type="button"
          className="btn-block btn-accent"
          disabled={!hasDone || isRecording || isProcessing}
          onClick={onPreviewStitched}
        >
          {isProcessing ? 'Processing…' : 'Preview Stitched Audio'}
        </button>
      </section>

      <section className="right-section pipeline-steps">
        <h3 className="section-label">Processing</h3>
        {STEPS.map((step) => {
          const status = pipelineStatuses[step.key]
          return (
            <div key={step.key} className={`pipe-card status-${status}`}>
              <div className="pipe-card-top">
                <span className="pipe-title">{step.title}</span>
                <span className={`badge badge-${status === 'processing' ? 'recording' : status}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <p className="pipe-desc">{step.desc}</p>
              {status === 'processing' && <div className="pipe-progress" />}
            </div>
          )
        })}
      </section>

      <section className="right-section export-section">
        <h3 className="section-label">Export</h3>
        <button
          type="button"
          className="btn-block"
          disabled={!canExport || isProcessing}
          onClick={onDownload}
        >
          ⬇ Download Final Audio
        </button>
      </section>

      {warning && <div className="alert alert-warn">{warning}</div>}
    </aside>
  )
}
