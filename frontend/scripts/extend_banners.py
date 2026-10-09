"""Widens the two banner illustrations cut from the designs so they reach the text on wide screens.

The original art (characters) stays untouched on the right; on its left this script paints more of the same
scene: sky, clouds, trees, bushes, stars and sparkles, in the colors of the original. Run from frontend/:
    python3 scripts/extend_banners.py <home design.jpg> <chooser design.png>
"""
import math
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

S = 2  # draw at 2x, downscale for smooth edges


def key_out(sprite, bg, t0=18, t1=70):
    """Sprite with its flat background made transparent."""
    sprite = sprite.convert('RGB')
    out = Image.new('RGBA', sprite.size)
    src, dst = sprite.load(), out.load()
    for y in range(sprite.height):
        for x in range(sprite.width):
            c = src[x, y]
            d = math.dist(c, bg)
            a = 0 if d <= t0 else 1 if d >= t1 else (d - t0) / (t1 - t0)
            if a:
                dst[x, y] = tuple(max(0, min(255, round((c[i] - (1 - a) * bg[i]) / a))) for i in range(3)) + (round(a * 255),)
    return out


def layer_like(base, rgb):
    """Empty layer whose transparent pixels hold `rgb` (no dark fringes when blurred or resized)."""
    return Image.new('RGBA', base.size, tuple(rgb) + (0,))


def ellipse(draw, cx, cy, rx, ry, fill):
    draw.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)


def cloud(layer, cx, cy, w, fill):
    d = ImageDraw.Draw(layer)
    h = w * 0.32
    ellipse(d, cx, cy, w / 2, h / 2, fill)
    ellipse(d, cx - w * 0.18, cy - h * 0.45, w * 0.22, h * 0.7, fill)
    ellipse(d, cx + w * 0.1, cy - h * 0.7, w * 0.26, h * 0.85, fill)


def sparkle(layer, cx, cy, r, fill):
    d = ImageDraw.Draw(layer)
    pts = []
    for i in range(8):
        ang = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.28
        pts.append(((cx + rr * math.cos(ang)) * S, (cy + rr * math.sin(ang)) * S))
    d.polygon(pts, fill=fill)


def tree(layer, cx, base, size, leaf, light, trunk):
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([(cx - size * 0.07) * S, (base - size * 0.55) * S, (cx + size * 0.07) * S, base * S], radius=4 * S, fill=trunk)
    ellipse(d, cx, base - size * 0.82, size * 0.38, size * 0.36, leaf)
    ellipse(d, cx - size * 0.26, base - size * 0.6, size * 0.26, size * 0.24, leaf)
    ellipse(d, cx + size * 0.27, base - size * 0.62, size * 0.27, size * 0.25, leaf)
    ellipse(d, cx - size * 0.1, base - size * 0.92, size * 0.18, size * 0.15, light)


def paste_sprite(layer, sprite, cx, cy, scale):
    s = sprite.resize((round(sprite.width * scale * S), round(sprite.height * scale * S)), Image.LANCZOS)
    layer.alpha_composite(s, (round(cx * S - s.width / 2), round(cy * S - s.height / 2)))


def join(ext, art, overlap):
    """ext on the left, art on the right, art's first `overlap` columns fading in over ext."""
    w = ext.width + art.width - overlap
    out = Image.new('RGB', (w, art.height))
    out.paste(ext.convert('RGB'), (0, 0))
    mask = Image.new('L', art.size, 255)
    for x in range(overlap):
        for y in range(art.height):
            mask.putpixel((x, y), round(255 * x / overlap))
    out.paste(art.convert('RGB'), (ext.width - overlap, 0), mask)
    return out


def home(design_path, out_path):
    src = Image.open(design_path).convert('RGB')
    art = src.crop((658, 58, 1191, 292))  # teacher, kids and board: right of the greeting text
    W, H = 900, art.height
    rnd = random.Random(7)

    # Sky: the original's flat light blue, a touch lighter towards the bottom.
    top, bottom = (216, 235, 253), (221, 238, 253)
    sky = Image.new('RGBA', (W * S, H * S))
    sd = ImageDraw.Draw(sky)
    for y in range(H * S):
        t = y / (H * S)
        sd.line([(0, y), (W * S, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,))
    base = top

    far = layer_like(sky, base)
    x = -60
    while x < W + 80:  # pale blue hills on the horizon
        w = rnd.randint(150, 230)
        cloud(far, x, H - 30 + rnd.randint(-8, 8), w, (196, 227, 250, 255))
        x += w * 0.55
    for cx, cy, w in [(150, 42, 110), (420, 30, 140), (700, 50, 105)]:  # sky clouds
        cloud(far, cx, cy, w, (247, 251, 255, 230))
    far = far.filter(ImageFilter.GaussianBlur(1.6 * S))

    mid = layer_like(sky, base)
    for cx, size in [(250, 112), (590, 128), (820, 96)]:
        tree(mid, cx, H - 16, size, (165, 216, 190, 255), (186, 228, 205, 255), (206, 174, 140, 255))
    mid = mid.filter(ImageFilter.GaussianBlur(0.9 * S))

    near = layer_like(sky, base)
    d = ImageDraw.Draw(near)
    x = -30
    greens = [(170, 219, 199, 255), (163, 215, 193, 255), (178, 224, 205, 255)]
    while x < W + 40:  # soft green bushes along the bottom, like the original's bottom edge
        r = rnd.randint(22, 42)
        ellipse(d, x, H - 2 + rnd.randint(-6, 6), r * rnd.uniform(1.2, 1.6), r, rnd.choice(greens))
        x += r * rnd.uniform(1.2, 1.8)
    near = near.filter(ImageFilter.GaussianBlur(0.8 * S))

    deco = layer_like(sky, base)
    star = key_out(src.crop((797, 59, 830, 91)), (217, 236, 253))
    for cx, cy, sc in [(860, 150, 1.05), (690, 92, 0.8), (470, 120, 1.15), (300, 70, 0.75), (120, 140, 0.9)]:
        paste_sprite(deco, star, cx, cy, sc)
    for cx, cy, r, c in [(760, 60, 11, (255, 255, 255, 255)), (620, 160, 9, (125, 182, 245, 255)), (400, 58, 12, (255, 255, 255, 255)),
                         (520, 190, 8, (255, 255, 255, 255)), (200, 105, 10, (125, 182, 245, 255)), (40, 70, 9, (255, 255, 255, 255))]:
        sparkle(deco, cx, cy, r, c)
    deco = deco.filter(ImageFilter.GaussianBlur(0.4 * S))

    scene = sky
    for layer in (far, mid, near, deco):
        scene = Image.alpha_composite(scene, layer)
    ext = scene.convert('RGB').resize((W, H), Image.LANCZOS)
    join(ext, art, overlap=14).save(out_path)


def chooser(design_path, out_path):
    src = Image.open(design_path).convert('RGB')
    art = Image.open(out_path.replace('choose-hero-wide', 'choose-hero')).convert('RGB')  # already cleaned of the bell
    page = (243, 247, 254)
    W, H = 760, art.height
    rnd = random.Random(3)
    scene = Image.new('RGBA', (W * S, H * S), page + (255,))
    blob = layer_like(scene, page)
    d = ImageDraw.Draw(blob)
    # The pale blue cloud the kids stand on, continued to the left in soft lobes.
    for cx, cy, rx, ry in [(W + 40, 92, 150, 70), (W - 140, 98, 170, 60), (W - 360, 104, 160, 48), (W - 560, 110, 130, 38)]:
        ellipse(d, cx, cy, rx, ry, (217, 236, 253, 255))
    blob = blob.filter(ImageFilter.GaussianBlur(3 * S))
    deco = layer_like(scene, (217, 236, 253))
    star = key_out(src.crop((975, 78, 1012, 116)), src.getpixel((970, 80)))
    for cx, cy, sc in [(W - 110, 40, 0.75), (W - 300, 92, 0.95), (W - 470, 50, 0.7), (W - 640, 104, 0.6)]:
        paste_sprite(deco, star, cx, cy, sc)
    for cx, cy, r, c in [(W - 40, 30, 9, (255, 255, 255, 255)), (W - 200, 125, 8, (90, 170, 245, 255)), (W - 380, 30, 10, (255, 255, 255, 255)),
                         (W - 540, 128, 7, (90, 170, 245, 255)), (W - 700, 60, 8, (255, 255, 255, 255))]:
        sparkle(deco, cx, cy, r, c)
    deco = deco.filter(ImageFilter.GaussianBlur(0.4 * S))
    ext = Image.alpha_composite(Image.alpha_composite(scene, blob), deco).convert('RGB').resize((W, H), Image.LANCZOS)
    join(ext, art, overlap=40).save(out_path)


if __name__ == '__main__':
    home(sys.argv[1], 'public/assets/home/hero-wide.png')
    chooser(sys.argv[2], 'public/assets/games/choose-hero-wide.png')
