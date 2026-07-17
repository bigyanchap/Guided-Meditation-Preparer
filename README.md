# Guided Meditation Preparer

Desktop app for stitching tiny recordings into guided meditation sessions. Built with React and Electron.

## Brand

The product logo lives at `assets/logo.png` and is reused everywhere branding appears:

- App window / dock icon (`electron/main.cjs`)
- Packaged app icons (`package.json` → `build`)
- Favicon and web assets (`public/logo.png`, `public/favicon.png`)
- In-app header, hero, and footer via the shared `AppLogo` component

Do not introduce alternate marks — import `AppLogo` (or the `assets/logo.png` path for native icons) whenever a logo is needed.

## Develop

```bash
npm install
npm run electron:dev
```

Web-only preview:

```bash
npm run dev
```

## Build

```bash
npm run electron:build
```
