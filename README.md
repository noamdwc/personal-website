# Personal Website

Single‑page personal site built with Astro. Designed to highlight research with production impact and showcase projects.

## Quick Start
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Content
Edit your details and projects here:
`src/data/profile.json`

## Deploy
This repo includes a GitHub Pages workflow:
`.github/workflows/deploy.yml`

If deploying as a user site, set `site` in:
`astro.config.mjs`

## Notes
- Project play links are optional. When missing, the UI shows “Coming Soon.”
- Upcoming projects are hidden by default; set `upcoming.visible` to `true` in `src/data/profile.json` when ready.
