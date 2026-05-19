#!/usr/bin/env python3
"""
FARM TO TABLE — 1024x1024 minimal circus poster.

Layout:
  - Red tent fabric (vertical stripes) + gold scallop valance
  - Stacked title in Rye slab serif (matches the in-game canvas title)
  - Single pig sliced into halves dead-center with blood splatter
  - Swipe trail through the kill
  - AlterU watermark
"""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(23)

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(ROOT, "public/poster.png")
RYE_FONT = os.path.join(ROOT, "fonts/Rye-Regular.ttf")
PLAYFAIR_ITAL = os.path.join(ROOT, "fonts/PlayfairDisplay-BlackItalic.ttf")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
W, H = 1024, 1024

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
GOLD_DK = (202, 160, 40)
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


def rye(size):
    if os.path.exists(RYE_FONT):
        return ImageFont.truetype(RYE_FONT, size)
    return find_font(FONT_ITALIC, size)


def playfair(size):
    if os.path.exists(PLAYFAIR_ITAL):
        return ImageFont.truetype(PLAYFAIR_ITAL, size)
    return find_font(FONT_ITALIC, size)


def tent_background():
    img = Image.new("RGBA", (W, H), (88, 16, 16, 255))
    d = ImageDraw.Draw(img)
    stripeW = 78
    for x in range(-stripeW, W + stripeW, stripeW * 2):
        d.rectangle([x, 0, x + stripeW, H], fill=(122, 24, 24))
    # Seam shadows
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(-stripeW, W + stripeW, stripeW * 2):
        od.rectangle([x, 0, x + 2, H], fill=(26, 6, 6, 80))
        od.rectangle([x + stripeW - 2, 0, x + stripeW, H], fill=(26, 6, 6, 80))
    img.alpha_composite(overlay)
    return img


def add_valance(img, valanceH=120):
    w, _ = img.size
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Gold band gradient
    for y in range(int(valanceH * 0.4)):
        t = y / max(int(valanceH * 0.4) - 1, 1)
        c = (
            int(255 * (1 - t) + GOLD_DK[0] * t),
            int(226 * (1 - t) + GOLD_DK[1] * t),
            int(122 * (1 - t) + GOLD_DK[2] * t),
            255,
        )
        d.line([(0, y), (w, y)], fill=c)
    # Scallops
    scallopR = int(valanceH * 0.5)
    scallopGap = int(scallopR * 1.55)
    yBot = int(valanceH * 0.4)
    for x in range(int(scallopR * 0.6), w + scallopR, scallopGap):
        d.pieslice([x - scallopR, yBot - scallopR, x + scallopR, yBot + scallopR],
                   0, 180, fill=GOLD_DK)
    # Cream lining
    d.rectangle([0, int(valanceH * 0.40), w, int(valanceH * 0.40) + 5], fill=CREAM)
    # Tassels
    for x in range(int(scallopR * 0.6) + scallopR, w, scallopGap):
        d.ellipse([x - 8, yBot + scallopR - 6, x + 8, yBot + scallopR + 14], fill=GOLD_DK)
    img.alpha_composite(layer)


def draw_pig_full(d, cx, cy, r):
    d.line([(cx - r * 0.95, cy - r * 0.1),
            (cx - r * 1.10, cy - r * 0.32),
            (cx - r * 0.85, cy - r * 0.10)], fill=(232, 156, 174), width=int(r * 0.10))
    for lx in [-0.55, -0.20, 0.20, 0.55]:
        d.rounded_rectangle(
            [cx + lx * r - r * 0.10, cy + r * 0.30,
             cx + lx * r + r * 0.10, cy + r * 0.70],
            radius=int(r * 0.06), fill=(232, 156, 174))
    d.ellipse([cx - r * 0.95, cy - r * 0.55, cx + r * 0.95, cy + r * 0.55],
              fill=(255, 199, 199), outline=(90, 48, 48), width=3)
    hx, hy = cx + r * 0.78, cy - r * 0.15
    d.ellipse([hx - r * 0.40, hy - r * 0.36, hx + r * 0.40, hy + r * 0.36],
              fill=(255, 199, 199), outline=(90, 48, 48), width=3)
    d.ellipse([hx + r * 0.04, hy - r * 0.06, hx + r * 0.40, hy + r * 0.22],
              fill=(255, 154, 166), outline=(166, 96, 112), width=2)
    d.ellipse([hx + r * 0.16, hy + r * 0.04, hx + r * 0.22, hy + r * 0.14], fill=(110, 64, 74))
    d.ellipse([hx + r * 0.24, hy + r * 0.04, hx + r * 0.30, hy + r * 0.14], fill=(110, 64, 74))
    d.ellipse([hx + r * 0.06, hy - r * 0.20, hx + r * 0.14, hy - r * 0.10], fill=INK)


def pig_half(r, rot_deg, side):
    pad = int(r * 2.0)
    size = pad * 2
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(base)
    draw_pig_full(pd, pad, pad, r)
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    if side == "l":
        md.rectangle([0, 0, size, pad], fill=255)
    else:
        md.rectangle([0, pad, size, size], fill=255)
    half = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    half.paste(base, (0, 0), mask)
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
    bone_cy = pad + sign * int(fRy * 0.5)
    boneRx, boneRy = int(fRx * 0.18), int(fRy * 0.34)
    cd.ellipse([pad - boneRx, bone_cy - boneRy, pad + boneRx, bone_cy + boneRy],
               fill=(255, 250, 242), outline=(140, 36, 50), width=2)
    cd.line([(pad - rx, pad), (pad + rx, pad)], fill=(0, 0, 0, 160), width=3)
    return half.rotate(rot_deg, resample=Image.BICUBIC, expand=True)


def swipe_trail(img, points):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for width, color in [(80, (255, 100, 80, 30)),
                         (50, (255, 200, 140, 80)),
                         (28, (255, 255, 255, 200))]:
        for i in range(len(points) - 1):
            od.line([points[i], points[i + 1]], fill=color, width=width)
    for i in range(len(points) - 1):
        od.line([points[i], points[i + 1]], fill=(255, 255, 255, 255), width=9)
    img.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(radius=1.4)))


def blood_splatter(img, cx, cy, n, color):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(layer)
    for _ in range(n):
        a = random.random() * math.pi * 2
        d = random.uniform(50, 260)
        x = cx + math.cos(a) * d
        y = cy + math.sin(a) * d - random.uniform(0, 60)
        r = random.uniform(6, 18)
        for rr in range(int(r * 2), int(r), -2):
            aa = int(30 * (1 - rr / (r * 2)))
            pd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color + (aa,))
        pd.ellipse([x - r, y - r, x + r, y + r], fill=color + (220,))
    img.alpha_composite(layer)


def debossed_text(img, text, x, y, font, fill=CREAM, shadow=BLOOD_DK, offset=4):
    """Carved-letter effect: dark drop-shadow + cream fill."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Deep dark layer
    d.text((x + offset, y + offset + 1), text, font=font, fill=(0, 0, 0, 200))
    # Shadow
    d.text((x + 2, y + 3), text, font=font, fill=shadow + (255,))
    # Highlight cream
    d.text((x, y), text, font=font, fill=fill + (255,))
    img.alpha_composite(layer)


def add_spotlights(img):
    """Two warm soft pools — matches the in-game drawSpotlights look."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    w, h = img.size
    # Main warm pool
    g1 = radial_glow(w, h, w * 0.55, h * 0.30, max(w, h) * 0.55, (255, 220, 150), 55)
    layer = Image.alpha_composite(layer, g1)
    # Secondary pink pool
    g2 = radial_glow(w, h, w * 0.30, h * 0.62, max(w, h) * 0.42, (255, 170, 210), 32)
    layer = Image.alpha_composite(layer, g2)
    # Composite additively-ish (alpha blend works fine for soft glows)
    img.alpha_composite(layer)


def radial_glow(w, h, cx, cy, radius, color, alpha_peak):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    r2 = radius * radius
    for y in range(h):
        for x in range(w):
            d = (x - cx) ** 2 + (y - cy) ** 2
            if d >= r2:
                continue
            k = 1 - (d / r2)
            a = int(alpha_peak * (k ** 2))
            if a <= 0:
                continue
            px[x, y] = (color[0], color[1], color[2], a)
    return img


def drop_shadow(img, cx, cy, rx, ry, alpha=110):
    """Soft blurred ellipse shadow, drawn at (cx, cy) with given radii."""
    pad = 30
    w = int(rx * 2 + pad * 2)
    h = int(ry * 2 + pad * 2)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([pad, pad, pad + rx * 2, pad + ry * 2], fill=(0, 0, 0, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=14))
    img.alpha_composite(layer, (int(cx - w // 2), int(cy - h // 2)))


def main():
    bg = tent_background()
    add_spotlights(bg)

    # Pig sliced — single centered hero
    cx, cy = W // 2, 720
    # Shadow on the tent below the hero pig
    drop_shadow(bg, cx, cy + 130, 200, 36, alpha=150)

    left = pig_half(160, -20, "l")
    right = pig_half(160, 18, "r")
    bg.alpha_composite(left, (cx - left.width // 2 - 90, cy - left.height // 2 - 30))
    bg.alpha_composite(right, (cx - right.width // 2 + 90, cy - right.height // 2 + 30))
    blood_splatter(bg, cx, cy, 32, (232, 80, 106))

    # Swipe trail crossing through the kill
    swipe_trail(bg, [(60, 560), (300, 690), (cx - 30, 720), (780, 680), (970, 540)])

    # ── Title block — fonts match the in-game canvas exactly ──
    # "THE GREATEST" subtitle — Playfair Display Black Italic
    sub_font = playfair(40)
    sub_text = "— THE GREATEST —"
    bbox = ImageDraw.Draw(bg).textbbox((0, 0), sub_text, font=sub_font)
    tw = bbox[2] - bbox[0]
    debossed_text(bg, sub_text, (W - tw) // 2, 120, sub_font, fill=CREAM, shadow=BLOOD_DK, offset=2)

    # FARM — Rye slab serif (matches in-game)
    farm_font = rye(176)
    farm_text = "FARM"
    bbox = ImageDraw.Draw(bg).textbbox((0, 0), farm_text, font=farm_font)
    fw = bbox[2] - bbox[0]
    debossed_text(bg, farm_text, (W - fw) // 2, 175, farm_font, fill=CREAM, shadow=BLOOD_DK, offset=5)

    # "to" — Playfair Display Black Italic
    to_font = playfair(64)
    to_text = "to"
    bbox = ImageDraw.Draw(bg).textbbox((0, 0), to_text, font=to_font)
    tow = bbox[2] - bbox[0]
    debossed_text(bg, to_text, (W - tow) // 2, 358, to_font, fill=CREAM, shadow=BLOOD_DK, offset=3)

    # TABLE — Rye
    table_font = rye(176)
    table_text = "TABLE"
    bbox = ImageDraw.Draw(bg).textbbox((0, 0), table_text, font=table_font)
    tabw = bbox[2] - bbox[0]
    debossed_text(bg, table_text, (W - tabw) // 2, 420, table_font, fill=CREAM, shadow=BLOOD_DK, offset=5)

    # AlterU watermark
    d = ImageDraw.Draw(bg, "RGBA")
    wm_font = find_font(FONT_TAG, 26)
    wm = "AlterU"
    bbox = d.textbbox((0, 0), wm, font=wm_font)
    ww = bbox[2] - bbox[0]
    d.text((W - ww - 36, H - 56), wm, font=wm_font, fill=(255, 255, 255, 200))

    bg.convert("RGB").save(OUT_PATH, "PNG", optimize=True)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
