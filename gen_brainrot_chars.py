#!/usr/bin/env python3
"""
Generate 6 BRAIN ROT character sprites via wdabuliu txt2img + green-screen removal.

Output: src/EndlessSlice/img/sprites/{slug}.png (transparent background)

Each character:
  - Generated on a flat bright green background via prompt
  - Downloaded as webp, converted to png via sips
  - Green pixels removed globally (greenness = g - max(r, b) > threshold → alpha 0)
  - Auto-cropped to content bbox, resized to ~720px on the longer side

Rate limit: 78s between calls (75s server limit + buffer).
"""
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.request
import urllib.error

from PIL import Image

# ── Config ──────────────────────────────────────────────────────────────────

API_URL      = "http://aiservice.wdabuliu.com:8019/genl_image"
USER_ID      = 99988877        # number per online_image_api.md
API_TIMEOUT  = 360
RATE_LIMIT_S = 78

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "src/EndlessSlice/img/sprites")
os.makedirs(OUT_DIR, exist_ok=True)

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

# Common style suffix for every character — keeps look cohesive.
STYLE = (
    "3D rendered cartoon character in the viral Italian brain rot AI meme aesthetic, "
    "plasticky 3D shading, oversaturated colors, surreal absurd creature design, "
    "full body centered facing forward, standing pose, "
    "solid flat bright green background #00FF00, green screen background, "
    "no ground shadow, no text, no watermark"
)

CHARACTERS = [
    {
        "slug": "tralalero",
        "label": "Tralalero Tralala",
        "prompt": (
            "blue shark with three human legs wearing oversized white Nike sneakers, "
            "open mouth with white teeth, googly cartoon eyes, balanced on three feet"
        ),
    },
    {
        "slug": "tung",
        "label": "Tung Tung Sahur",
        "prompt": (
            "anthropomorphic wooden log creature with a long skinny brown trunk body, "
            "cartoon face on the upper trunk with two googly eyes and a wide grimace, "
            "holding a small wooden baseball bat in stick-thin arms"
        ),
    },
    {
        "slug": "lirili",
        "label": "Lirili Larila",
        "prompt": (
            "green cactus with elephant head fused on top, long elephant trunk hanging down, "
            "pink elephant ears flopping, small cartoon eyes, succulent spiky body, "
            "wearing tiny sandals on stubby cactus feet"
        ),
    },
    {
        "slug": "patapim",
        "label": "Brrr Brrr Patapim",
        "prompt": (
            "anthropomorphic tree trunk with cartoon monkey face on top, "
            "two thick brown wooden legs as roots, googly cartoon eyes, "
            "small monkey nose, green leaves sprouting from head"
        ),
    },
    {
        "slug": "cappuccino",
        "label": "Cappuccino Assassino",
        "prompt": (
            "anthropomorphic cappuccino coffee cup with a frothy foam swirl on top, "
            "ninja arms holding two crossed silver katana swords, "
            "stick legs in tiny black ninja boots, cartoon eyes peeking over the cup rim"
        ),
    },
    {
        "slug": "bombardiro",
        "label": "Bombardiro Crocodilo",
        "prompt": (
            "military green crocodile head fused with a bomber airplane fuselage, "
            "wide airplane wings, propellers, military bomb shape body, "
            "cartoon eyes, sharp white crocodile teeth, mid-flight pose"
        ),
    },
]


# ── API call ─────────────────────────────────────────────────────────────────

def call_api(prompt: str) -> str:
    full_prompt = f"{prompt}, {STYLE}"
    payload = json.dumps({
        "query": "",
        "params": {
            "prompt": full_prompt,
            "user_id": USER_ID,
        },
    }).encode()
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
            result = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"HTTP {e.code} — {body}")

    code = result.get("code")
    if code == 200:
        return result["url"]
    raise RuntimeError(f"code={code}, msg={result.get('msg')}")


def download_to_png(url: str, out_path: str) -> None:
    """Download the result (may be .webp) and save as PNG."""
    src_ext = os.path.splitext(url.split("?")[0])[1].lower() or ".webp"
    tmp = out_path + src_ext
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60, context=_SSL_CTX) as resp:
        data = resp.read()
    with open(tmp, "wb") as f:
        f.write(data)
    if src_ext != ".png":
        subprocess.run(["sips", "-s", "format", "png", tmp, "--out", out_path],
                       check=True, capture_output=True)
        os.remove(tmp)
    else:
        os.rename(tmp, out_path)


# ── Green-screen removal ────────────────────────────────────────────────────

def strip_green(in_path: str, out_path: str, threshold: int = 28) -> None:
    """Remove green-screen background; output transparent PNG cropped to content."""
    img = Image.open(in_path).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            green_excess = g - max(r, b)
            if green_excess > threshold:
                # Fully green pixel — drop
                px[x, y] = (r, g, b, 0)
            elif green_excess > 12:
                # Edge pixel — partial alpha + desaturate green
                blend = (green_excess - 12) / (threshold - 12)
                new_g = int(g - (g - max(r, b)) * blend)
                new_a = int(a * (1 - blend))
                px[x, y] = (r, new_g, b, new_a)

    # Crop to non-transparent bbox
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # Downscale longer side to 720
    longer = max(img.size)
    if longer > 720:
        s = 720 / longer
        img = img.resize((int(img.size[0] * s), int(img.size[1] * s)), Image.LANCZOS)

    img.save(out_path, "PNG", optimize=True)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    skip_existing = "--force" not in sys.argv
    for i, char in enumerate(CHARACTERS):
        slug, prompt = char["slug"], char["prompt"]
        out_path = os.path.join(OUT_DIR, f"{slug}.png")
        raw_path = os.path.join(OUT_DIR, f"{slug}_raw.png")

        if skip_existing and os.path.exists(out_path):
            print(f"[{i+1}/{len(CHARACTERS)}] {slug}: already exists, skipping (use --force to regen)")
            continue

        print(f"\n[{i+1}/{len(CHARACTERS)}] Generating {char['label']}…")
        print(f"  prompt: {prompt[:100]}…")

        # Generate w/ rate-limit retry
        url = None
        for attempt in range(3):
            try:
                url = call_api(prompt)
                break
            except RuntimeError as e:
                msg = str(e)
                print(f"  retry ({attempt+1}): {msg[:120]}")
                if "code=100" in msg or "code=429" in msg or "rate" in msg.lower():
                    print(f"  waiting {RATE_LIMIT_S}s…")
                    time.sleep(RATE_LIMIT_S)
                else:
                    raise
        if not url:
            print(f"  ✗ failed for {slug}")
            continue

        print(f"  ✓ generated: {url}")
        download_to_png(url, raw_path)
        print(f"  ✓ downloaded → {raw_path}")

        strip_green(raw_path, out_path)
        size_kb = os.path.getsize(out_path) // 1024
        print(f"  ✓ stripped green → {out_path}  ({size_kb} KB)")

        # Rate limit before next call
        if i < len(CHARACTERS) - 1:
            print(f"  ⏳ sleeping {RATE_LIMIT_S}s for rate limit…")
            time.sleep(RATE_LIMIT_S)

    print("\nDone.")


if __name__ == "__main__":
    main()
