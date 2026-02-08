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
3. Upload `model/model.safetensors` + `model/config.json` to your HF model repo.
4. Create a HF Space using `hf_space/` and copy `grpo_self_play/` + `searchless_chess_model/` into the Space.

## Local Docker API Test
You can test the model API locally without Hugging Face.

1. Build the API image:
   ```bash
   docker build -t grpo-chess-api ./hf_space_repo
   ```
2. Run the API locally (local model files mounted, no network dependency):
   - Put `model.safetensors` and `config.json` under `./model`
   ```bash
   docker run --rm -p 7860:7860 \
     -v "$(pwd)/model:/models:ro" \
     -e LOCAL_MODEL_DIR=/models \
     grpo-chess-api
   ```
   Optional fallback (load from Hugging Face instead of local files):
   ```bash
   docker run --rm -p 7860:7860 \
     -e MODEL_REPO=noamdwc/grpo-chess-model \
     -e HF_TOKEN=<your_hf_token_if_repo_is_private> \
     grpo-chess-api
   ```
3. Check health:
   ```bash
   curl http://127.0.0.1:7860/health
   ```
4. Run API test against local Docker:
   ```bash
   npm run test:api:local
   ```
