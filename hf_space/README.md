# Hugging Face Space (Inference API)

This Space serves the chess model with a `/move` endpoint. The model weights are baked into the Docker image for instant startup — no runtime downloads needed.

## Files Required
Copy these folders from the `grpo_chess` repo into this Space root:

- `grpo_self_play/`
- `searchless_chess_model/`
- `model/` (contains `model.safetensors` and `config.json`)

They should sit next to `app.py` so imports like `from grpo_self_play...` resolve.

## Environment Variables
- `LOCAL_MODEL_DIR` (default: `/app/model`) — path to model directory
- `WEIGHTS_FILE` (default: `model.safetensors`)
- `CONFIG_FILE` (default: `config.json`)

## API
POST `/move`

Request:
```json
{ "fen": "...", "temperature": 1.0, "greedy": false }
```

Response:
```json
{ "uci": "e2e4", "san": "e4", "fen": "..." }
```
