#!/usr/bin/env python3
"""Regenerate crisp GlobalReach favicons from the globe mark.

Outputs into client/public:
  - favicon.svg            vector (sharpest in modern browser tabs)
  - favicon.png   (256)    raster fallback
  - apple-touch-icon.png (180)
  - favicon.ico   (16/32/48 PNG-embedded)

White globe (globe + meridian + equator + core) over the red->teal brand
gradient — matches the iOS app icon. Pure stdlib, no Pillow.
"""
import zlib, struct, math, os

PUB = os.path.join(os.path.dirname(__file__), "..", "client", "public")
RED = (0xEF, 0x44, 0x44)
TEAL = (0x14, 0xB8, 0xA6)


def globe_rgb(S):
    cx = cy = S / 2.0
    R = S * 0.300
    sw = R * (2.0 / 13.0)
    half = sw / 2.0
    rx = R * (6.0 / 13.0)
    ry = R
    dot = R * (3.0 / 13.0)
    denom = (S - 1) * 2.0

    def cov(d):
        return min(1.0, max(0.0, 0.5 - d))

    def ell(dx, dy):
        f = math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
        g = math.sqrt((dx / (rx * rx)) ** 2 + (dy / (ry * ry)) ** 2)
        return 1e9 if g < 1e-9 else (f - 1.0) / g

    raw = bytearray()
    for y in range(S):
        raw.append(0)
        fy = y + 0.5
        dy = fy - cy
        for x in range(S):
            fx = x + 0.5
            dx = fx - cx
            r = math.hypot(dx, dy)
            c = cov(abs(r - R) - half)
            if r <= R + half:
                c = max(c, cov(abs(ell(dx, dy)) - half))
            if abs(dx) <= R + half:
                c = max(c, cov(abs(dy) - half))
            c = max(c, cov(r - dot))
            t = (x + y) / denom
            br = RED[0] + (TEAL[0] - RED[0]) * t
            bg = RED[1] + (TEAL[1] - RED[1]) * t
            bb = RED[2] + (TEAL[2] - RED[2]) * t
            raw += bytes((
                round(br + (255 - br) * c),
                round(bg + (255 - bg) * c),
                round(bb + (255 - bb) * c),
            ))
    return bytes(raw)


def chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))


def png_bytes(S):
    raw = globe_rgb(S)
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 2, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    return out


def write_png(name, S):
    path = os.path.join(PUB, name)
    with open(path, "wb") as f:
        f.write(png_bytes(S))
    print("wrote", name, f"({S}x{S})")


def write_ico(name, sizes):
    pngs = [(s, png_bytes(s)) for s in sizes]
    header = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries = b""
    blob = b""
    for s, data in pngs:
        entries += struct.pack(
            "<BBBBHHII",
            s & 0xFF, s & 0xFF, 0, 0, 1, 32, len(data), offset
        )
        blob += data
        offset += len(data)
    with open(os.path.join(PUB, name), "wb") as f:
        f.write(header + entries + blob)
    print("wrote", name, sizes)


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="GlobalReach">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ef4444"/>
      <stop offset="1" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#bg)"/>
  <g fill="none" stroke="#ffffff" stroke-width="2">
    <circle cx="16" cy="16" r="11"/>
    <ellipse cx="16" cy="16" rx="5" ry="11"/>
    <path d="M5 16h22" stroke-linecap="round"/>
  </g>
  <circle cx="16" cy="16" r="2.6" fill="#ffffff"/>
</svg>
"""


def main():
    with open(os.path.join(PUB, "favicon.svg"), "w") as f:
        f.write(SVG)
    print("wrote favicon.svg")
    write_png("favicon.png", 256)
    write_png("apple-touch-icon.png", 180)
    write_ico("favicon.ico", [16, 32, 48])


if __name__ == "__main__":
    main()
