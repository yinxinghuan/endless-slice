#!/usr/bin/env python3
"""
FARM TO TABLE — 1024x1024 circus poster.

Layout:
  - Red tent fabric (vertical stripes) + gold scallop valance
  - Stacked title "THE GREATEST / FARM / to / TABLE / SHOW ON EARTH"
  - Big pig sliced in half center-stage, blood splatter + swipe trail
  - Puppy with PET badge in corner (the "don't slice this!" hook)
  - Cow + chicken decoys in background
  - "×4 MULTI" combo callout
  - AlterU watermark
"""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(17)

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(ROOT, "public/poster.png")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
W, H = 1024, 1024

FONT_BOLD = [
    "/Library/Fonts/Rye-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Impact.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]
FONT_ITALIC = [
    "/System/Library/Fonts/Supplemental/Bodoni 72.ttc",
    "/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]
FONT_TAG = [
    "/System/Library/Fonts/Supplemental/Avenir Next Condensed.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
]

CREAM = (245, 232, 200)
GOLD  = (255, 210, 74)
BLOOD = (184, 24, 24)
BLOOD_DK = (74, 14, 8)
INK   = (26, 10, 5)


def find_font(paths, size):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def tent_background(size):
    w, h = size
    img = Image.new("RGB", size, (88, 16, 16))
    d = ImageDraw.Draw(img)
    stripeW = 78
    # Alternating bright stripe
    for x in range(-stripeW, w + stripeW, stripeW * 2):
        d.rectangle([x, 0, x + stripeW, h], fill=(122, 24, 24))
    # Seam shadows
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(-stripeW, w + stripeW, stripeW * 2):
        od.rectangle([x, 0, x + 2, h], fill=(26, 6, 6, 80))
        od.rectangle([x + stripeW - 2, 0, x + stripeW, h], fill=(26, 6, 6, 80))
    img = img.convert("RGBA")
    img.alpha_composite(overlay)
    return img


def add_valance(img, valanceH=120):
    """Gold scallop valance at top."""
    w, _ = img.size
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Gold band
    for y in range(int(valanceH * 0.4)):
        t = y / max(int(valanceH * 0.4) - 1, 1)
        c = (
            int(255 * (1 - t) + 202 * t),
            int(226 * (1 - t) + 160 * t),
            int(122 * (1 - t) + 40 * t),
            255,
        )
        d.line([(0, y), (w, y)], fill=c)
    # Scallops along the bottom edge
    scallopR = int(valanceH * 0.5)
    scallopGap = int(scallopR * 1.55)
    yBot = int(valanceH * 0.4)
    for x in range(int(scallopR * 0.6), w + scallopR, scallopGap):
        d.pieslice([x - scallopR, yBot - scallopR, x + scallopR, yBot + scallopR],
                   0, 180, fill=(202, 160, 40))
    # Cream lining under valance
    d.rectangle([0, int(valanceH * 0.40), w, int(valanceH * 0.40) + 6], fill=CREAM)
    # Tassels (gold drops)
    for x in range(int(scallopR * 0.6) + scallopR, w, scallopGap):
        d.ellipse([x - 10, yBot + scallopR - 8, x + 10, yBot + scallopR + 12],
                  fill=(202, 160, 40))
    img.alpha_composite(layer)


def draw_pig_full(d, cx, cy, r):
    """A simplified standing pig — body + 4 legs + head with snout."""
    # Tail (curly)
    d.line([(cx - r * 0.95, cy - r * 0.1),
            (cx - r * 1.10, cy - r * 0.32),
            (cx - r * 0.85, cy - r * 0.10)], fill=(232, 156, 174), width=int(r * 0.10))
    # Legs
    for lx in [-0.55, -0.20, 0.20, 0.55]:
        d.rounded_rectangle(
            [cx + lx * r - r * 0.10, cy + r * 0.30,
             cx + lx * r + r * 0.10, cy + r * 0.70],
            radius=int(r * 0.06), fill=(232, 156, 174))
    # Body
    d.ellipse([cx - r * 0.95, cy - r * 0.55, cx + r * 0.95, cy + r * 0.55],
              fill=(255, 199, 199), outline=(90, 48, 48), width=3)
    # Head
    hx, hy = cx + r * 0.78, cy - r * 0.15
    d.ellipse([hx - r * 0.40, hy - r * 0.36, hx + r * 0.40, hy + r * 0.36],
              fill=(255, 199, 199), outline=(90, 48, 48), width=3)
    # Snout
    d.ellipse([hx + r * 0.04, hy - r * 0.06, hx + r * 0.40, hy + r * 0.22],
              fill=(255, 154, 166), outline=(166, 96, 112), width=2)
    # Nostrils
    d.ellipse([hx + r * 0.16, hy + r * 0.04, hx + r * 0.22, hy + r * 0.14], fill=(110, 64, 74))
    d.ellipse([hx + r * 0.24, hy + r * 0.04, hx + r * 0.30, hy + r * 0.14], fill=(110, 64, 74))
    # Eye
    d.ellipse([hx + r * 0.06, hy - r * 0.20, hx + r * 0.14, hy - r * 0.10], fill=INK)


def draw_pig_half(cx, cy, r, rot_deg, side):
    """A pig clipped to one half + visible ham cross-section. Returns (Image, anchor)."""
    pad = int(r * 2.0)
    size = pad * 2
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(base)
    draw_pig_full(pd, pad, pad, r)
    # Mask: keep only upper or lower half
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    if side == "l":
        md.rectangle([0, 0, size, pad], fill=255)
    else:
        md.rectangle([0, pad, size, size], fill=255)
    half = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    half.paste(base, (0, 0), mask)
    # Cut face — thick ellipse along the cut line
    cd = ImageDraw.Draw(half)
    rx, ry = int(r * 1.05), int(r * 0.38)
    sign = -1 if side == "l" else 1
    if side == "l":
        cd.pieslice([pad - rx, pad - ry, pad + rx, pad + ry], 180, 360, fill=(255, 216, 224))
    else:
        cd.pieslice([pad - rx, pad - ry, pad + rx, pad + ry], 0, 180, fill=(255, 216, 224))
    fRx, fRy = int(rx * 0.86), int(ry * 0.82)
    if side == "l":
        cd.pieslice([pad - fRx, pad - fRy, pad + fRx, pad + fRy], 180, 360, fill=(232, 80, 106))
    else:
        cd.pieslice([pad - fRx, pad - fRy, pad + fRx, pad + fRy], 0, 180, fill=(232, 80, 106))
    # Bone
    bone_cy = pad + sign * int(fRy * 0.5)
    boneRx, boneRy = int(fRx * 0.18), int(fRy * 0.34)
    cd.ellipse([pad - boneRx, bone_cy - boneRy, pad + boneRx, bone_cy + boneRy],
               fill=(255, 250, 242), outline=(140, 36, 50), width=2)
    cd.line([(pad - rx, pad), (pad + rx, pad)], fill=(0, 0, 0, 160), width=3)
    rotated = half.rotate(rot_deg, resample=Image.BICUBIC, expand=True)
    return rotated


def draw_puppy(d, cx, cy, r):
    """Simplified golden retriever puppy."""
    # Tail
    d.ellipse([cx - r * 0.95, cy - r * 0.25, cx - r * 0.75, cy + r * 0.10], fill=(240, 200, 120))
    # Legs
    for lx in [-0.45, -0.20, 0.20, 0.50]:
        d.rounded_rectangle(
            [cx + lx * r - r * 0.10, cy + r * 0.30,
             cx + lx * r + r * 0.10, cy + r * 0.65],
            radius=int(r * 0.05), fill=(220, 180, 100))
    # Body
    d.ellipse([cx - r * 0.85, cy - r * 0.45, cx + r * 0.85, cy + r * 0.45],
              fill=(240, 200, 120), outline=(120, 80, 40), width=2)
    # Head
    hx, hy = cx + r * 0.75, cy - r * 0.20
    d.ellipse([hx - r * 0.42, hy - r * 0.40, hx + r * 0.42, hy + r * 0.40],
              fill=(240, 200, 120), outline=(120, 80, 40), width=2)
    # Floppy ears (darker)
    d.ellipse([hx - r * 0.42, hy - r * 0.22, hx - r * 0.10, hy + r * 0.20], fill=(156, 84, 24))
    d.ellipse([hx + r * 0.10, hy - r * 0.22, hx + r * 0.42, hy + r * 0.20], fill=(156, 84, 24))
    # Muzzle (lighter patch)
    d.ellipse([hx - r * 0.12, hy + r * 0.00, hx + r * 0.32, hy + r * 0.32],
              fill=(255, 226, 168))
    # Tongue
    d.ellipse([hx + r * 0.10, hy + r * 0.18, hx + r * 0.26, hy + r * 0.36],
              fill=(255, 107, 142))
    # Nose
    d.ellipse([hx + r * 0.18, hy + r * 0.02, hx + r * 0.28, hy + r * 0.12], fill=INK)
    # Eyes
    d.ellipse([hx - r * 0.10, hy - r * 0.10, hx, hy], fill=INK)
    d.ellipse([hx + r * 0.14, hy - r * 0.10, hx + r * 0.24, hy], fill=INK)
    # Blue collar
    d.ellipse([hx - r * 0.30, hy + r * 0.28, hx + r * 0.10, hy + r * 0.42],
              fill=(58, 160, 255), outline=(22, 112, 208), width=2)


def draw_cow_simple(d, cx, cy, r):
    """Simple full-body cow."""
    for lx in [-0.50, -0.20, 0.20, 0.50]:
        d.rounded_rectangle(
            [cx + lx * r - r * 0.10, cy + r * 0.30,
             cx + lx * r + r * 0.10, cy + r * 0.70],
            radius=int(r * 0.05), fill=(240, 214, 192))
    d.ellipse([cx - r * 0.95, cy - r * 0.55, cx + r * 0.95, cy + r * 0.55],
              fill=(250, 250, 250), outline=(90, 48, 48), width=3)
    d.ellipse([cx - r * 0.45, cy - r * 0.30, cx - r * 0.05, cy + r * 0.05],
              fill=(29, 29, 31))
    d.ellipse([cx + r * 0.15, cy + r * 0.00, cx + r * 0.50, cy + r * 0.35],
              fill=(29, 29, 31))
    # Head
    hx, hy = cx + r * 0.78, cy - r * 0.15
    d.ellipse([hx - r * 0.38, hy - r * 0.34, hx + r * 0.38, hy + r * 0.34],
              fill=(250, 250, 250), outline=(90, 48, 48), width=3)
    d.rectangle([hx - r * 0.55, hy - r * 0.65, hx - r * 0.45, hy - r * 0.50], fill=(160, 122, 74))
    d.rectangle([hx + r * 0.45, hy - r * 0.65, hx + r * 0.55, hy - r * 0.50], fill=(160, 122, 74))
    d.ellipse([hx + r * 0.04, hy + r * 0.00, hx + r * 0.36, hy + r * 0.24], fill=(245, 198, 198))
    d.ellipse([hx + r * 0.06, hy - r * 0.20, hx + r * 0.14, hy - r * 0.10], fill=INK)


def draw_chicken_simple(d, cx, cy, r):
    """Simple full-body chicken."""
    # Comb
    d.ellipse([cx - r * 0.32, cy - r * 0.95, cx - r * 0.04, cy - r * 0.65], fill=(255, 58, 26))
    d.ellipse([cx - r * 0.10, cy - r * 1.05, cx + r * 0.18, cy - r * 0.70], fill=(255, 58, 26))
    d.ellipse([cx + r * 0.14, cy - r * 0.95, cx + r * 0.42, cy - r * 0.65], fill=(255, 58, 26))
    # Body
    d.ellipse([cx - r * 0.65, cy - r * 0.40, cx + r * 0.65, cy + r * 0.55],
              fill=(255, 232, 132), outline=(90, 48, 48), width=3)
    # Tail feathers
    d.ellipse([cx - r * 0.95, cy - r * 0.30, cx - r * 0.50, cy + r * 0.20],
              fill=(202, 168, 72))
    # Head
    d.ellipse([cx - r * 0.10, cy - r * 0.78, cx + r * 0.38, cy - r * 0.40],
              fill=(255, 232, 132), outline=(90, 48, 48), width=3)
    # Beak
    d.polygon([(cx + r * 0.30, cy - r * 0.62),
               (cx + r * 0.55, cy - r * 0.55),
               (cx + r * 0.30, cy - r * 0.48)], fill=(224, 114, 26))
    # Eye
    d.ellipse([cx + r * 0.10, cy - r * 0.70, cx + r * 0.16, cy - r * 0.62], fill=INK)
    # Legs
    d.rectangle([cx - r * 0.10, cy + r * 0.45, cx - r * 0.06, cy + r * 0.80], fill=(224, 114, 26))
    d.rectangle([cx + r * 0.10, cy + r * 0.45, cx + r * 0.14, cy + r * 0.80], fill=(224, 114, 26))


def draw_swipe_trail(img, points):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for width, color in [(70, (255, 100, 80, 30)),
                         (44, (255, 200, 140, 80)),
                         (24, (255, 255, 255, 200))]:
        for i in range(len(points) - 1):
            od.line([points[i], points[i + 1]], fill=color, width=width)
    for i in range(len(points) - 1):
        od.line([points[i], points[i + 1]], fill=(255, 255, 255, 255), width=8)
    img.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(radius=1.4)))


def blood_splatter(img, cx, cy, n, color):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    for _ in range(n):
        a = random.random() * math.pi * 2
        d = random.uniform(40, 240)
        x = cx + math.cos(a) * d
        y = cy + math.sin(a) * d - random.uniform(0, 50)
        r = random.uniform(5, 17)
        for rr in range(int(r * 2), int(r), -2):
            aa = int(30 * (1 - rr / (r * 2)))
            pd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color + (aa,))
        pd.ellipse([x - r, y - r, x + r, y + r], fill=color + (220,))
    img.alpha_composite(layer)


def draw_pet_badge(d, cx, cy, r):
    """Big PET badge — heart with cleaver-slash inside cream disc."""
    # Glow
    for rr in range(int(r * 1.5), int(r), -3):
        a = int(30 * (1 - rr / (r * 1.5)))
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(255, 110, 170, a))
    # Disc
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 245, 232),
              outline=(255, 58, 122), width=4)
    d.ellipse([cx - int(r * 0.9), cy - int(r * 0.9), cx + int(r * 0.9), cy + int(r * 0.9)],
              outline=GOLD, width=2)
    # Heart
    hr = int(r * 0.55)
    d.ellipse([cx - hr, cy - int(hr * 0.45), cx, cy + int(hr * 0.3)], fill=(255, 42, 114))
    d.ellipse([cx, cy - int(hr * 0.45), cx + hr, cy + int(hr * 0.3)], fill=(255, 42, 114))
    d.polygon([(cx - hr * 0.95, cy + int(hr * 0.05)),
               (cx + hr * 0.95, cy + int(hr * 0.05)),
               (cx, cy + int(hr * 0.85))], fill=(255, 42, 114))
    # Slash
    # diagonal red bar through heart
    line_w = int(r * 0.20)
    dx, dy = r * 0.85, r * 0.85
    d.line([(cx - dx, cy + dy), (cx + dx, cy - dy)],
           fill=(184, 24, 24), width=line_w)
    d.line([(cx - dx, cy + dy), (cx + dx, cy - dy)],
           fill=(255, 245, 232), width=4)


def stroked_text(d, text, x, y, font, fill, stroke=INK, stroke_w=3):
    """Text with thick stroke outline."""
    for dx in range(-stroke_w, stroke_w + 1):
        for dy in range(-stroke_w, stroke_w + 1):
            if dx == 0 and dy == 0:
                continue
            d.text((x + dx, y + dy), text, font=font, fill=stroke)
    d.text((x, y), text, font=font, fill=fill)


def main():
    bg = tent_background((W, H))
    add_valance(bg)

    # Background decoys
    draw_cow_simple(ImageDraw.Draw(bg), 200, 760, 95)
    draw_chicken_simple(ImageDraw.Draw(bg), 920, 760, 75)

    # Pig sliced — two halves splayed apart, blood splat between
    cx, cy = 540, 600
    left = draw_pig_half(0, 0, 130, -20, "l")
    right = draw_pig_half(0, 0, 130, 18, "r")
    bg.alpha_composite(left, (cx - left.width // 2 - 70, cy - left.height // 2 - 30))
    bg.alpha_composite(right, (cx - right.width // 2 + 70, cy - right.height // 2 + 30))
    blood_splatter(bg, cx, cy, 26, (232, 80, 106))

    # Swipe trail across the kill
    pts = [(50, 460), (260, 560), (520, 580), (760, 520), (980, 420)]
    draw_swipe_trail(bg, pts)

    # PUPPY with PET badge — bottom-right corner showing what NOT to slice
    pup_cx, pup_cy = 870, 410
    draw_puppy(ImageDraw.Draw(bg), pup_cx, pup_cy, 56)
    draw_pet_badge(ImageDraw.Draw(bg), pup_cx + 60, pup_cy - 80, 42)

    d = ImageDraw.Draw(bg, "RGBA")

    # ── Title block ──
    # "THE GREATEST" subtitle
    sub_font = find_font(FONT_ITALIC, 36)
    sub_text = "— THE GREATEST —"
    bbox = d.textbbox((0, 0), sub_text, font=sub_font)
    tw = bbox[2] - bbox[0]
    stroked_text(d, sub_text, (W - tw) // 2, 145, sub_font, fill=CREAM, stroke=BLOOD_DK, stroke_w=2)

    # FARM (huge slab serif)
    rye_big = find_font(FONT_BOLD, 152)
    farm_text = "FARM"
    bbox = d.textbbox((0, 0), farm_text, font=rye_big)
    fw = bbox[2] - bbox[0]
    fx = (W - fw) // 2
    fy = 188
    # Drop-shadow stack for poster depth
    d.text((fx + 5, fy + 6), farm_text, font=rye_big, fill=(50, 8, 8, 255))
    stroked_text(d, farm_text, fx, fy, rye_big, fill=CREAM, stroke=BLOOD_DK, stroke_w=4)

    # "to" tiny italic
    to_font = find_font(FONT_ITALIC, 50)
    to_text = "to"
    bbox = d.textbbox((0, 0), to_text, font=to_font)
    tow = bbox[2] - bbox[0]
    stroked_text(d, to_text, (W - tow) // 2, 350, to_font, fill=CREAM, stroke=BLOOD_DK, stroke_w=2)

    # TABLE (huge slab serif)
    table_text = "TABLE"
    bbox = d.textbbox((0, 0), table_text, font=rye_big)
    tabw = bbox[2] - bbox[0]
    tabx = (W - tabw) // 2
    taby = 408
    d.text((tabx + 5, taby + 6), table_text, font=rye_big, fill=(50, 8, 8, 255))
    stroked_text(d, table_text, tabx, taby, rye_big, fill=CREAM, stroke=BLOOD_DK, stroke_w=4)

    # Combo callout to the right
    big = find_font(FONT_BOLD, 100)
    sub = find_font(FONT_BOLD, 44)
    s = "×4"
    bbox = d.textbbox((0, 0), s, font=big)
    sw = bbox[2] - bbox[0]
    stroked_text(d, s, 840 - sw // 2, 360, big, fill=GOLD, stroke=BLOOD_DK, stroke_w=4)
    s2 = "MULTI!"
    bbox2 = d.textbbox((0, 0), s2, font=sub)
    s2w = bbox2[2] - bbox2[0]
    stroked_text(d, s2, 840 - s2w // 2, 470, sub, fill=CREAM, stroke=BLOOD_DK, stroke_w=3)

    # AlterU watermark
    wm_font = find_font(FONT_TAG, 26)
    wm = "AlterU"
    bbox = d.textbbox((0, 0), wm, font=wm_font)
    ww = bbox[2] - bbox[0]
    d.text((W - ww - 36, H - 56), wm, font=wm_font, fill=(255, 255, 255, 200))

    bg.convert("RGB").save(OUT_PATH, "PNG", optimize=True)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
