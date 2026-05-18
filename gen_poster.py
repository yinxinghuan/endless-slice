#!/usr/bin/env python3
"""
BRAIN ROT — 1024x1024 poster.

Layout:
  - Magenta → purple gradient background with glow
  - HUGE "BRAIN ROT" title at top (chromatic aberration)
  - Tralalero (sliced halves) in the middle with juice splat
  - Tung + Patapim flying around (uncut)
  - Bombardiro lurking in corner
  - Big white swipe trail arcing through tralalero
  - "×4" combo callout
  - AlterU watermark
"""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(11)

ROOT = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(ROOT, "src/EndlessSlice/img/sprites")
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


def radial_bg(size):
    w, h = size
    img = Image.new("RGB", size, (12, 11, 28))
    px = img.load()
    cx, cy = w * 0.45, h * 0.4
    rmax = max(w, h) * 0.95
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / rmax
            d = min(1, d)
            if d < 0.4:
                k = d / 0.4
                r = int(180 * (1 - k) + 90 * k)
                g = int(70 * (1 - k) + 50 * k)
                b = int(130 * (1 - k) + 110 * k)
            else:
                k = (d - 0.4) / 0.6
                r = int(90 * (1 - k) + 12 * k)
                g = int(50 * (1 - k) + 11 * k)
                b = int(110 * (1 - k) + 28 * k)
            px[x, y] = (r, g, b)
    return img.convert("RGBA")


def load_sprite(slug):
    p = os.path.join(SPRITES, f"{slug}.png")
    return Image.open(p).convert("RGBA")


def place(canvas, sprite, cx, cy, size, rot=0):
    s = sprite.copy()
    longer = max(s.size)
    if longer != size:
        ratio = size / longer
        s = s.resize((int(s.size[0] * ratio), int(s.size[1] * ratio)), Image.LANCZOS)
    if rot:
        s = s.rotate(rot, resample=Image.BICUBIC, expand=True)
    w, h = s.size
    canvas.alpha_composite(s, (cx - w // 2, cy - h // 2))


def place_half(canvas, sprite, cx, cy, size, rot, side):
    """Crop sprite to one half (left/right of vertical centerline before rotation), then rotate."""
    s = sprite.copy()
    longer = max(s.size)
    if longer != size:
        ratio = size / longer
        s = s.resize((int(s.size[0] * ratio), int(s.size[1] * ratio)), Image.LANCZOS)
    w, h = s.size
    if side == 'l':
        s = s.crop((0, 0, w // 2, h))
    else:
        s = s.crop((w // 2, 0, w, h))
    if rot:
        s = s.rotate(rot, resample=Image.BICUBIC, expand=True)
    ww, hh = s.size
    canvas.alpha_composite(s, (cx - ww // 2, cy - hh // 2))


def draw_swipe_trail(img, points):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Outer magenta glow
    for width, color in [(70, (255, 60, 200, 30)),
                         (44, (255, 100, 200, 70)),
                         (24, (255, 220, 130, 200))]:
        for i in range(len(points) - 1):
            od.line([points[i], points[i + 1]], fill=color, width=width)
    # Bright white core
    for i in range(len(points) - 1):
        od.line([points[i], points[i + 1]], fill=(255, 255, 255, 255), width=8)
    img.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(radius=1.2)))


def draw_juice_splatter(img, cx, cy, n, color):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    for _ in range(n):
        a = random.random() * math.pi * 2
        d = random.uniform(40, 230)
        x = cx + math.cos(a) * d
        y = cy + math.sin(a) * d - random.uniform(0, 50)
        r = random.uniform(5, 18)
        for rr in range(int(r * 2), int(r), -2):
            aa = int(30 * (1 - rr / (r * 2)))
            pd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color + (aa,))
        pd.ellipse([x - r, y - r, x + r, y + r], fill=color + (220,))
    img.alpha_composite(layer)


def main():
    bg = radial_bg((W, H))

    # Load sprites
    tralalero = load_sprite("tralalero")
    tung      = load_sprite("tung")
    patapim   = load_sprite("patapim")
    bombardiro = load_sprite("bombardiro")
    cappuccino = load_sprite("cappuccino")

    # Decoy characters scattered (uncut, in mid-flight)
    place(bg, tung, 200, 760, 220, rot=-18)
    place(bg, patapim, 850, 760, 220, rot=22)
    place(bg, bombardiro, 880, 360, 180, rot=-12)
    place(bg, cappuccino, 130, 410, 170, rot=14)

    # Tralalero — two halves splayed apart at center
    place_half(bg, tralalero, 460, 560, 360, rot=-22, side='l')
    place_half(bg, tralalero, 600, 580, 360, rot=22,  side='r')

    # Juice splat (blue, shark blood)
    draw_juice_splatter(bg, 530, 580, 22, (90, 180, 220))

    # Swipe trail crossing through the cut zone
    pts = [(60, 460), (260, 540), (510, 560), (720, 500), (940, 420)]
    draw_swipe_trail(bg, pts)

    d = ImageDraw.Draw(bg, "RGBA")

    # Title — BRAIN ROT with chromatic aberration
    title = "BRAIN ROT"
    title_font = find_font(FONT_PATHS_BOLD, 200)
    bbox = d.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    tx = (W - tw) // 2
    ty = 70
    # Chromatic offsets
    d.text((tx - 8, ty), title, font=title_font, fill=(80, 230, 255, 200))   # cyan
    d.text((tx + 8, ty), title, font=title_font, fill=(255, 80, 200, 200))   # magenta
    d.text((tx + 4, ty + 8), title, font=title_font, fill=(0, 0, 0, 220))    # dark shadow
    d.text((tx, ty), title, font=title_font, fill=(255, 255, 255, 255))      # white core

    # Tagline
    tag = "Swipe to slash the AI rot."
    tag_font = find_font(FONT_PATHS_TAG, 38)
    bbox = d.textbbox((0, 0), tag, font=tag_font)
    txw = bbox[2] - bbox[0]
    d.text(((W - txw) // 2 + 2, 300 + 2), tag, font=tag_font, fill=(0, 0, 0, 200))
    d.text(((W - txw) // 2, 300), tag, font=tag_font, fill=(255, 240, 200, 240))

    # Combo callout near the top-right of the swipe
    big = find_font(FONT_PATHS_BOLD, 120)
    sub = find_font(FONT_PATHS_BOLD, 52)
    s = "×4"
    bbox = d.textbbox((0, 0), s, font=big)
    sw = bbox[2] - bbox[0]
    d.text((830 - sw // 2 + 6, 410 + 6), s, font=big, fill=(0, 0, 0, 220))
    d.text((830 - sw // 2, 410), s, font=big, fill=(255, 122, 60, 255))
    s2 = "MULTI"
    bbox2 = d.textbbox((0, 0), s2, font=sub)
    s2w = bbox2[2] - bbox2[0]
    d.text((830 - s2w // 2 + 2, 540 + 2), s2, font=sub, fill=(0, 0, 0, 200))
    d.text((830 - s2w // 2, 540), s2, font=sub, fill=(255, 220, 130, 240))

    # Watermark
    wm_font = find_font(FONT_PATHS_TAG, 28)
    wm = "AlterU"
    bbox = d.textbbox((0, 0), wm, font=wm_font)
    ww = bbox[2] - bbox[0]
    d.text((W - ww - 36, H - 60), wm, font=wm_font, fill=(255, 255, 255, 160))

    bg.convert("RGB").save(OUT_PATH, "PNG", optimize=True)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
