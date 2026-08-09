# Guided Meditation Preparer

Desktop app for recording guided meditation scripts in short segments, processing each one, and stitching them into a single downloadable audio file.

## Stack

- **Electron** — frameless desktop shell
- **React + Vite** — UI
- **Zustand** — state
- **Web Audio API** — microphone capture (PCM → WAV)
- **ffmpeg-static + fluent-ffmpeg** — noise reduction, voice deepen, tail trim, stitch
- **electron-store** — remember last project folder

## Setup

```bash
npm install
npm install --prefix renderer
```

## Develop

```bash
npm run dev
```

Starts the Vite renderer on `http://localhost:5173` and launches Electron.

## Build

```bash
npm run build
```

## Project folders

Sessions are stored under:

`~/Documents/MeditationPreparer/sessions/[timestamp]/`

- Raw segments: `segment_1.wav`, …
- Processed: `processed/processed_N.wav`
- Final: `processed/final_meditation.mp3`

## Usage

1. Click **+ New Recording Segment**
2. Press the large mic button to record / stop (same toggle)
3. Add more segments; retake any individually
4. **Listen to All Together** for a raw preview
5. **Preview Stitched Audio** to run the ffmpeg pipeline and hear the result
6. **Download Final Audio** or **Save to Project**
