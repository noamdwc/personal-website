#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

import torch
from safetensors.torch import save_file


def extract_state_dict(checkpoint):
    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            return checkpoint["model_state_dict"]
        if "state_dict" in checkpoint:
            # Lightning format: filter policy_model.* if present
            state_dict = checkpoint["state_dict"]
            filtered = {}
            for k, v in state_dict.items():
                if k.startswith("policy_model."):
                    filtered[k.replace("policy_model.", "")] = v
            return filtered or state_dict
    return checkpoint


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, help="Path to .ckpt/.pt/.pth")
    parser.add_argument("--out-dir", default="model", help="Output directory")
    parser.add_argument("--vocab-size", type=int, default=300)
    parser.add_argument("--embed-dim", type=int, default=256)
    parser.add_argument("--num-layers", type=int, default=4)
    parser.add_argument("--num-heads", type=int, default=8)
    parser.add_argument("--action-dim", type=int, default=1968)
    parser.add_argument("--skip-validate", action="store_true")
    parser.add_argument(
        "--model-code-path",
        default="/Users/noamc/repos/grpo_chess",
        help="Path to grpo_chess repo (for loading pickled modules)",
    )
    args = parser.parse_args()

    ckpt_path = Path(args.checkpoint)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.model_code_path:
        sys.path.insert(0, args.model_code_path)

    checkpoint = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    state_dict = extract_state_dict(checkpoint)

    weights_path = out_dir / "model.safetensors"
    save_file(state_dict, str(weights_path))

    config = {
        "vocab_size": args.vocab_size,
        "embed_dim": args.embed_dim,
        "num_layers": args.num_layers,
        "num_heads": args.num_heads,
        "action_dim": args.action_dim,
    }
    config_path = out_dir / "config.json"
    config_path.write_text(json.dumps(config, indent=2))

    print(f"Saved weights to {weights_path}")
    print(f"Saved config to {config_path}")

    if args.skip_validate:
        return

    try:
        from src.grpo_self_play.models import ChessTransformer, ChessTransformerConfig
        from src.grpo_self_play.searchless_chess_imports import tokenize
    except Exception as exc:
        print("Validation skipped: could not import model code.", exc)
        return

    model = ChessTransformer(ChessTransformerConfig(**config))
    model.load_state_dict(state_dict, strict=False)
    model.eval()
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    tokens = tokenize(fen)
    x = torch.tensor(tokens, dtype=torch.long).unsqueeze(0)
    with torch.no_grad():
        logits = model(x)
    assert logits.shape[-1] == args.action_dim
    print("Validation OK. Logits shape:", logits.shape)


if __name__ == "__main__":
    main()
