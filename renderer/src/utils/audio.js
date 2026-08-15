/**
 * Encode Float32 mono PCM samples as a 16-bit WAV ArrayBuffer.
 */
export function encodeWav(samples, sampleRate = 44100) {
  const numSamples = samples.length
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, numSamples * 2, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return buffer
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/**
 * Downsample amplitude peaks for waveform display.
 * Emphasizes spoken parts vs quiet gaps.
 */
export function buildWaveform(samples, bars = 48) {
  if (!samples.length) return Array(bars).fill(0.08)
  const block = Math.floor(samples.length / bars) || 1
  const peaks = []

  for (let i = 0; i < bars; i++) {
    let peak = 0
    let sum = 0
    let count = 0
    const start = i * block
    const end = Math.min(start + block, samples.length)
    for (let j = start; j < end; j++) {
      const a = Math.abs(samples[j])
      if (a > peak) peak = a
      sum += a
      count++
    }
    // Blend peak + average so sustained speech stays strong
    const avg = count ? sum / count : 0
    peaks.push(peak * 0.7 + avg * 0.3)
  }

  const max = Math.max(...peaks, 1e-6)

  return peaks.map((p) => {
    const n = p / max
    // Gate near-silence; lift mid/high levels so speech fills the bar
    if (n < 0.035) return 0.07
    const boosted = Math.pow(n, 0.55)
    return Math.min(1, 0.14 + boosted * 0.86)
  })
}

/**
 * Format seconds as m:ss
 */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, '0')}`
}
