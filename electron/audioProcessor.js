const path = require('path')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')

function getFfmpegPath() {
  // Prefer packaged resource path when available
  if (process.resourcesPath) {
    const packaged = path.join(
      process.resourcesPath,
      'ffmpeg',
      process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    )
    if (fs.existsSync(packaged)) return packaged
  }
  return ffmpegStatic
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

/** Read duration from a PCM WAV header (no ffprobe needed). */
function getWavDuration(filePath) {
  const fd = fs.openSync(filePath, 'r')
  try {
    const header = Buffer.alloc(44)
    fs.readSync(fd, header, 0, 44, 0)
    const sampleRate = header.readUInt32LE(24)
    const channels = header.readUInt16LE(22)
    const bitsPerSample = header.readUInt16LE(34)
    const dataSize = header.readUInt32LE(40)
    const bytesPerSec = sampleRate * channels * (bitsPerSample / 8)
    if (!bytesPerSec) return 0
    return dataSize / bytesPerSec
  } finally {
    fs.closeSync(fd)
  }
}

/**
 * Process a single segment:
 * 1. Noise reduction (afftdn)
 * 2. Deepen voice (bass boost)
 * 3. Trim last 1 second
 */
async function processSegment(inputPath, outputPath) {
  const duration = getWavDuration(inputPath)
  const trimEnd = Math.max(0.1, duration - 1)

  // Combined filter chain: denoise → bass deepen → trim tail
  const filters = [
    'afftdn=nf=-25',
    'bass=g=6:f=100:w=0.5',
    `atrim=0:${trimEnd.toFixed(3)}`,
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

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

module.exports = {
  processPipeline,
  processSegment,
  stitchSegments,
  getFfmpegPath,
}
