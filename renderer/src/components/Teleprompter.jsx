import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { buildLinePlan } from '../utils/teleprompter'

function focusStyle(distance, half) {
  const t = Math.min(1, Math.abs(distance) / Math.max(half, 1))
  const ease = t * t * (3 - 2 * t)
  const scale = 1.42 - ease * 0.62
  const opacity = Math.max(0, 1 - Math.pow(ease, 1.15))
  const blur = ease * 1.4
  return {
    transform: `scale(${scale})`,
    opacity,
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
    fontWeight: ease < 0.22 ? 600 : 400,
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export default function Teleprompter() {
  const scriptText = useStore((s) => s.scriptText)
  const setScriptText = useStore((s) => s.setScriptText)
  const editing = useStore((s) => s.teleprompterEditing)
  const setEditing = useStore((s) => s.setTeleprompterEditing)
  const autoplay = useStore((s) => s.teleprompterAutoplay)
  const isRecording = useStore((s) => s.isRecording)

  const [draft, setDraft] = useState(scriptText)
  const scrollerRef = useRef(null)
  const lineRefs = useRef([])
  const [styles, setStyles] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  const plan = useMemo(() => buildLinePlan(scriptText), [scriptText])
  const hasScript = scriptText.trim().length > 0

  const updateFocus = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const rect = scroller.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    const half = rect.height / 2
    let bestIdx = 0
    let bestDist = Infinity
    const next = []

    lineRefs.current.forEach((el, i) => {
      if (!el) {
        next[i] = { transform: 'scale(0.85)', opacity: 0, filter: 'none', fontWeight: 400 }
        return
      }
      const lineRect = el.getBoundingClientRect()
      const lineCenter = lineRect.top + lineRect.height / 2
      const distance = lineCenter - centerY
      next[i] = focusStyle(distance, half)
      const abs = Math.abs(distance)
      if (abs < bestDist) {
        bestDist = abs
        bestIdx = i
      }
    })

    setStyles(next)
    setActiveIndex(bestIdx)
  }, [])

  const scrollLineToCenter = useCallback(
    (index, behavior = 'smooth') => {
      const scroller = scrollerRef.current
      const el = lineRefs.current[index]
      if (!scroller || !el) return

      const scrollerRect = scroller.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const delta =
        elRect.top + elRect.height / 2 - (scrollerRect.top + scrollerRect.height / 2)

      scroller.scrollTo({
        top: scroller.scrollTop + delta,
        behavior,
      })
      setActiveIndex(index)
      requestAnimationFrame(updateFocus)
    },
    [updateFocus]
  )

  useLayoutEffect(() => {
    if (editing) return undefined
    updateFocus()
    const scroller = scrollerRef.current
    if (!scroller) return undefined

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateFocus)
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [editing, plan.length, updateFocus])

  // Auto-advance while recording
  useEffect(() => {
    if (editing || !autoplay || !isRecording || !plan.length) return undefined

    const controller = new AbortController()
    const { signal } = controller

    ;(async () => {
      try {
        scrollLineToCenter(0, 'auto')
        await sleep(80, signal)

        for (let i = 0; i < plan.length; i++) {
          if (signal.aborted) return
          scrollLineToCenter(i, i === 0 ? 'auto' : 'smooth')
          await sleep(plan[i].durationMs, signal)
        }
      } catch (err) {
        if (err?.name !== 'AbortError') throw err
      }
    })()

    return () => controller.abort()
  }, [autoplay, isRecording, editing, plan, scrollLineToCenter])

  // Block manual scroll fighting autoplay
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !autoplay) return undefined

    const block = (e) => {
      e.preventDefault()
    }
    scroller.addEventListener('wheel', block, { passive: false })
    scroller.addEventListener('touchmove', block, { passive: false })
    return () => {
      scroller.removeEventListener('wheel', block)
      scroller.removeEventListener('touchmove', block)
    }
  }, [autoplay, editing])

  useEffect(() => {
    if (editing) setDraft(scriptText)
  }, [editing, scriptText])

  const startPrompter = () => {
    setScriptText(draft)
    if (!draft.trim()) return
    setEditing(false)
  }

  const openEditor = () => {
    if (autoplay || isRecording) return
    setDraft(scriptText)
    setEditing(true)
  }

  const clearScript = () => {
    setDraft('')
    setScriptText('')
    setEditing(true)
  }

  if (editing || !hasScript) {
    return (
      <div className="teleprompter teleprompter-edit">
        <div className="teleprompter-intro">
          <h3>Your script</h3>
          <p>
            Paste the full meditation text. Use <code>...</code> for pauses (1s per dot),
            blank lines for a 1s breath, and <code>(n)</code> for an n-second hold.
            Recording auto-opens the teleprompter and advances slowly for you.
          </p>
        </div>
        <textarea
          className="teleprompter-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            'Take a slow breath in...\n\nAnd gently release.\n(3)\n\nFeel your shoulders soften.'
          }
          spellCheck
        />
        <div className="teleprompter-edit-actions">
          <button type="button" className="btn-ghost" disabled={!draft.trim()} onClick={clearScript}>
            Clear
          </button>
          <button type="button" className="btn-solid" disabled={!draft.trim()} onClick={startPrompter}>
            Open Teleprompter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`teleprompter teleprompter-read${autoplay ? ' is-autoplay' : ''}`}>
      <div className="teleprompter-toolbar">
        <span className="teleprompter-cue">
          {autoplay
            ? 'Auto-advancing · . .. ... and (n) add pauses'
            : 'Scroll · center line stays focused'}
        </span>
        <div className="teleprompter-toolbar-actions">
          <button
            type="button"
            className="btn-ghost"
            disabled={autoplay || isRecording}
            onClick={openEditor}
          >
            Edit script
          </button>
        </div>
      </div>

      <div className="teleprompter-stage">
        <div className="teleprompter-guide" aria-hidden />
        <div
          ref={scrollerRef}
          className="teleprompter-scroller"
          tabIndex={0}
          role="region"
          aria-label="Teleprompter script"
          aria-live={autoplay ? 'polite' : undefined}
        >
          <div className="teleprompter-pad" aria-hidden />
          {plan.map((line) => (
            <p
              key={`${line.index}-${line.raw.slice(0, 12)}`}
              ref={(el) => {
                lineRefs.current[line.index] = el
              }}
              className={`teleprompter-line${line.empty ? ' is-spacer' : ''}${
                line.index === activeIndex ? ' is-active' : ''
              }`}
              style={styles[line.index]}
            >
              {line.empty ? '\u00A0' : line.text || '\u00A0'}
            </p>
          ))}
          <div className="teleprompter-pad" aria-hidden />
        </div>
        <div className="teleprompter-fade teleprompter-fade-top" aria-hidden />
        <div className="teleprompter-fade teleprompter-fade-bottom" aria-hidden />
      </div>
    </div>
  )
}
