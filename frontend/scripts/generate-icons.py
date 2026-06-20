#!/usr/bin/env python3
"""Generate favicons, PWA icons, OG images, and Facebook app icon from logo-novo.png."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
LOGO = PUBLIC / "logo-novo.png"
ICONS = PUBLIC / "icons"

BRAND_GREEN = "#16A34A"
BRAND_LIGHT = "#8BC34A"
WHITE = "#FFFFFF"

ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512]


def remove_watermark(logo: Image.Image) -> Image.Image:
    """Remove Gemini sparkle watermark from the bottom-right corner."""
    img = logo.copy()
    w, h = img.size
    x0, y0 = int(w * 0.91), int(h * 0.91)

    for y in range(y0, h):
        for x in range(x0, w):
            r, g, b, a = img.getpixel((x, y))
            if g <= 200 or r <= 120:
                continue

            ref_x = max(0, x0 - 24 - (x - x0))
            ref_y = min(h - 1, y + 8)
            img.putpixel((x, y), img.getpixel((ref_x, ref_y)))

    return img


def load_logo() -> Image.Image:
    return remove_watermark(Image.open(LOGO).convert("RGBA"))


def square_logo(logo: Image.Image, size: int, padding_ratio: float = 0.0) -> Image.Image:
    """Resize logo to square (logo already includes background art)."""
    if padding_ratio <= 0:
        return logo.resize((size, size), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - padding_ratio * 2))
    fitted = logo.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.paste(fitted, offset, fitted)
    return canvas


def maskable_icon(logo: Image.Image, size: int) -> Image.Image:
    """Android maskable icon: logo in safe zone on brand background."""
    canvas = Image.new("RGBA", (size, size), BRAND_GREEN)
    inner = int(size * 0.78)
    fitted = logo.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.paste(fitted, offset, fitted)
    return canvas


def _gradient_background(width: int, height: int) -> Image.Image:
    canvas = Image.new("RGB", (width, height), BRAND_LIGHT)
    draw = ImageDraw.Draw(canvas)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        r = int(0x8B + (0x16 - 0x8B) * ratio * 0.35)
        g = int(0xC3 + (0xA3 - 0xC3) * ratio * 0.35)
        b = int(0x4A)
        draw.line([(0, y), (width, y)], fill=(max(0, r), max(0, g), b))
    return canvas


def og_image(logo: Image.Image, width: int, height: int, title: str, subtitle: str) -> Image.Image:
    canvas = _gradient_background(width, height)

    logo_max = int(min(height * 0.82, width * 0.42))
    fitted = logo.copy()
    fitted.thumbnail((logo_max, logo_max), Image.Resampling.LANCZOS)
    logo_x = int(width * 0.06)
    logo_y = (height - fitted.height) // 2
    canvas.paste(fitted, (logo_x, logo_y), fitted)

    text_x = logo_x + fitted.width + int(width * 0.05)
    text_width = width - text_x - int(width * 0.06)

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 58)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
    except OSError:
        try:
            title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", 58)
            subtitle_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 30)
        except OSError:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()

    draw = ImageDraw.Draw(canvas)
    title_lines = ["52 Week", "Challenge"]
    line_height = 68
    start_y = int(height * 0.32)
    for i, line in enumerate(title_lines):
        draw.text((text_x, start_y + i * line_height), line, fill=WHITE, font=title_font)

    subtitle_y = start_y + len(title_lines) * line_height + 24
    draw.multiline_text(
        (text_x, subtitle_y),
        subtitle,
        fill=(255, 255, 255, 230),
        font=subtitle_font,
        spacing=8,
    )

    return canvas


def og_square(logo: Image.Image, size: int) -> Image.Image:
    return square_logo(logo, size)


def facebook_app_icon(logo: Image.Image, size: int = 1024) -> Image.Image:
    return square_logo(logo, size)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)


def build_favicon_ico(sizes: list[int]) -> None:
    pngs = [ICONS / f"favicon-{s}x{s}.png" for s in sizes if (ICONS / f"favicon-{s}x{s}.png").exists()]
    if not pngs:
        return
    subprocess.run(
        ["magick", *[str(p) for p in pngs], str(PUBLIC / "favicon.ico")],
        check=True,
    )


def main() -> None:
    logo = load_logo()
    ICONS.mkdir(parents=True, exist_ok=True)

    for size in ICON_SIZES:
        name = "apple-touch-icon" if size == 180 else f"icon-{size}x{size}"
        if size <= 48:
            name = f"favicon-{size}x{size}"
        save_png(square_logo(logo, size), ICONS / f"{name}.png")

    save_png(maskable_icon(logo, 512), ICONS / "icon-512x512-maskable.png")
    save_png(facebook_app_icon(logo, 1024), ICONS / "facebook-app-1024x1024.png")

    save_png(
        og_image(
            logo,
            1200,
            630,
            "52 Week Challenge",
            "Save week by week toward\nyour financial goals",
        ),
        PUBLIC / "og-image.png",
    )
    save_png(og_square(logo, 1200), PUBLIC / "og-image-square.png")

    build_favicon_ico([16, 32, 48])

    save_png(logo, LOGO)

    print("Generated icons in", ICONS)
    print("Generated og-image.png, og-image-square.png, favicon.ico")
    print("Updated", LOGO, "(watermark removed)")


if __name__ == "__main__":
    main()
