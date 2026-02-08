import os
import sys
import types
from pathlib import Path

import chess
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from safetensors.torch import load_file

APP_ROOT = Path(__file__).resolve().parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

# Compatibility shim: training code imports modules as src.*.
# In this Docker layout packages are top-level, so we alias them.
if "src" not in sys.modules:
    src_pkg = types.ModuleType("src")
    src_pkg.__path__ = [str(APP_ROOT)]
    sys.modules["src"] = src_pkg

import grpo_self_play
import searchless_chess_model

sys.modules.setdefault("src.grpo_self_play", grpo_self_play)
sys.modules.setdefault("src.searchless_chess_model", searchless_chess_model)


class MoveRequest(BaseModel):
    fen: str
    temperature: float = 1.0
    greedy: bool = False


class MoveResponse(BaseModel):
    uci: str
    san: str
    fen: str


MODEL_REPO = os.environ.get("MODEL_REPO", "noamdwc/grpo-chess-model")
WEIGHTS_FILE = os.environ.get("WEIGHTS_FILE", "model.safetensors")
CONFIG_FILE = os.environ.get("CONFIG_FILE", "config.json")
LOCAL_MODEL_DIR = os.environ.get("LOCAL_MODEL_DIR")

_model = None
_config = None


def load_model():
    global _model, _config
    if _model is not None:
        return _model

    # Local-first mode for deterministic local testing.
    if LOCAL_MODEL_DIR:
        base = Path(LOCAL_MODEL_DIR)
        weights_path = str(base / WEIGHTS_FILE)
        config_path = str(base / CONFIG_FILE)
        if not Path(weights_path).exists():
            raise FileNotFoundError(f"Weights not found at {weights_path}")
        if not Path(config_path).exists():
            raise FileNotFoundError(f"Config not found at {config_path}")
    else:
        token = os.environ.get("HF_TOKEN")
        weights_path = hf_hub_download(
            repo_id=MODEL_REPO,
            filename=WEIGHTS_FILE,
            repo_type="model",
            token=token,
        )
        config_path = hf_hub_download(
            repo_id=MODEL_REPO,
            filename=CONFIG_FILE,
            repo_type="model",
            token=token,
        )

    import json
    from grpo_self_play.models import ChessTransformer, ChessTransformerConfig

    _config = json.loads(Path(config_path).read_text())
    model = ChessTransformer(ChessTransformerConfig(**_config))
    state = load_file(weights_path)
    model.load_state_dict(state, strict=False)
    model.eval()
    _model = model
    return _model


def choose_move(model, board: chess.Board, temperature: float, greedy: bool) -> chess.Move:
    from grpo_self_play.chess.policy_player import PolicyPlayer, PolicyConfig

    cfg = PolicyConfig(temperature=temperature, greedy=greedy)
    player = PolicyPlayer(model, cfg=cfg)
    move = player.act(board)
    return move


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": "local" if LOCAL_MODEL_DIR else "huggingface",
    }


@app.post("/move", response_model=MoveResponse)
def move(req: MoveRequest):
    try:
        board = chess.Board(req.fen)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {exc}")
    model = load_model()
    move = choose_move(model, board, req.temperature, req.greedy)
    san = board.san(move)
    board.push(move)
    return MoveResponse(uci=move.uci(), san=san, fen=board.fen())
