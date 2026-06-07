#!/usr/bin/env python3
"""Regenerate GlobalReach favicons from the REAL logo art.

Decodes client/public/logo-transparent.png, isolates the globe mark
(globe + orbital ring + satellite, excluding the wordmark), and renders
it square/centered on the brand-dark background. Outputs into client/public:

  - favicon.png        (256)
  - apple-touch-icon.png (180)
  - favicon.ico        (16/32/48, PNG-embedded)

Pure stdlib (zlib), no Pillow. Matches the GlobalReach iOS app icon.
"""
import zlib, struct, math, os

PUB = os.path.join(os.path.dirname(__file__), "..", "client", "public")
SRC = os.path.join(PUB, "logo-transparent.png")
BG = (0x0F, 0x0F, 0x12)
CROP = (82, 65, 388, 347)   # globe-only box in the 802x418 logo
PAD = 0.16


def load_rgba(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, W, H, bd, ct = 8, 0, 0, 0, 0
    idat = bytearray()
    while pos < len(data):
        (ln,) = struct.unpack(">I", data[pos:pos + 4])
        tag = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if tag == b"IHDR":
            W, H, bd, ct = struct.unpack(">IIBB", chunk[:10])
            assert bd == 8 and ct in (2, 6)
        elif tag == b"IDAT":
            idat += chunk
        elif tag == b"IEND":
            break
        pos += 12 + ln
    raw = zlib.decompress(bytes(idat))
    ch = 4 if ct == 6 else 3
    stride = W * ch
    out = bytearray(W * H * 4)
    prev = bytearray(stride)
    p = 0

    def paeth(a, b, c):
        pp = a + b - c
        pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
        return a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)

    for y in range(H):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:
            for i in range(ch, stride):
                line[i] = (line[i] + line[i - ch]) & 255
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                c = prev[i - ch] if i >= ch else 0
                line[i] = (line[i] + paeth(a, prev[i], c)) & 255
        o = y * W * 4
        if ch == 4:
            out[o:o + stride] = line
        else:
            for x in range(W):
                out[o + x * 4:o + x * 4 + 3] = line[x * 3:x * 3 + 3]
                out[o + x * 4 + 3] = 255
        prev = line
    return W, H, out


def chunk(tag, d):
    return struct.pack(">I", len(d)) + tag + d + struct.pack(">I", zlib.crc32(tag + d) & 0xffffffff)


def png_bytes(size, W, H, px):
    x0, y0, x1, y1 = CROP
    bw, bh = x1 - x0, y1 - y0
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    side = max(bw, bh) * (1.0 + 2.0 * PAD)
    sx0, sy0 = cx - side / 2.0, cy - side / 2.0
    scale = side / size

    def sample(fx, fy):
        x = fx - 0.5; y = fy - 0.5
        ix, iy = math.floor(x), math.floor(y)
        tx, ty = x - ix, y - iy
        acc = [0.0, 0.0, 0.0, 0.0]
        for dy in (0, 1):
            for dx in (0, 1):
                wgt = (tx if dx else 1 - tx) * (ty if dy else 1 - ty)
                xx, yy = ix + dx, iy + dy
                if x0 <= xx < x1 and y0 <= yy < y1:
                    o = (yy * W + xx) * 4
                    a = px[o + 3] / 255.0
                    acc[0] += px[o] * a * wgt
                    acc[1] += px[o + 1] * a * wgt
                    acc[2] += px[o + 2] * a * wgt
                    acc[3] += a * wgt
        return acc

    raw = bytearray()
    for j in range(size):
        raw.append(0)
        fy = sy0 + (j + 0.5) * scale
        for i in range(size):
            fx = sx0 + (i + 0.5) * scale
            r, g, b, a = sample(fx, fy)
            raw += bytes((
                round(r + BG[0] * (1 - a)),
                round(g + BG[1] * (1 - a)),
                round(b + BG[2] * (1 - a)),
            ))
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    out += chunk(b"IEND", b"")
    return out


def main():
    W, H, px = load_rgba(SRC)
    for name, sz in (("favicon.png", 256), ("apple-touch-icon.png", 180)):
        open(os.path.join(PUB, name), "wb").write(png_bytes(sz, W, H, px))
        print("wrote", name, sz)

    sizes = [16, 32, 48]
    pngs = [(s, png_bytes(s, W, H, px)) for s in sizes]
    header = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries = b""; blob = b""
    for s, d in pngs:
        entries += struct.pack("<BBBBHHII", s & 0xFF, s & 0xFF, 0, 0, 1, 32, len(d), offset)
        blob += d; offset += len(d)
    open(os.path.join(PUB, "favicon.ico"), "wb").write(header + entries + blob)
    print("wrote favicon.ico", sizes)

    # Remove the old wireframe SVG favicon (not the real logo).
    svg = os.path.join(PUB, "favicon.svg")
    if os.path.exists(svg):
        os.remove(svg)
        print("removed favicon.svg (wireframe placeholder)")


if __name__ == "__main__":
    main()
