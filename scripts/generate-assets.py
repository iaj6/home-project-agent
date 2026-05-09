#!/usr/bin/env python3
"""Generate brand assets for Home Helper via OpenAI's image API.

Reads OPENAI_API_KEY from (in order):
  1. process env (OPENAI_API_KEY)
  2. functions/.env.local in this repo
  3. ~/Documents/portfolio/.env  (the user's existing pattern)

Saves output to frontend/public/assets/<name>.png. Idempotent — skips
assets whose file already exists unless --force is passed.

Usage:
    python3 scripts/generate-assets.py                 # list assets
    python3 scripts/generate-assets.py logo-mark        # generate one
    python3 scripts/generate-assets.py --all            # generate all missing
    python3 scripts/generate-assets.py logo-mark --force
    python3 scripts/generate-assets.py --model gpt-image-2 logo-mark
"""

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "frontend" / "public" / "assets"

# Style constants threaded into every prompt for cohesion.
PALETTE = (
    "warm earthy color palette: copper #B85C38 as the dominant ink color, "
    "cream #FAF6F1 backgrounds, deep slate #1E1B16 for dark variants, "
    "muted accent slate-cyan #1F4E5F used sparingly. Avoid generic SaaS palettes "
    "(no purple gradients, no cyan-on-white tech blues)."
)

STYLE = (
    "Hand-drafted contractor / architectural-blueprint aesthetic. "
    "Clean line work, slight crosshatch shading where needed, the feel of an "
    "ink stamp on warm cardstock. No photorealism, no gradients, no glossy 3D. "
    "Treat the asset like a small print-shop run, not an AI illustration."
)


ASSETS = {
    # ─────────── HIGHEST LEVERAGE ───────────
    "logo-mark-light": {
        "prompt": (
            f"A single stamped contractor-blueprint logo mark, centered on a transparent "
            f"or pure white background. Inside a square drafting frame with crisp sharp "
            f"corners, a small two-story house silhouette: simple rectangle body, gabled "
            f"roof, one rectangular door, two square windows. The mark reads as a single "
            f"unit. Style: stamped woodcut, single ink color (copper #B85C38), minimal "
            f"hatching for depth. Geometric, symmetrical, balanced. NO text, NO words, "
            f"NO letters anywhere in the image. Reads cleanly when scaled down to 32×32 "
            f"as a favicon. {PALETTE} {STYLE}"
        ),
        "size": "1024x1024",
        "quality": "high",
    },
    "logo-mark-dark": {
        "prompt": (
            f"Same stamped contractor-blueprint logo mark as the light variant, but "
            f"inverted for dark backgrounds: cream #FAF6F1 ink on a transparent or "
            f"deep slate #1E1B16 square background. Inside the drafting frame, the same "
            f"two-story house silhouette: rectangle body, gabled roof, door, two "
            f"windows. NO text, NO words, NO letters. Reads cleanly at 32×32. "
            f"{STYLE}"
        ),
        "size": "1024x1024",
        "quality": "high",
    },
    "icon-deck-building": {
        "prompt": (
            f"A single hand-drawn line-art icon of a small wooden backyard deck with a "
            f"railing along one side and one short stair step descending toward the "
            f"viewer. Slight 3/4 isometric perspective. Single-color line art in copper "
            f"#B85C38 on a pure white background, with the faintest slate accent for the "
            f"shadow under the deck. Drafting-symbol style, like an icon you'd see on a "
            f"set of construction documents. Strong silhouette. NO text, NO words. "
            f"Square composition, the deck centered with breathing room. {STYLE}"
        ),
        "size": "1024x1024",
        "quality": "high",
    },
    "icon-bathroom-vanity": {
        "prompt": (
            f"A single hand-drawn line-art icon of a freestanding bathroom vanity: "
            f"countertop, basin, single faucet, two cabinet drawers below. Slight 3/4 "
            f"isometric perspective. Single-color line art in copper #B85C38 on a pure "
            f"white background, with the faintest slate accent under the vanity for "
            f"shadow. Drafting-symbol style, like a fixture symbol on construction "
            f"documents. Clean silhouette. NO text, NO words. Square composition, "
            f"vanity centered with breathing room. {STYLE}"
        ),
        "size": "1024x1024",
        "quality": "high",
    },

    # ─────────── NICE-TO-HAVE ───────────
    "handy-mascot": {
        "prompt": (
            f"A small mascot character, single line drawing on a transparent or pure "
            f"white background. The character: a friendly figure wearing a hard hat, "
            f"holding a clipboard in one hand and a carpenter's pencil in the other, "
            f"deadpan steady expression. Standing in a relaxed pose. Single copper "
            f"#B85C38 line, no fills, no color blocks — pure outline drawing. Sticker / "
            f"badge format. Reads as charming but professional. NO text, NO words, NO "
            f"name tags. Square composition, character centered. {STYLE}"
        ),
        "size": "1024x1024",
        "quality": "high",
    },
    "og-share": {
        "prompt": (
            f"A 16:9 social-share / Open Graph banner image. Background: deep slate "
            f"#1E1B16 with a faint blueprint grid overlay. Left half: a copper-stamped "
            f"wordmark area (leave space — text will be overlaid in code). Right half: "
            f"a stylized partial deck blueprint drawing in copper line art, with rectangle "
            f"deck outline, joists at 16-inch intervals, footings as small filled "
            f"circles, dimension lines along one edge with end ticks. Corner brackets in "
            f"each of the four corners suggesting a drawing frame. NO text, NO words "
            f"anywhere — leave the left half empty for code-overlaid text. {STYLE}"
        ),
        "size": "1536x1024",
        "quality": "high",
    },
}


def find_api_key() -> str:
    if (k := os.environ.get("OPENAI_API_KEY")):
        return k.strip().strip('"').strip("'")

    candidates = [
        REPO_ROOT / "functions" / ".env.local",
        Path.home() / "Documents" / "portfolio" / ".env",
    ]
    for env_file in candidates:
        if not env_file.exists():
            continue
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")

    sys.exit(
        "OPENAI_API_KEY not found. Set it as an env var, or add it to "
        "functions/.env.local or ~/Documents/portfolio/.env"
    )


def generate(name: str, model: str, force: bool) -> bool:
    cfg = ASSETS[name]
    out_path = OUTPUT_DIR / f"{name}.png"
    if out_path.exists() and not force:
        print(f"  {name}: skip (already at {out_path.relative_to(REPO_ROOT)})")
        return False

    payload = json.dumps({
        "model": model,
        "prompt": cfg["prompt"],
        "size": cfg["size"],
        "quality": cfg["quality"],
        "n": 1,
    }).encode()

    api_key = find_api_key()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    print(f"  {name}: generating ({cfg['size']}, {cfg['quality']})…", flush=True)
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"  {name}: FAIL HTTP {e.code} — {body[:200]}")
        return False

    item = data["data"][0]
    b64 = item.get("b64_json")
    if not b64:
        print(f"  {name}: FAIL no image in response — {json.dumps(data)[:200]}")
        return False

    out_path.write_bytes(base64.b64decode(b64))
    size_kb = out_path.stat().st_size // 1024
    print(f"  {name}: ok → {out_path.relative_to(REPO_ROOT)} ({size_kb}KB)")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("names", nargs="*", help="asset names to generate")
    parser.add_argument("--all", action="store_true", help="generate every missing asset")
    parser.add_argument("--force", action="store_true", help="regenerate even if file exists")
    parser.add_argument("--model", default="gpt-image-1", help="image model name")
    args = parser.parse_args()

    if not args.names and not args.all:
        print("Available assets:")
        for name in ASSETS:
            out_path = OUTPUT_DIR / f"{name}.png"
            mark = "✓" if out_path.exists() else " "
            print(f"  [{mark}] {name}")
        print("\nUsage: python3 scripts/generate-assets.py <name> [<name>...] [--force]")
        print("       python3 scripts/generate-assets.py --all")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    targets = list(ASSETS) if args.all else args.names
    unknown = [t for t in targets if t not in ASSETS]
    if unknown:
        sys.exit(f"unknown asset(s): {', '.join(unknown)}")

    print(f"Generating {len(targets)} asset(s) with {args.model}:")
    generated = sum(generate(t, args.model, args.force) for t in targets)
    print(f"\nDone. {generated} new file(s) written.")


if __name__ == "__main__":
    main()
