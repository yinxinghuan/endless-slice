#!/usr/bin/env python3
"""
Endless Slice — 1024x1024 poster (Fruit-Ninja swipe edition).

Layout:
  - Warm gradient background w/ subtle vignette
  - Big "ENDLESS SLICE" title at top (must stay above bottom 1/3)
  - A tomato sliced in half mid-flight, juice splatter, by a big white swipe trail
  - A banana arcing up (uncut), a bomb in corner with sparkle
  - "×3 +30" callout on swipe
  - AlterU watermark bottom
"""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(7)

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(ROOT, "public/poster.png")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

W, H = 1024, 1024

FONT_PATHS_BOLD = [
    "/System/Library/Fonts/Supplemental/Impact.ttf",
    "/System/Library/Fonts/Avenir Next.ttc",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]
FONT_PATHS_TAG = [
    "/System/Library/Fonts/Supplemental/Avenir Next Condensed.ttc",
    "/System/Library/Fonts/Supplemental/Futura.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
]


def find_font(paths, size):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def vertical_gradient(size, top, bot):
    w, h = size
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        k = y / max(h - 1, 1)
        px[0, y] = (
            int(top[0] * (1 - k) + bot[0] * k),
            int(top[1] * (1 - k) + bot[1] * k),
            int(top[2] * (1 - k) + bot[2] * k),
        )
    return img.resize((w, h))


def draw_tomato_half(img, cx, cy, r, rot_deg, color_body, color_flesh, color_seed):
    """Draw a tomato half (semicircle) rotated."""
    # Render half on transparent layer then paste with rotation
    pad = int(r * 1.2)
    size = pad * 2
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    # Body half-disk (upper half in local coords)
    pd.pieslice([pad - r, pad - r, pad + r, pad + r], 180, 360, fill=color_body)
    # Flesh strip (semi-ellipse along cut)
    pd.chord([pad - int(r * 0.95), pad - int(r * 0.3), pad + int(r * 0.95), pad + int(r * 0.05)],
             0, 180, fill=color_flesh)
    # Seeds
    for i in range(5):
        sx = pad - int(r * 0.65) + i * int(r * 0.32)
        sy = pad - int(r * 0.06)
        pd.ellipse([sx - 4, sy - 6, sx + 4, sy + 6], fill=color_seed)
    # Edge shadow
    pd.arc([pad - r, pad - r, pad + r, pad + r], 180, 360, fill=(0, 0, 0, 80), width=3)
    layer = layer.rotate(rot_deg, resample=Image.BICUBIC)
    img.paste(layer, (cx - size // 2, cy - size // 2), layer)


def draw_banana(img, cx, cy, rot_deg):
    pad = 160
    size = pad * 2
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    pd.ellipse([pad - 130, pad - 40, pad + 130, pad + 40], fill=(245, 198, 58))
    pd.ellipse([pad - 124, pad - 12, pad + 124, pad + 36], fill=(255, 220, 120))
    pd.ellipse([pad - 134, pad - 4, pad - 118, pad + 16], fill=(122, 90, 24))
    pd.ellipse([pad + 118, pad - 4, pad + 134, pad + 16], fill=(122, 90, 24))
    layer = layer.rotate(rot_deg, resample=Image.BICUBIC)
    img.paste(layer, (cx - size // 2, cy - size // 2), layer)


def draw_bomb(img, cx, cy, r):
    pad = r + 40
    size = pad * 2
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    # Body
    pd.ellipse([pad - r, pad - r, pad + r, pad + r], fill=(28, 28, 32))
    # Highlight
    pd.ellipse([pad - int(r * 0.7), pad - int(r * 0.7), pad - int(r * 0.2), pad - int(r * 0.2)],
               fill=(70, 70, 76))
    # Fuse
    pd.line([(pad, pad - r + 4), (pad + 18, pad - r - 22)], fill=(138, 107, 58), width=5)
    # Spark glow
    for rr in range(18, 4, -3):
        a = int(50 * (1 - rr / 18))
        pd.ellipse([pad + 18 - rr, pad - r - 22 - rr, pad + 18 + rr, pad - r - 22 + rr],
                   fill=(255, 210, 74, a))
    pd.ellipse([pad + 13, pad - r - 27, pad + 23, pad - r - 17], fill=(255, 230, 130))
    img.paste(layer, (cx - size // 2, cy - size // 2), layer)


def draw_swipe_trail(img, points):
    """Big white glow swipe trail through provided control points."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Outer glow first (thick + low alpha)
    for width, alpha in [(64, 35), (40, 60), (24, 110), (12, 200)]:
        for i in range(len(points) - 1):
            od.line([points[i], points[i + 1]], fill=(255, 250, 220, alpha), width=width)
    # Bright core
    for i in range(len(points) - 1):
        od.line([points[i], points[i + 1]], fill=(255, 255, 255, 255), width=6)
    # Slight blur for soft glow
    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=1.2))
    img.alpha_composite(blurred)


def draw_juice_splatter(img, cx, cy, n, color):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    for _ in range(n):
        a = random.random() * math.pi * 2
        d = random.uniform(30, 200)
        x = cx + math.cos(a) * d
        y = cy + math.sin(a) * d - random.uniform(0, 40)
        r = random.uniform(4, 14)
        # Glow
        for rr in range(int(r * 2), int(r), -2):
            aa = int(30 * (1 - rr / (r * 2)))
            pd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color + (aa,))
        pd.ellipse([x - r, y - r, x + r, y + r], fill=color + (220,))
    img.alpha_composite(layer)


def main():
    bg = vertical_gradient((W, H), (74, 44, 26), (14, 8, 5)).convert("RGBA")

    # Banana arcing up (uncut)
    draw_banana(bg, 200, 720, -22)

    # Bomb corner
    draw_bomb(bg, 880, 820, 58)

    # Tomato halves
    cx, cy = 540, 580
    # Half A — flying up-left
    draw_tomato_half(bg, cx - 90, cy - 50, 110,
                     rot_deg=-25, color_body=(226, 59, 59),
                     color_flesh=(255, 154, 138), color_seed=(58, 168, 74))
    # Half B — flying down-right
    draw_tomato_half(bg, cx + 95, cy + 50, 110,
                     rot_deg=155, color_body=(226, 59, 59),
                     color_flesh=(255, 154, 138), color_seed=(58, 168, 74))

    # Juice splatter
    draw_juice_splatter(bg, cx, cy, 18, (255, 130, 120))

    # Swipe trail crossing through the tomato
    pts = [(60, 480), (260, 540), (cx - 30, cy + 5), (cx + 90, cy - 60), (760, 380), (980, 220)]
    draw_swipe_trail(bg, pts)

    d = ImageDraw.Draw(bg, "RGBA")

    # Title
    title = "ENDLESS SLICE"
    title_font = find_font(FONT_PATHS_BOLD, 160)
    bbox = d.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    tx = (W - tw) // 2
    ty = 80
    d.text((tx + 6, ty + 8), title, font=title_font, fill=(0, 0, 0, 220))
    d.text((tx, ty), title, font=title_font, fill=(255, 248, 200, 255))
    d.text((tx, ty + 4), title, font=title_font, fill=(255, 210, 74, 255))

    # Tagline
    tag = "Swipe to slice. Dodge the bombs."
    tag_font = find_font(FONT_PATHS_TAG, 38)
    bbox = d.textbbox((0, 0), tag, font=tag_font)
    txw = bbox[2] - bbox[0]
    d.text(((W - txw) // 2 + 2, 256), tag, font=tag_font, fill=(0, 0, 0, 200))
    d.text(((W - txw) // 2, 254), tag, font=tag_font, fill=(255, 240, 200, 230))

    # Combo callout
    big = find_font(FONT_PATHS_BOLD, 90)
    sub = find_font(FONT_PATHS_BOLD, 44)
    s = "×3"
    bbox = d.textbbox((0, 0), s, font=big)
    sw = bbox[2] - bbox[0]
    d.text((780 - sw // 2 + 4, 320 + 4), s, font=big, fill=(0, 0, 0, 200))
    d.text((780 - sw // 2, 320), s, font=big, fill=(255, 122, 60, 255))
    s2 = "+50"
    bbox2 = d.textbbox((0, 0), s2, font=sub)
    s2w = bbox2[2] - bbox2[0]
    d.text((780 - s2w // 2 + 2, 420 + 2), s2, font=sub, fill=(0, 0, 0, 200))
    d.text((780 - s2w // 2, 420), s2, font=sub, fill=(255, 255, 255, 240))

    # Watermark
    wm_font = find_font(FONT_PATHS_TAG, 26)
    wm = "AlterU"
    bbox = d.textbbox((0, 0), wm, font=wm_font)
    ww = bbox[2] - bbox[0]
    d.text((W - ww - 36, H - 60), wm, font=wm_font, fill=(255, 255, 255, 160))

    bg.convert("RGB").save(OUT_PATH, "PNG", optimize=True)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
