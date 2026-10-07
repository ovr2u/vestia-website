#!/usr/bin/env python3
"""Generate optimised web images from the brand pack and the archived live-site images.

Run from the repository root:  python3 _build/assets.py
Needs Pillow (pip install pillow). Only re-run if a source image changes.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "Vestia website rebuild" / "brand"
LIVE = ROOT / "Vestia website rebuild" / "live-site-images"
OUT = ROOT / "assets" / "img"
CREAM = (249, 246, 242)

# Soft two-tone backdrop behind the headshots, echoing the two halves of the gem mark.
SPLIT_L = (231, 225, 217)
SPLIT_R = (240, 231, 219)

# Headshot framing: source file, eye line y, chin y, face centre x, right clamp, eye position.
HEADSHOTS = {
    "lucie-anne-rhodes": ("headshot-lucie-anne-rhodes.png", 200, 335, 400, None, 0.40),
    "claudia-haisman-green": ("headshot-claudia-haisman-green.png", 280, 458, 330, 632, 0.40),
    "gurprit-mattu": ("headshot-gurprit-mattu.png", 290, 450, 490, None, 0.40),
    "amy-kaur": ("headshot-amy-kaur.png", 626, 905, 500, None, 0.43),
}


def save_pair(im, base, quality=80, png=False):
    """Save WebP plus a JPEG (or PNG for transparent images) fallback."""
    im.save(base.with_suffix(".webp"), "WEBP", quality=quality, method=6)
    if png:
        im.save(base.with_suffix(".png"), "PNG", optimize=True)
    else:
        im.convert("RGB").save(base.with_suffix(".jpg"), "JPEG", quality=quality, optimize=True, progressive=True)


def headshot(slug):
    f, ey, cy, cx, clamp_r, eye_frac = HEADSHOTS[slug]
    src = Image.open(LIVE / f).convert("RGBA")
    s = cy - ey
    h = int(s * 4.2)
    w = int(h * 0.8)
    top = int(ey - eye_frac * h)
    left = int(cx - w / 2)
    if clamp_r and left + w > clamp_r:
        left = clamp_r - w
    left = max(left, 0) if slug == "amy-kaur" else left
    canvas = Image.new("RGBA", (w, h))
    canvas.paste(SPLIT_L + (255,), (0, 0, w // 2, h))
    canvas.paste(SPLIT_R + (255,), (w // 2, 0, w, h))
    box = (max(left, 0), max(top, 0), min(left + w, src.width), min(top + h, src.height))
    canvas.alpha_composite(src.crop(box), (max(-left, 0), max(-top, 0)))
    return canvas.convert("RGB")


def main():
    (OUT / "mediators").mkdir(parents=True, exist_ok=True)
    (OUT / "badges").mkdir(parents=True, exist_ok=True)
    (OUT / "brand").mkdir(parents=True, exist_ok=True)

    for slug in HEADSHOTS:
        im = headshot(slug)
        for width in (400, 640):
            size = (width, int(width * 1.25))
            save_pair(im.resize(size, Image.LANCZOS), OUT / "mediators" / f"{slug}-{width}", quality=78)

    badges = {
        "cmc-registered-mediator-2026": "badge-cmc-registered-mediator-2026.png",
        "cedr": "badge-cedr.jpg",
        "som-certified-mediator-2026": "badge-som-certified-mediator-2026.png",
    }
    for name, f in badges.items():
        im = Image.open(LIVE / f).convert("RGBA")
        im = im.resize((round(im.width * 96 / im.height), 96), Image.LANCZOS)
        save_pair(im, OUT / "badges" / name, quality=88, png=True)

    icon = Image.open(BRAND / "vestia-icon-color-2048.png").convert("RGBA")
    icon = icon.crop(icon.getchannel("A").getbbox())
    # Header mark (displayed ~40px tall) and hero mark (displayed up to ~300px wide).
    for name, height in (("mark-96", 96), ("mark-720", 720)):
        im = icon.resize((round(icon.width * height / icon.height), height), Image.LANCZOS)
        save_pair(im, OUT / "brand" / name, quality=90, png=True)

    lockup = Image.open(BRAND / "vestia-lockup-horizontal-color-2048.png").convert("RGBA")
    lockup = lockup.crop(lockup.getchannel("A").getbbox())
    im = lockup.resize((480, round(lockup.height * 480 / lockup.width)), Image.LANCZOS)
    save_pair(im, OUT / "brand" / "lockup-480", quality=90, png=True)
    big = lockup.resize((1000, round(lockup.height * 1000 / lockup.width)), Image.LANCZOS)
    big.save(OUT / "brand" / "lockup-1000.png", "PNG", optimize=True)

    # Favicons: transparent mark on a square canvas; app icons on cream.
    def square(size, pad, bg=None):
        canvas = Image.new("RGBA", (size, size), bg + (255,) if bg else (0, 0, 0, 0))
        inner = size - 2 * pad
        m = icon.copy()
        m.thumbnail((inner, inner), Image.LANCZOS)
        canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
        return canvas

    square(512, 8).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    square(64, 2).resize((32, 32), Image.LANCZOS).save(ROOT / "favicon-32.png", optimize=True)
    square(180, 22, CREAM).convert("RGB").save(ROOT / "apple-touch-icon.png", optimize=True)
    square(192, 24, CREAM).convert("RGB").save(OUT / "brand" / "icon-192.png", optimize=True)
    square(512, 64, CREAM).convert("RGB").save(OUT / "brand" / "icon-512.png", optimize=True)


if __name__ == "__main__":
    main()
