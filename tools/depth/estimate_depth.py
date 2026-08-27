"""
Predict a depth map for every painted room, using a GPU.

    pip install -r tools/depth/requirements.txt
    python tools/depth/estimate_depth.py

Writes public/assets/depth/<room>.png: a greyscale image the same size as the
plate, where white is near the camera and black is far away.

Why this exists
---------------
The hybrid renderer needs to know how far away every pixel of the painting is,
so a character can be hidden by the desk, the radiator, the door frame or the
chair without anyone hand-placing a box for each. Deriving that by hand takes
about ten minutes a room and gives you boxes; a depth model does all
thirty-three in a couple of minutes and gives you every edge in the picture.

The model
---------
Depth Anything V2 predicts *relative* depth from a single image: the numbers
are consistent within one picture but carry no absolute scale, which is
exactly what is wanted here. Scale is fixed per room in the renderer, where
one known distance - the desk's base, say - anchors the whole map.

Runs on CPU if no GPU is present, at roughly a minute a room instead of
seconds. --size trades detail for speed.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

ROOT = Path(__file__).resolve().parents[2]
PLATES = ROOT / "public" / "assets" / "backgrounds"
OUT = ROOT / "public" / "assets" / "depth"

# Small is plenty: the plates are 640x400 and the output is consumed as an
# occlusion test, not as a surface. Large costs several times the memory for
# detail that is thrown away.
MODELS = {
    "small": "depth-anything/Depth-Anything-V2-Small-hf",
    "base": "depth-anything/Depth-Anything-V2-Base-hf",
    "large": "depth-anything/Depth-Anything-V2-Large-hf",
}


def device_for(requested: str) -> str:
    if requested != "auto":
        return requested
    if torch.cuda.is_available():
        return "cuda"
    # Apple silicon.
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=MODELS, default="small")
    ap.add_argument("--device", default="auto")
    ap.add_argument("--only", help="substring; process just the rooms matching it")
    ap.add_argument("--force", action="store_true", help="redo maps that already exist")
    args = ap.parse_args()

    dev = device_for(args.device)
    print(f"device: {dev}   model: {MODELS[args.model]}")
    if dev == "cpu":
        print("  (no GPU found - this will work, but expect about a minute a room)")

    processor = AutoImageProcessor.from_pretrained(MODELS[args.model])
    model = AutoModelForDepthEstimation.from_pretrained(MODELS[args.model]).to(dev).eval()

    OUT.mkdir(parents=True, exist_ok=True)
    plates = sorted(p for p in PLATES.glob("*.png") if "_duck" not in p.name)
    if args.only:
        plates = [p for p in plates if args.only in p.name]
    if not plates:
        print("no plates matched", file=sys.stderr)
        return 2

    for plate in plates:
        dest = OUT / plate.name
        if dest.exists() and not args.force:
            print(f"  = {plate.stem}  (exists, --force to redo)")
            continue

        image = Image.open(plate).convert("RGB")
        inputs = processor(images=image, return_tensors="pt").to(dev)
        with torch.no_grad():
            predicted = model(**inputs).predicted_depth

        # Back to the plate's own size, so the renderer can sample it 1:1.
        depth = torch.nn.functional.interpolate(
            predicted.unsqueeze(1),
            size=image.size[::-1],
            mode="bicubic",
            align_corners=False,
        ).squeeze().cpu().numpy()

        # Normalise per room. The model's units are arbitrary and differ from
        # picture to picture, so the only meaningful thing to preserve is the
        # ordering within this one image.
        lo, hi = float(depth.min()), float(depth.max())
        norm = (depth - lo) / (hi - lo) if hi > lo else np.zeros_like(depth)
        Image.fromarray((norm * 255).astype(np.uint8), mode="L").save(dest)
        print(f"  + {plate.stem}  {image.size[0]}x{image.size[1]}  range {lo:.1f}..{hi:.1f}")

    print(f"\nwritten to {OUT.relative_to(ROOT)}")
    print("next: open /office_depth.html and check the occlusion against the art")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
