/** Very slow guided-meditation pace (~60 wpm). */
const MS_PER_WORD = 1000
const MIN_LINE_MS = 1400
const LINE_BREAK_MS = 1000

const PAREN_DELAY_RE = /\((\d+(?:\.\d+)?)\)/g

/**
 * Strip timing cues like (5) for on-screen reading.
 */
export function displayLine(line) {
  return line.replace(PAREN_DELAY_RE, '').replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ')
}

/**
 * Duration to keep a line centered before advancing.
 * - empty line / line break → 1s
 * - "." / ".." / "..." → 1s / 2s / 3s (and longer runs × 1s each)
 * - "…" → 3s
 * - "(n)" → n seconds
 * - plus slow per-word reading time for spoken text
 */
export function lineDurationMs(line) {
  if (!line.trim()) return LINE_BREAK_MS

  let pauseMs = 0

  PAREN_DELAY_RE.lastIndex = 0
  let match
  while ((match = PAREN_DELAY_RE.exec(line)) !== null) {
    pauseMs += Number(match[1]) * 1000
  }

  let rest = line.replace(PAREN_DELAY_RE, ' ')

  const ellipsisChars = rest.match(/…/g)
  if (ellipsisChars) {
    pauseMs += ellipsisChars.length * 3000
    rest = rest.replace(/…/g, ' ')
  }

  const dotRuns = rest.match(/\.{1,}/g)
  if (dotRuns) {
    for (const run of dotRuns) {
      pauseMs += run.length * 1000
    }
    rest = rest.replace(/\.{1,}/g, ' ')
  }

  const words = rest
    .replace(/[^\p{L}\p{N}'’]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) {
    return Math.max(pauseMs, LINE_BREAK_MS)
  }

  const readMs = Math.max(words.length * MS_PER_WORD, MIN_LINE_MS)
  return readMs + pauseMs
}

export function buildLinePlan(scriptText) {
  const rawLines = scriptText.replace(/\r\n/g, '\n').split('\n')
  return rawLines.map((raw, index) => ({
    index,
    raw,
    text: displayLine(raw),
    durationMs: lineDurationMs(raw),
    empty: !displayLine(raw).trim(),
  }))
}
