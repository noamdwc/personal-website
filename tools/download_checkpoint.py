#!/usr/bin/env python3
import argparse
import hashlib
import sys
from pathlib import Path

import gdown


def download_file(file_id: str, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://drive.google.com/uc?id={file_id}"
    if output_path.exists():
        output_path.unlink()
    result = gdown.download(url, str(output_path), quiet=False)
    if not result:
        raise RuntimeError("gdown download failed (no output file).")
    size = output_path.stat().st_size
    hasher = hashlib.sha256()
    with open(output_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            hasher.update(chunk)
    return size, hasher.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file-id", required=True, help="Google Drive file ID")
    parser.add_argument(
        "--output",
        default="checkpoints/model.ckpt",
        help="Output checkpoint path",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    size, sha = download_file(args.file_id, output_path)
    print(f"Downloaded {size} bytes to {output_path}")
    print(f"SHA256: {sha}")

    if size == 0:
        print("ERROR: Downloaded file size is 0 bytes.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
