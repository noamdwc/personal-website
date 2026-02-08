# Hugging Face Space (Inference API)

This Space serves the chess model with a `/move` endpoint.

## Files Required
Copy these folders from the `grpo_chess` repo into this Space root:

- `grpo_self_play/`
- `searchless_chess_model/`

They should sit next to `app.py` so imports like `from grpo_self_play...` resolve.

## Environment Variables
- `MODEL_REPO` (default: `noamdwc/grpo-chess-model`)
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
