#!/usr/bin/env python3
"""Generate baisoku extension icons (violet rounded square + white chevrons)."""

from PIL import Image, ImageDraw

BG = (124, 58, 237, 255)
FG = (255, 255, 255, 255)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = max(2, round(size * 0.22))
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)

    stroke = max(2, round(size * 0.14))
    depth = size * 0.16
    y0 = size * 0.26
    y1 = size * 0.74
    cy = size / 2

    if size < 32:
        apexes = (size * 0.50,)
    else:
        apexes = (size * 0.42, size * 0.72)

    for ax in apexes:
        x0 = ax
        x1 = ax + depth
        pts = [
            (x0, y0),
            (x1, cy),
            (x0, y1),
            (x0 - stroke, y1),
            (x1 - stroke, cy),
            (x0 - stroke, y0),
        ]
        d.polygon(pts, fill=FG)

    return img


if __name__ == "__main__":
    import os

    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for s in (16, 48, 128):
        path = os.path.join(out_dir, f"icon{s}.png")
        make_icon(s).save(path)
        print(f"wrote {path}")
