# Генерация PNG-иконок без сторонних библиотек: python3 tools/icons.py
import zlib, struct, math, os

def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

def make(size, path, maskable=False):
    rows = []
    r = 0.0 if maskable else 0.22
    sc = 0.72 if maskable else 1.0
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            u, v = (x + .5) / size, (y + .5) / size
            # скруглённый квадрат
            qx, qy = abs(u - .5) - (.5 - r), abs(v - .5) - (.5 - r)
            d = math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r
            a = max(0.0, min(1.0, .5 - d * size))
            g = v
            col = [int(22 + 12 * g), int(163 - 45 * g), int(74 + 30 * g)]
            # галочка
            cu, cv = (u - .5) / sc + .5, (v - .5) / sc + .5
            dd = min(seg_dist(cu, cv, .27, .53, .44, .70), seg_dist(cu, cv, .44, .70, .75, .33))
            w = max(0.0, min(1.0, .5 - (dd - .065) * size * sc))
            col = [int(c + (255 - c) * w) for c in col]
            row += bytes(col + [int(a * 255)])
        rows.append(bytes(row))
    raw = b''.join(rows)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) \
        + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(png)

d = os.path.join(os.path.dirname(__file__), '..', 'icons')
make(192, os.path.join(d, 'icon-192.png'))
make(512, os.path.join(d, 'icon-512.png'))
make(512, os.path.join(d, 'icon-maskable-512.png'), True)
make(180, os.path.join(d, 'apple-touch-icon.png'), True)
