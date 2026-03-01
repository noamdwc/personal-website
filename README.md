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

## Playable Chess Demo
The playable chess page lives at:
`src/pages/play.astro`

Frontend logic:
`public/scripts/play.js`

Set the API base URL in:
`src/data/profile.json` → `playApiBase`

## Deploy
This repo includes a GitHub Pages workflow:
`.github/workflows/deploy.yml`

If deploying as a user site, set `site` in:
`astro.config.mjs`

## Notes
- Project play links are optional. When missing, the UI shows “Coming Soon.”
- Upcoming projects are hidden by default; set `upcoming.visible` to `true` in `src/data/profile.json` when ready.

## Model Packaging + Hugging Face
Scripts and templates:
- `tools/download_checkpoint.py`
- `tools/export_checkpoint.py`
- `hf_space/`

Workflow:
1. Download checkpoint from Google Drive:
   ```bash
   python tools/download_checkpoint.py --file-id <FILE_ID> --output checkpoints/model.ckpt
   ```
2. Export to safetensors:
   ```bash
   python tools/export_checkpoint.py --checkpoint checkpoints/model.ckpt --out-dir model
   ```
3. Copy model files into the HF Space repo:
   ```bash
   cp -r model/ hf_space_repo/model/
   ```
4. Push `hf_space_repo/` to your HF Space — the Docker image bakes the model in at build time.

## Local Docker API Test
You can test the model API locally.

1. Copy model files into the Space repo (if not already):
   ```bash
   cp -r model/ hf_space_repo/model/
   ```
2. Build the API image (model is baked in):
   ```bash
   docker build -t grpo-chess-api ./hf_space_repo
   ```
3. Run the API locally:
   ```bash
   docker run --rm -p 7860:7860 grpo-chess-api
   ```
4. Check health:
   ```bash
   curl http://127.0.0.1:7860/health
   ```
5. Run API test against local Docker:
   ```bash
   npm run test:api:local
   ```
