#!/usr/bin/env python3
"""
Generate IronPath app icons as PNG files using only Python stdlib.
Produces: icon.png (1024x1024), adaptive-icon.png (1024x1024),
          splash.png (1284x2778), favicon.png (48x48)
"""

import struct
import zlib
import math
import os

# ── Colors ────────────────────────────────────────────────────────────────────
ORANGE      = (255, 107, 53)      # #FF6B35  accent
ORANGE_DARK = (180, 60, 20)       # darker shade for depth
BG_DARK     = (10, 10, 10)        # #0A0A0A  background
WHITE       = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# ── PNG writer ────────────────────────────────────────────────────────────────

def _pack_chunk(chunk_type: bytes, data: bytes) -> bytes:
    c = chunk_type + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

def write_png(path: str, pixels: list, width: int, height: int, has_alpha=False):
    """pixels: flat list of (R,G,B) or (R,G,B,A) tuples, row-major."""
    channels = 4 if has_alpha else 3
    color_type = 6 if has_alpha else 2  # RGBA or RGB

    raw_rows = []
    for y in range(height):
        row = b"\x00"  # filter type None
        for x in range(width):
            px = pixels[y * width + x]
            if has_alpha:
                row += bytes(px[:4])
            else:
                row += bytes(px[:3])
        raw_rows.append(row)

    compressed = zlib.compress(b"".join(raw_rows), 9)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        ihdr = struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)
        f.write(_pack_chunk(b"IHDR", ihdr))
        f.write(_pack_chunk(b"IDAT", compressed))
        f.write(_pack_chunk(b"IEND", b""))

# ── Drawing primitives ────────────────────────────────────────────────────────

def make_canvas(width: int, height: int, bg=(0,0,0,0)):
    return [list(bg)] * (width * height)

def set_pixel(pixels, width, x, y, color):
    if 0 <= x < width and 0 <= y < len(pixels) // width:
        pixels[y * width + x] = list(color)

def blend(dst, src_color, alpha_f):
    """Alpha-blend src_color (RGB) onto dst pixel at alpha_f in [0,1]."""
    r = int(dst[0] * (1 - alpha_f) + src_color[0] * alpha_f)
    g = int(dst[1] * (1 - alpha_f) + src_color[1] * alpha_f)
    b = int(dst[2] * (1 - alpha_f) + src_color[2] * alpha_f)
    a = min(255, int(dst[3] if len(dst) > 3 else 255) + int(255 * alpha_f))
    return [r, g, b, a]

def fill_rect(pixels, width, x0, y0, x1, y1, color):
    for y in range(y0, y1):
        for x in range(x0, x1):
            idx = y * width + x
            if 0 <= idx < len(pixels):
                pixels[idx] = list(color) + ([255] if len(color) == 3 else [])

def fill_circle(pixels, width, height, cx, cy, r, color):
    for y in range(max(0, cy - r), min(height, cy + r + 1)):
        for x in range(max(0, cx - r), min(width, cx + r + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                pixels[y * width + x] = list(color) + ([255] if len(color) == 3 else [])

def fill_rounded_rect(pixels, width, height, x0, y0, x1, y1, radius, color):
    """Fill a rounded rectangle."""
    # straight edges
    fill_rect(pixels, width, x0 + radius, y0, x1 - radius, y1, color)
    fill_rect(pixels, width, x0, y0 + radius, x1, y1 - radius, color)
    # corner circles
    for cx, cy in [(x0+radius, y0+radius), (x1-radius, y0+radius),
                   (x0+radius, y1-radius), (x1-radius, y1-radius)]:
        fill_circle(pixels, width, height, cx, cy, radius, color)

def draw_barbell(pixels, width, height, cx, cy, size, color):
    """
    Draw a simplified barbell icon centered at (cx, cy).
    size controls overall scale.
    """
    bar_w      = int(size * 1.1)
    bar_h      = int(size * 0.10)
    plate_w    = int(size * 0.18)
    plate_h    = int(size * 0.55)
    collar_w   = int(size * 0.07)
    collar_h   = int(size * 0.30)

    # Central bar
    fill_rect(pixels, width,
              cx - bar_w // 2, cy - bar_h // 2,
              cx + bar_w // 2, cy + bar_h // 2,
              color)

    # Left plates
    lx = cx - bar_w // 2
    fill_rect(pixels, width,
              lx - plate_w, cy - plate_h // 2,
              lx,           cy + plate_h // 2,
              color)
    fill_rect(pixels, width,
              lx - collar_w - plate_w, cy - collar_h // 2,
              lx - plate_w,            cy + collar_h // 2,
              color)

    # Right plates
    rx = cx + bar_w // 2
    fill_rect(pixels, width,
              rx,            cy - plate_h // 2,
              rx + plate_w,  cy + plate_h // 2,
              color)
    fill_rect(pixels, width,
              rx + plate_w,             cy - collar_h // 2,
              rx + plate_w + collar_w,  cy + collar_h // 2,
              color)

# ── Icon generators ───────────────────────────────────────────────────────────

def generate_icon(size: int) -> list:
    """Square icon: orange rounded-rect background + white barbell."""
    w = h = size
    pad = int(size * 0.0)
    radius = int(size * 0.22)

    pixels = [[0, 0, 0, 0]] * (w * h)

    # Background rounded rect
    fill_rounded_rect(pixels, w, h, pad, pad, w - pad, h - pad, radius, ORANGE)

    # Subtle inner gradient feel (darker stripe at bottom)
    for y in range(h // 2, h - pad - radius):
        for x in range(pad + radius, w - pad - radius):
            idx = y * w + x
            ratio = (y - h // 2) / (h // 2)
            darkened = [
                int(ORANGE[0] * (1 - ratio * 0.25)),
                int(ORANGE[1] * (1 - ratio * 0.25)),
                int(ORANGE[2] * (1 - ratio * 0.25)),
                255,
            ]
            if pixels[idx][3] > 0:
                pixels[idx] = darkened

    # White barbell
    draw_barbell(pixels, w, h, w // 2, h // 2, int(size * 0.55), WHITE)

    return pixels

def generate_splash(width: int, height: int) -> list:
    """Dark background with centered logo + wordmark."""
    pixels = [[*BG_DARK, 255]] * (width * height)

    cx, cy = width // 2, height // 2 - height // 10

    # Orange circle backdrop for logo
    icon_r = int(min(width, height) * 0.14)
    fill_circle(pixels, width, height, cx, cy, icon_r, ORANGE)

    # White barbell inside circle
    draw_barbell(pixels, width, height, cx, cy, int(icon_r * 1.4), WHITE)

    # Horizontal rule below
    line_y = cy + icon_r + int(height * 0.04)
    line_w = int(width * 0.12)
    fill_rect(pixels, width,
              cx - line_w, line_y,
              cx + line_w, line_y + max(2, int(height * 0.003)),
              ORANGE)

    return pixels

def generate_favicon(size: int) -> list:
    """Tiny icon: just the orange square with barbell."""
    return generate_icon(size)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets")
    os.makedirs(out_dir, exist_ok=True)

    print("Generating icon.png (1024×1024)…")
    px = generate_icon(1024)
    write_png(os.path.join(out_dir, "icon.png"), px, 1024, 1024, has_alpha=True)

    print("Generating adaptive-icon.png (1024×1024)…")
    # Adaptive icon: just the barbell on transparent bg (foreground layer)
    w = h = 1024
    px2 = [[0, 0, 0, 0]] * (w * h)
    draw_barbell(px2, w, h, w // 2, h // 2, int(w * 0.65), ORANGE)
    write_png(os.path.join(out_dir, "adaptive-icon.png"), px2, w, h, has_alpha=True)

    print("Generating splash.png (1284×2778)…")
    px3 = generate_splash(1284, 2778)
    write_png(os.path.join(out_dir, "splash.png"), px3, 1284, 2778, has_alpha=True)

    print("Generating favicon.png (48×48)…")
    px4 = generate_favicon(48)
    write_png(os.path.join(out_dir, "favicon.png"), px4, 48, 48, has_alpha=True)

    print("Done! Assets written to /assets/")

if __name__ == "__main__":
    main()
