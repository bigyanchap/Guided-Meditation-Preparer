# Guided Meditation Preparer — Release Notes

## v2.0.0

A major update focused on recording with a live teleprompter, precise segment editing, a more premium desktop UI, and clearer licensing.

### Highlights

- **Teleprompter-first recording** — paste your full script and record from one place; the old separate Record studio view is gone
- **Auto-advancing teleprompter** — when you press Record (and a script exists), the teleprompter opens and advances at a slow guided-meditation pace
- **Pause cues in your script** — blank lines, `.` / `..` / `...`, `…`, and `(n)` add timed holds while the teleprompter moves
- **Editor-style timeline** — scrub a classic playhead on each finished segment; play follows the playhead; playhead tracks during playback
- **Delete remaining** — cut everything after the playhead; trim again as many times as you need
- **Restart from start** — if the playhead is at the end, Play jumps back to the beginning of that segment
- **Premium glass UI** — frosted panels, soft sage atmosphere; the old photo background is removed
- **Native window chrome** — macOS traffic lights with a clear safe zone; Windows/Linux keep minimize / maximize / close on the top right
- **App icon** — `assets/icon.png` used for the Dock/taskbar, window, title bar, and favicon
- **Licensing** — free for individuals; companies need a paid license (see README)

### Audio pipeline

- Packaged **ffmpeg** correctly for macOS (fixes white-screen / stitch crashes from missing or asar-trapped binaries)
- Stitched processing trims the **first 2 seconds** and the **last 1 second** of each segment
- Waveforms emphasize spoken parts more clearly

### Recording & playback

- Record dock on the teleprompter (creates a segment automatically if needed)
- Segment cards: **Play** / **Stop**, **Delete remaining**, **Retake**
- Listen to All / Preview Stitched / Export flows retained and polished

### Notes

- Rebuild the desktop app with `npm run build` (or platform-specific electron-builder) so ffmpeg, icon, and native chrome changes are included
- Company licensing inquiries: [bigyanchapagain@gmail.com](mailto:bigyanchapagain@gmail.com)

---

## v1.0.0

Initial release: segment recording, basic playback, ffmpeg noise / voice / trim / stitch pipeline, and export.
