const path = require('path')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')

function getFfmpegPath() {
  // Prefer packaged resource path when available (outside asar)
  if (process.resourcesPath) {
    const packaged = path.join(
      process.resourcesPath,
      'ffmpeg',
      process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    )
    if (fs.existsSync(packaged)) return packaged
  }

  // ffmpeg-static may point inside app.asar; binaries must be spawned from unpacked path
  let resolved = ffmpegStatic
  if (resolved && resolved.includes('app.asar' + path.sep)) {
    const unpacked = resolved.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep)
    if (fs.existsSync(unpacked)) return unpacked
  }
  return resolved
}

ffmpeg.setFfmpegPath(getFfmpegPath())

function runFfmpeg(input, output, filterComplex) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(input).output(output)

    if (filterComplex) {
      cmd.audioFilters(filterComplex)
    }

    cmd
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .run()
  })
}

/** Find a RIFF chunk by id; returns { offset, size } of chunk payload. */
function findWavChunk(buf, id) {
  let offset = 12
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    const dataOffset = offset + 8
    if (chunkId === id) return { offset: dataOffset, size }
    offset = dataOffset + size + (size % 2)
  }
  return null
}

/** Read duration from a PCM WAV file (supports non-standard chunk layouts). */
function getWavDuration(filePath) {
  const buf = fs.readFileSync(filePath)
  const fmt = findWavChunk(buf, 'fmt ')
  const data = findWavChunk(buf, 'data')
  if (!fmt || !data) return 0
  const sampleRate = buf.readUInt32LE(fmt.offset + 4)
  const channels = buf.readUInt16LE(fmt.offset + 2)
  const bitsPerSample = buf.readUInt16LE(fmt.offset + 14)
  const bytesPerSec = sampleRate * channels * (bitsPerSample / 8)
  if (!bytesPerSec) return 0
  return data.size / bytesPerSec
}

function encodeWavBuffer(samples, sampleRate = 44100) {
  const numSamples = samples.length
  const buffer = Buffer.alloc(44 + numSamples * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + numSamples * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(numSamples * 2, 40)
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2)
  }
  return buffer
}

const HEAD_TRIM_SEC = 2
const TAIL_TRIM_SEC = 1

/**
 * Process a single segment:
 * 1. Noise reduction (afftdn)
 * 2. Deepen voice (bass boost)
 * 3. Trim first 2 seconds and last 1 second
 */
async function processSegment(inputPath, outputPath) {
  const duration = getWavDuration(inputPath)
  const trimStart = Math.min(HEAD_TRIM_SEC, Math.max(0, duration - 0.1))
  const trimEnd = Math.max(trimStart + 0.1, duration - TAIL_TRIM_SEC)

  // Combined filter chain: denoise → bass deepen → trim head/tail
  const filters = [
    'afftdn=nf=-25',
    'bass=g=6:f=100:w=0.5',
    `atrim=${trimStart.toFixed(3)}:${trimEnd.toFixed(3)}`,
    'asetpts=PTS-STARTPTS',
  ]

  return runFfmpeg(inputPath, outputPath, filters)
}

/**
 * Concatenate processed segments into one MP3.
 */
function stitchSegments(segmentPaths, outputPath) {
  return new Promise((resolve, reject) => {
    if (!segmentPaths.length) {
      return reject(new Error('No segments to stitch'))
    }

    // Write concat demuxer list
    const listPath = path.join(path.dirname(outputPath), 'concat_list.txt')
    const listContent = segmentPaths
      .map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
      .join('\n')
    fs.writeFileSync(listPath, listContent, 'utf8')

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => {
        try {
          fs.unlinkSync(listPath)
        } catch {
          /* ignore */
        }
        resolve(outputPath)
      })
      .on('error', (err) => reject(err))
      .run()
  })
}

/**
 * Full pipeline with progress callbacks.
 * @param {string[]} segmentPaths - raw wav paths (done segments only)
 * @param {string} processedDir
 * @param {(step: string) => void} onProgress
 */
async function processPipeline(segmentPaths, processedDir, onProgress) {
  if (!segmentPaths.length) {
    throw new Error('No completed segments to process')
  }

  fs.mkdirSync(processedDir, { recursive: true })

  const processedPaths = []

  // Step 1–3 applied per segment in one ffmpeg pass
  onProgress('noise')
  // Brief yield so UI can paint
  await delay(80)

  onProgress('voice')
  await delay(80)

  onProgress('trim')

  for (let i = 0; i < segmentPaths.length; i++) {
    const input = segmentPaths[i]
    const out = path.join(processedDir, `processed_${i + 1}.wav`)
    await processSegment(input, out)
    processedPaths.push(out)
  }

  onProgress('stitch')
  const finalPath = path.join(processedDir, 'final_meditation.mp3')
  await stitchSegments(processedPaths, finalPath)

  return finalPath
}

function buildWaveform(samples, bars = 48) {
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
    const avg = count ? sum / count : 0
    peaks.push(peak * 0.7 + avg * 0.3)
  }

  const max = Math.max(...peaks, 1e-6)

  return peaks.map((p) => {
    const n = p / max
    if (n < 0.035) return 0.07
    const boosted = Math.pow(n, 0.55)
    return Math.min(1, 0.14 + boosted * 0.86)
  })
}

/** Read mono 16-bit PCM samples from a WAV file. */
function readWavPcm(filePath) {
  const buf = fs.readFileSync(filePath)
  const fmt = findWavChunk(buf, 'fmt ')
  const data = findWavChunk(buf, 'data')
  if (!fmt || !data) {
    throw new Error('Invalid WAV file')
  }

  const audioFormat = buf.readUInt16LE(fmt.offset)
  const channels = buf.readUInt16LE(fmt.offset + 2)
  const sampleRate = buf.readUInt32LE(fmt.offset + 4)
  const bitsPerSample = buf.readUInt16LE(fmt.offset + 14)

  if (audioFormat !== 1 || bitsPerSample !== 16) {
    throw new Error('Only 16-bit PCM WAV is supported for trimming')
  }

  const frameSize = channels * 2
  const frameCount = Math.floor(data.size / frameSize)
  const samples = new Float32Array(frameCount)

  for (let i = 0; i < frameCount; i++) {
    let sum = 0
    for (let ch = 0; ch < channels; ch++) {
      const s = buf.readInt16LE(data.offset + i * frameSize + ch * 2)
      sum += s < 0 ? s / 0x8000 : s / 0x7fff
    }
    samples[i] = sum / channels
  }

  return { samples, sampleRate, duration: frameCount / sampleRate }
}

/**
 * Keep audio from 0..keepUntilSec and discard the rest (in place).
 * Uses direct PCM rewrite so repeated trims stay reliable.
 */
async function trimKeepStart(filePath, keepUntilSec) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Audio file not found')
  }

  const { samples, sampleRate, duration } = readWavPcm(filePath)
  const end = Math.min(Math.max(0.05, keepUntilSec), Math.max(0.05, duration))
  const keepCount = Math.max(1, Math.min(samples.length, Math.round(end * sampleRate)))

  if (keepCount >= samples.length) {
    return {
      filePath,
      duration,
      waveformData: buildWaveform(samples),
    }
  }

  const trimmed = samples.subarray(0, keepCount)
  fs.writeFileSync(filePath, encodeWavBuffer(trimmed, sampleRate))

  return {
    filePath,
    duration: trimmed.length / sampleRate,
    waveformData: buildWaveform(trimmed),
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

module.exports = {
  processPipeline,
  processSegment,
  stitchSegments,
  trimKeepStart,
  getFfmpegPath,
}
