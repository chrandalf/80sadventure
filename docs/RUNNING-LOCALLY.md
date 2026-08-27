# Running the game (and me) on your own machine

Everything so far has been built in a sandbox with no GPU, which is why the
depth maps in `public/assets/depth/` are ray-cast stand-ins rather than
predictions. This is the short version of moving to your box so the graphics
work can use the card.

## 1. Get the repo

```powershell
git clone https://github.com/chrandalf/80sadventure.git
cd 80sadventure
git checkout claude/video-game-graphics-hhp0rl
npm install
```

`npm run dev` should then serve the game on http://localhost:5173, and the
three prototypes at `/office3d.html`, `/office_hybrid.html` and
`/office_depth.html`.

## 2. Get Claude Code in the terminal

```powershell
npm install -g @anthropic-ai/claude-code
cd 80sadventure
claude
```

First run asks you to sign in through the browser; the same account you are
using now. From then on `claude` in the repo root picks up `CLAUDE.md`, the
docs in `docs/`, and can run the GPU tools directly instead of writing them
blind. On Windows it works in PowerShell, or in WSL if you would rather have
a Linux shell (WSL also makes the CUDA install below easier).

## 3. Point PyTorch at the GPU

The requirements file deliberately does **not** pin a CUDA build, because the
right wheel depends on your driver. Install torch first, then the rest:

```powershell
# check what you have
nvidia-smi

# pick the matching command from https://pytorch.org/get-started/locally/
# for a current NVIDIA card on Windows this is usually:
pip install torch --index-url https://download.pytorch.org/whl/cu124

pip install -r tools/depth/requirements.txt
```

Verify:

```powershell
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

If that prints `False`, the CPU path still works - it is about a minute a
room instead of a second - so nothing is blocked, it is just slower.

## 4. Make the real depth maps

```powershell
npm run assets:depth
```

or, for control over which model and which rooms:

```powershell
python tools/depth/estimate_depth.py --model base --only office
python tools/depth/estimate_depth.py --force            # redo all 33
```

`small` is the default and is plenty for occlusion; `base` and `large` cost
more memory for detail that gets thresholded away. Output lands in
`public/assets/depth/<room>.png`, white near, black far.

Then open `/office_depth.html` and press **V** to flip between the painting
and its depth. Walking Jack around the desk shows what the model actually
understood: every painted edge occludes, with no hand-traced polygon in the
rendering path. Two numbers per room (`DEPTH_NEAR` / `DEPTH_FAR` in
`src/proto/officeDepth.ts`) set the scale.

## 5. What the GPU is worth beyond depth

Once torch is running locally the same setup covers the other things that
have been done by hand or by paid API:

- **Depth for all 33 rooms** - the job above, minutes rather than a day of
  tracing occluder polygons.
- **Local image generation** - SDXL or Flux through ComfyUI or `diffusers`,
  which removes the per-image cost that has been capping the art runs, and
  lets a room be re-rolled twenty times until one looks right.
- **Upscaling the existing plates** - Real-ESRGAN on the 640x400 paintings
  if the game ever wants a higher internal resolution.

None of that changes the game as it stands; it changes how cheap it is to
iterate on the art.

## Housekeeping

The xAI and OpenRouter keys pasted into chat should be revoked - they have
been through a transcript and should be treated as burned. Locally you would
put replacements in a `.env` that is never committed.
