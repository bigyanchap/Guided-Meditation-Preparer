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

- Project state: `project.json` (script, segments, pipeline status — auto-saved)
- Raw segments: `segment_1.wav`, …
- Processed: `processed/processed_N.wav`
- Final: `processed/final_meditation.mp3`

Use **Save Project** (name + location dialog) and **Open Project** above Segments. Closing the app also auto-saves; reopen to resume where you left off.

## Usage

1. Click **+ New Recording Segment**
2. Press the large mic button to record / stop (same toggle)
3. Add more segments; retake any individually
4. **Listen to All Together** for a raw preview
5. **Preview Stitched Audio** to run the ffmpeg pipeline and hear the result
6. **Download Final Audio** or **Save to Project**

## Release notes

See [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) for v2.0.0 and earlier.

## License

**Copyright © 2026 Guided Meditation Preparer. All rights reserved.**

This software is **proprietary**. It is **not** open source.

### Free for individuals

You may use the app **free of charge** if you are an **individual** using it for your own personal meditation / content creation (including as a solo creator publishing your own work).

Free individual use does **not** include redistribution of the app itself, or use by a company / organization.

### Paid for companies

A **paid commercial license is required** if the Software is used by or for:

- a company, LLC, corporation, nonprofit, school, studio, agency, or other organization
- employees or contractors of such an organization
- client work billed through a business
- internal business / team production workflows

### Always prohibited without written permission

- Selling, renting, sublicensing, or redistributing the app
- Publishing the source code, builds, or derivatives
- Removing or altering copyright / license notices

### Buy a company license

Companies: email **[bigyanchapagain@gmail.com](mailto:bigyanchapagain@gmail.com)** to purchase or request a quote.

Include your company name, intended use, and number of seats. Pricing and payment terms are confirmed by email.

See [`LICENSE`](./LICENSE) for the full terms.

