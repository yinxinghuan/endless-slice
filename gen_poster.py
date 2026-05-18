#!/usr/bin/env python3
"""
Endless Slice — 1024x1024 poster.

Layout:
  - Warm cozy gradient background
  - HUGE "ENDLESS SLICE" title at top (must stay above bottom 1/3 — list UI overlays)
  - A horizontal baguette with 3 dashed target marks and a glowing yellow scan line
  - "PERFECT +300" floating callouts
  - AlterU watermark bottom-right
"""
import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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
    "/Library/Fonts/Arial Bold.ttf",
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


def radial_glow(size, center, radius, color, alpha):
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    cx, cy = center
    for y in range(max(0, cy - radius), min(h, cy + radius)):
        for x in range(max(0, cx - radius), min(w, cx + radius)):
            d = math.hypot(x - cx, y - cy)
            if d < radius:
                k = 1 - d / radius
                a = int(alpha * (k ** 2))
                px[x, y] = (color[0], color[1], color[2], a)
    return img


def draw_baguette(draw, x, y, length, thickness, body, accent, crust):
    # rounded rect (capsule)
    r = thickness / 2
    # Drop shadow
    draw.rounded_rectangle(
        [x + 6, y + 12, x + length + 6, y + thickness + 12],
        radius=r, fill=(0, 0, 0, 180)
    )
    # Body — use a manual gradient via multiple lines
    img = Image.new("RGBA", (length, thickness), (0, 0, 0, 0))
    pd = ImageDraw.Draw(img)
    for i in range(thickness):
        k = i / max(thickness - 1, 1)
        if k < 0.5:
            kk = k / 0.5
            r1 = int(accent[0] * (1 - kk) + body[0] * kk)
            g1 = int(accent[1] * (1 - kk) + body[1] * kk)
            b1 = int(accent[2] * (1 - kk) + body[2] * kk)
        else:
            kk = (k - 0.5) / 0.5
            r1 = int(body[0] * (1 - kk) + crust[0] * kk)
            g1 = int(body[1] * (1 - kk) + crust[1] * kk)
            b1 = int(body[2] * (1 - kk) + crust[2] * kk)
        pd.line([(0, i), (length, i)], fill=(r1, g1, b1, 255))
    # mask to capsule
    mask = Image.new("L", (length, thickness), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, length, thickness], radius=r, fill=255)
    img.putalpha(mask)
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    base.paste(img, (x, y), img)
    return base


def main():
    bg = vertical_gradient((W, H), (64, 38, 22), (14, 8, 5)).convert("RGBA")

    # Warm ambient glow behind scan line
    glow = radial_glow((W, H), (W // 2 + 30, H // 2 + 70), 380, (255, 210, 74), 90)
    bg = Image.alpha_composite(bg, glow)

    # ---- Baguette + scan ----
    food_layer = draw_baguette(
        ImageDraw.Draw(bg),
        x=130, y=H // 2 - 20,
        length=760, thickness=180,
        body=(232, 200, 133),
        accent=(244, 220, 165),
        crust=(122, 72, 36),
    )
    bg = Image.alpha_composite(bg, food_layer)

    d = ImageDraw.Draw(bg, "RGBA")

    # Board outline shadow ellipse under food
    d.ellipse(
        [80, H // 2 + 150, W - 80, H // 2 + 230],
        fill=(0, 0, 0, 90),
    )

    # Target dashes — three uncut marks on the food
    food_top = H // 2 - 36
    food_bot = H // 2 + 176
    food_left, food_right = 130, 130 + 760
    mark_xs = [food_left + 760 * frac for frac in (0.22, 0.5, 0.78)]
    for mx in mark_xs:
        for yy in range(food_top, food_bot, 12):
            d.line([(mx, yy), (mx, yy + 7)], fill=(255, 255, 255, 220), width=3)

    # Scan line (glowing yellow vertical)
    scan_x = food_left + int(760 * 0.5) + 14
    for w in range(36, 0, -2):
        a = int(40 * (1 - w / 36))
        d.line([(scan_x - w, food_top - 30), (scan_x - w, food_bot + 30)],
               fill=(255, 210, 74, a), width=2)
    d.line([(scan_x, food_top - 36), (scan_x, food_bot + 36)],
           fill=(255, 232, 130, 255), width=6)

    # Cut marks (golden vertical slash at already-cut spots)
    for cx in [food_left + int(760 * 0.22), food_left + int(760 * 0.78)]:
        d.line([(cx, food_top - 18), (cx, food_bot + 18)], fill=(255, 210, 74, 255), width=5)
        d.line([(cx, food_top + 12), (cx, food_bot - 12)], fill=(0, 0, 0, 150), width=2)

    # ---- Title ----
    title = "ENDLESS SLICE"
    title_font = find_font(FONT_PATHS_BOLD, 160)
    # Measure
    bbox = d.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    tx = (W - tw) // 2
    ty = 90

    # Drop shadow
    d.text((tx + 6, ty + 8), title, font=title_font, fill=(0, 0, 0, 220))
    # Yellow gradient text (fake: two layers w/ slight offset)
    d.text((tx, ty), title, font=title_font, fill=(255, 248, 200, 255))
    d.text((tx, ty + 4), title, font=title_font, fill=(255, 210, 74, 255))

    # Tagline
    tag = "Tap on the beat. Endless slices."
    tag_font = find_font(FONT_PATHS_TAG, 38)
    bbox = d.textbbox((0, 0), tag, font=tag_font)
    txw = bbox[2] - bbox[0]
    d.text(((W - txw) // 2 + 2, 256), tag, font=tag_font, fill=(0, 0, 0, 200))
    d.text(((W - txw) // 2, 254), tag, font=tag_font, fill=(255, 240, 200, 230))

    # Floating "PERFECT +300" callouts
    impact_font = find_font(FONT_PATHS_BOLD, 56)
    small_font = find_font(FONT_PATHS_BOLD, 36)

    def callout(cx, cy, text, sub, color):
        bbox = d.textbbox((0, 0), text, font=impact_font)
        tw = bbox[2] - bbox[0]
        d.text((cx - tw // 2 + 4, cy + 4), text, font=impact_font, fill=(0, 0, 0, 200))
        d.text((cx - tw // 2, cy), text, font=impact_font, fill=color)
        bbox2 = d.textbbox((0, 0), sub, font=small_font)
        sw = bbox2[2] - bbox2[0]
        d.text((cx - sw // 2 + 2, cy + 60 + 2), sub, font=small_font, fill=(0, 0, 0, 200))
        d.text((cx - sw // 2, cy + 60), sub, font=small_font, fill=(255, 255, 255, 240))

    callout(food_left + int(760 * 0.22), food_top - 140, "PERFECT", "+300", (255, 210, 74, 255))
    callout(food_left + int(760 * 0.78), food_top - 110, "GOOD", "+100", (155, 227, 107, 255))

    # AlterU watermark text
    wm_font = find_font(FONT_PATHS_TAG, 26)
    wm = "AlterU"
    bbox = d.textbbox((0, 0), wm, font=wm_font)
    ww = bbox[2] - bbox[0]
    d.text((W - ww - 36, H - 60), wm, font=wm_font, fill=(255, 255, 255, 160))

    bg.convert("RGB").save(OUT_PATH, "PNG", optimize=True)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
