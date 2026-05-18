#!/usr/bin/env python3
"""
FARM TO TABLE — 1024x1024 poster.

Layout:
  - Warm sunset gradient (matches in-game bg)
  - HUGE "FARM TO TABLE" title (butcher-block red/orange)
  - Pig head sliced in half center — visible ham cross-section + bone
  - Cow / chicken / sheep / duck decoys around
  - "X3 MULTI" combo callout
  - White swipe trail through the pig
  - AlterU watermark
"""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(13)

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


def gradient_bg(size):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        k = y / max(h - 1, 1)
        if k < 0.4:
            kk = k / 0.4
            r = int(255 * (1 - kk) + 154 * kk)
            g = int(140 * (1 - kk) + 58 * kk)
            b = int(70 * (1 - kk) + 42 * kk)
        else:
            kk = (k - 0.4) / 0.6
            r = int(154 * (1 - kk) + 26 * kk)
            g = int(58 * (1 - kk) + 16 * kk)
            b = int(42 * (1 - kk) + 8 * kk)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img.convert("RGBA")


def draw_pig(d, cx, cy, r, fill='#ffc7c7', accent='#ff9aa6'):
    # Ears (behind head)
    d.ellipse([cx - r * 0.78, cy - r * 0.88, cx - r * 0.32, cy - r * 0.36], fill='#e8a0a0')
    d.ellipse([cx + r * 0.32, cy - r * 0.88, cx + r * 0.78, cy - r * 0.36], fill='#e8a0a0')
    # Head
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline='#5a3030', width=3)
    # Snout
    d.ellipse([cx - r * 0.5, cy + r * 0.05, cx + r * 0.5, cy + r * 0.55], fill=accent, outline='#a06070', width=2)
    # Nostrils
    d.ellipse([cx - r * 0.20, cy + r * 0.22, cx - r * 0.08, cy + r * 0.40], fill='#7a4040')
    d.ellipse([cx + r * 0.08, cy + r * 0.22, cx + r * 0.20, cy + r * 0.40], fill='#7a4040')
    # Eyes
    d.ellipse([cx - r * 0.40, cy - r * 0.30, cx - r * 0.20, cy - r * 0.10], fill='#1a1a1a')
    d.ellipse([cx + r * 0.20, cy - r * 0.30, cx + r * 0.40, cy - r * 0.10], fill='#1a1a1a')


def draw_cow(d, cx, cy, r):
    # Horns
    d.ellipse([cx - r * 0.7, cy - r * 1.0, cx - r * 0.5, cy - r * 0.6], fill='#a07a4a')
    d.ellipse([cx + r * 0.5, cy - r * 1.0, cx + r * 0.7, cy - r * 0.6], fill='#a07a4a')
    # Ears
    d.ellipse([cx - r * 1.05, cy - r * 0.65, cx - r * 0.55, cy - r * 0.2], fill='#d0c4c0')
    d.ellipse([cx + r * 0.55, cy - r * 0.65, cx + r * 1.05, cy - r * 0.2], fill='#d0c4c0')
    # Head
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#fafafa', outline='#5a3030', width=3)
    # Spots
    d.ellipse([cx - r * 0.6, cy - r * 0.6, cx - r * 0.15, cy - r * 0.15], fill='#1d1d1f')
    d.ellipse([cx + r * 0.25, cy - r * 0.05, cx + r * 0.65, cy + r * 0.35], fill='#1d1d1f')
    # Muzzle
    d.ellipse([cx - r * 0.45, cy + r * 0.1, cx + r * 0.45, cy + r * 0.55], fill='#f5c6c6', outline='#a07a7a', width=2)
    # Nostrils
    d.ellipse([cx - r * 0.20, cy + r * 0.28, cx - r * 0.08, cy + r * 0.42], fill='#5a3030')
    d.ellipse([cx + r * 0.08, cy + r * 0.28, cx + r * 0.20, cy + r * 0.42], fill='#5a3030')
    # Eyes
    d.ellipse([cx - r * 0.42, cy - r * 0.28, cx - r * 0.22, cy - r * 0.08], fill='#1a1a1a')
    d.ellipse([cx + r * 0.22, cy - r * 0.28, cx + r * 0.42, cy - r * 0.08], fill='#1a1a1a')


def draw_chicken(d, cx, cy, r):
    # Comb (red crest)
    for i, dx in enumerate([-0.2, 0, 0.2]):
        d.ellipse([cx + dx * r - r * 0.18, cy - r * 1.10,
                   cx + dx * r + r * 0.18, cy - r * 0.78], fill='#ff3a1a')
    # Head
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#ffe884', outline='#5a3030', width=3)
    # Beak
    d.polygon([(cx - r * 0.18, cy + r * 0.10),
               (cx + r * 0.18, cy + r * 0.10),
               (cx, cy + r * 0.55)], fill='#e0721a', outline='#5a3030')
    # Wattles
    d.ellipse([cx - r * 0.18, cy + r * 0.45, cx - r * 0.04, cy + r * 0.70], fill='#ff3a1a')
    d.ellipse([cx + r * 0.04, cy + r * 0.45, cx + r * 0.18, cy + r * 0.70], fill='#ff3a1a')
    # Eyes
    d.ellipse([cx - r * 0.45, cy - r * 0.30, cx - r * 0.22, cy - r * 0.08], fill='#1a1a1a')
    d.ellipse([cx + r * 0.22, cy - r * 0.30, cx + r * 0.45, cy - r * 0.08], fill='#1a1a1a')


def draw_sheep(d, cx, cy, r):
    # Fluffy bumps
    for ang in range(8):
        a = ang * math.pi / 4
        ox = cx + math.cos(a) * r * 0.7
        oy = cy + math.sin(a) * r * 0.7
        d.ellipse([ox - r * 0.42, oy - r * 0.42, ox + r * 0.42, oy + r * 0.42], fill='#fbf3df')
    d.ellipse([cx - r * 0.85, cy - r * 0.85, cx + r * 0.85, cy + r * 0.85], fill='#fbf3df')
    # Black face
    d.ellipse([cx - r * 0.32, cy - r * 0.3, cx + r * 0.32, cy + r * 0.5], fill='#1a1a1a')
    # Eye dots
    d.ellipse([cx - r * 0.15, cy - r * 0.05, cx - r * 0.05, cy + r * 0.05], fill='#fff')
    d.ellipse([cx + r * 0.05, cy - r * 0.05, cx + r * 0.15, cy + r * 0.05], fill='#fff')


def draw_pig_half(d, cx, cy, r, rot_deg, side):
    """A pig head clipped to one half, with thick ham cross-section visible."""
    pad = r * 2
    size = int(pad * 2)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    px, py = pad, pad
    # Draw pig at center
    draw_pig(pd, px, py, r)
    # Clip to upper half by erasing the lower half
    if side == 'l':
        pd.rectangle([0, py, size, size], fill=(0, 0, 0, 0))
    else:
        pd.rectangle([0, 0, size, py], fill=(0, 0, 0, 0))
    # Apply the clip via alpha — easier: paste only the half region into output
    # ...we already filled the unwanted half with transparent, but that erases the pig there.
    # However the eraser fill clears existing pixels too. Need composite trick.
    # Simpler: clip via mask after drawing.

    # Build alpha mask: cut visible half (above cut for 'l' = upper half visible)
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    if side == 'l':
        md.rectangle([0, 0, size, py], fill=255)
    else:
        md.rectangle([0, py, size, size], fill=255)

    # Reset layer + redraw with mask
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    draw_pig(pd, px, py, r)
    layer.putalpha(Image.eval(layer.split()[3], lambda a: 0) if False else layer.split()[3])  # noop
    # Apply mask manually
    masked = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    masked.paste(layer, (0, 0), mask)

    # Draw cut-face ellipse strip on top
    cd = ImageDraw.Draw(masked)
    sign = -1 if side == 'l' else 1
    rx, ry = int(r * 0.92), int(r * 0.38)
    # Outer fat ring (full ellipse-half at cut line)
    if side == 'l':
        cd.pieslice([px - rx, py - ry, px + rx, py + ry], 180, 360, fill='#ffd8e0')
    else:
        cd.pieslice([px - rx, py - ry, px + rx, py + ry], 0, 180, fill='#ffd8e0')
    # Flesh
    fleshRx, fleshRy = int(rx * 0.86), int(ry * 0.82)
    if side == 'l':
        cd.pieslice([px - fleshRx, py - fleshRy, px + fleshRx, py + fleshRy], 180, 360, fill='#e8506a')
    else:
        cd.pieslice([px - fleshRx, py - fleshRy, px + fleshRx, py + fleshRy], 0, 180, fill='#e8506a')
    # Bone
    boneRx, boneRy = int(fleshRx * 0.18), int(fleshRy * 0.34)
    bone_cy = py + sign * int(fleshRy * 0.5)
    cd.ellipse([px - boneRx, bone_cy - boneRy, px + boneRx, bone_cy + boneRy], fill='#fffaf2', outline='#7a2030', width=2)
    # Cut line at the surface
    cd.line([(px - rx, py), (px + rx, py)], fill=(0, 0, 0, 160), width=3)

    rotated = masked.rotate(rot_deg, resample=Image.BICUBIC, expand=True)
    return rotated, rotated.size


def main():
    bg = gradient_bg((W, H))

    d = ImageDraw.Draw(bg, "RGBA")

    # Decoys
    draw_cow(d,     180, 760, 80)
    draw_chicken(d, 870, 760, 70)
    draw_sheep(d,   100, 460, 70)
    draw_chicken(d, 920, 380, 60)  # smaller chicken top-right

    # Pig sliced — two halves
    left_half, lsize = draw_pig_half(None, 0, 0, 100, -20, 'l')
    right_half, rsize = draw_pig_half(None, 0, 0, 100, 20, 'r')
    cx, cy = 530, 580
    bg.alpha_composite(left_half,  (cx - lsize[0] // 2 - 60, cy - lsize[1] // 2 - 30))
    bg.alpha_composite(right_half, (cx - rsize[0] // 2 + 70, cy - rsize[1] // 2 + 20))

    # Pink juice splatter
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    for _ in range(20):
        a = random.random() * math.pi * 2
        dd = random.uniform(40, 220)
        x = cx + math.cos(a) * dd
        y = cy + math.sin(a) * dd - random.uniform(0, 50)
        rr = random.uniform(4, 16)
        for rrr in range(int(rr * 2), int(rr), -2):
            aa = int(40 * (1 - rrr / (rr * 2)))
            pd.ellipse([x - rrr, y - rrr, x + rrr, y + rrr], fill=(232, 80, 106, aa))
        pd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(232, 80, 106, 220))
    bg.alpha_composite(layer)

    # Swipe trail (white + red glow)
    trail = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(trail)
    pts = [(60, 460), (240, 540), (510, 560), (760, 500), (970, 410)]
    for width, color in [(72, (255, 90, 80, 30)),
                         (44, (255, 200, 140, 80)),
                         (24, (255, 255, 255, 200))]:
        for i in range(len(pts) - 1):
            td.line([pts[i], pts[i + 1]], fill=color, width=width)
    for i in range(len(pts) - 1):
        td.line([pts[i], pts[i + 1]], fill=(255, 255, 255, 255), width=8)
    bg.alpha_composite(trail.filter(ImageFilter.GaussianBlur(radius=1.2)))

    # Title
    title = "FARM TO TABLE"
    title_font = find_font(FONT_PATHS_BOLD, 130)
    bbox = d.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    tx = (W - tw) // 2
    ty = 90
    # Drop shadow (offset)
    d.text((tx + 4, ty + 8), title, font=title_font, fill=(70, 14, 8, 220))
    d.text((tx, ty + 4), title, font=title_font, fill=(184, 24, 24, 255))
    # Highlight (top half lighter)
    d.text((tx, ty), title, font=title_font, fill=(255, 226, 160, 255))
    # Outline-ish second pass for legibility
    d.text((tx, ty + 2), title, font=title_font, fill=(255, 138, 58, 255))

    # Tagline
    tag = "One swipe, straight to the plate."
    tag_font = find_font(FONT_PATHS_TAG, 38)
    bbox = d.textbbox((0, 0), tag, font=tag_font)
    txw = bbox[2] - bbox[0]
    d.text(((W - txw) // 2 + 2, 250 + 2), tag, font=tag_font, fill=(50, 14, 8, 220))
    d.text(((W - txw) // 2, 250), tag, font=tag_font, fill=(255, 240, 200, 240))

    # Combo callout
    big = find_font(FONT_PATHS_BOLD, 110)
    sub = find_font(FONT_PATHS_BOLD, 48)
    s = "×3"
    bbox = d.textbbox((0, 0), s, font=big)
    sw = bbox[2] - bbox[0]
    d.text((820 - sw // 2 + 6, 400 + 6), s, font=big, fill=(0, 0, 0, 220))
    d.text((820 - sw // 2, 400), s, font=big, fill=(255, 138, 58, 255))
    s2 = "MULTI"
    bbox2 = d.textbbox((0, 0), s2, font=sub)
    s2w = bbox2[2] - bbox2[0]
    d.text((820 - s2w // 2 + 2, 520 + 2), s2, font=sub, fill=(0, 0, 0, 200))
    d.text((820 - s2w // 2, 520), s2, font=sub, fill=(255, 220, 130, 240))

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
