#!/usr/bin/env python3
"""Generate favicons, PWA icons, OG images, and Facebook app icon from logo.png."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
LOGO = PUBLIC / "logo.png"
ICONS = PUBLIC / "icons"

BRAND_GREEN = "#16A34A"
BRAND_LIGHT = "#8BC34A"
WHITE = "#FFFFFF"

ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512]


def load_logo() -> Image.Image:
    return Image.open(LOGO).convert("RGBA")


def square_logo(logo: Image.Image, size: int, padding_ratio: float = 0.08) -> Image.Image:
    """Fit logo into a square canvas with transparent background."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - padding_ratio * 2))
    fitted = logo.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.paste(fitted, offset, fitted)
    return canvas


def maskable_icon(logo: Image.Image, size: int) -> Image.Image:
    """Android maskable icon: logo in ~72% safe zone on brand background."""
    canvas = Image.new("RGBA", (size, size), BRAND_GREEN)
    inner = int(size * 0.72)
    fitted = logo.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.paste(fitted, offset, fitted)
    return canvas


def og_image(logo: Image.Image, width: int, height: int, title: str, subtitle: str) -> Image.Image:
    canvas = Image.new("RGB", (width, height), BRAND_LIGHT)
    draw = ImageDraw.Draw(canvas)

    # Subtle gradient overlay
    for y in range(height):
        ratio = y / height
        r = int(0x8B + (0x16 - 0x8B) * ratio * 0.35)
        g = int(0xC3 + (0xA3 - 0xC3) * ratio * 0.35)
        b = int(0x4A + (0x4A - 0x4A) * ratio)
        draw.line([(0, y), (width, y)], fill=(max(0, r), max(0, g), b))

    logo_max_w = int(width * 0.42)
    logo_max_h = int(height * 0.55)
    fitted = logo.copy()
    fitted.thumbnail((logo_max_w, logo_max_h), Image.Resampling.LANCZOS)
    logo_x = (width - fitted.width) // 2
    logo_y = int(height * 0.12)
    canvas.paste(fitted, (logo_x, logo_y), fitted)

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 56)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 28)
    except OSError:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()

    title_y = logo_y + fitted.height + 36
    draw.text((width // 2, title_y), title, fill=WHITE, font=title_font, anchor="mt")
    draw.text((width // 2, title_y + 72), subtitle, fill=(255, 255, 255, 220), font=subtitle_font, anchor="mt")

    return canvas


def og_square(logo: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), WHITE)
    inner = int(size * 0.78)
    fitted = logo.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.paste(fitted, offset, fitted)
    return canvas


def facebook_app_icon(logo: Image.Image, size: int = 1024) -> Image.Image:
    """Facebook app requires 1024x1024, logo centered on transparent background."""
    return square_logo(logo, size)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode == "RGBA":
        img.save(path, "PNG", optimize=True)
    else:
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
            "Save week by week toward your financial goals",
        ),
        PUBLIC / "og-image.png",
    )
    save_png(og_square(logo, 1200), PUBLIC / "og-image-square.png")

    build_favicon_ico([16, 32, 48])

    print("Generated icons in", ICONS)
    print("Generated og-image.png, og-image-square.png, favicon.ico")


if __name__ == "__main__":
    main()
