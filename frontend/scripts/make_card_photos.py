"""Card art of the games (frontend/public/assets/games/card-*.webp) from Microsoft Fluent Emoji 3D.

The 3D emoji (MIT licence, https://github.com/microsoft/fluentui-emoji) are downloaded once into scripts/.emoji-cache,
then each card is composed on a pastel background: soft blobs, sparkles, the emoji with soft shadows. Drawn at
960x480 (the chooser shows them with object-fit: cover from about 3:1 to 1.5:1), so the motif stays in the middle
(x 180-780, y 90-390).

Usage: python3 scripts/make_card_photos.py [out_dir] [card ...]
"""
import os
import sys
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.emoji-cache')
BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets'
W, H = 960, 480


def emoji(name):
    """The 256x256 3D picture of an emoji, by its folder name in the repository ("Mouse face")."""
    slug = name.lower().replace(' ', '_').replace('-', '_')
    path = os.path.join(CACHE, f'{slug}.png')
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        for rel in (f'{name}/3D/{slug}_3d.png', f'{name}/Default/3D/{slug}_3d_default.png'):
            try:
                with urllib.request.urlopen(f'{BASE}/{urllib.parse.quote(rel)}') as res, open(path, 'wb') as out:
                    out.write(res.read())
                break
            except Exception:
                continue
        else:
            raise SystemExit(f'No 3D picture for "{name}"')
    return Image.open(path).convert('RGBA')


def hex_rgb(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def background(top, bottom, blob):
    """Diagonal pastel gradient, two big soft blobs in the corners, a few smaller ones."""
    t, b = hex_rgb(top), hex_rgb(bottom)
    # Top-left to bottom-right: 60% across, 40% down.
    across = Image.linear_gradient('L').rotate(90).transpose(Image.FLIP_LEFT_RIGHT).resize((W, H))
    down = Image.linear_gradient('L').resize((W, H))
    grad = Image.blend(across, down, 0.4)
    img = Image.composite(Image.new('RGBA', (W, H), b), Image.new('RGBA', (W, H), t), grad)
    layer = Image.new('RGBA', (W, H), hex_rgb(blob, 0))
    d = ImageDraw.Draw(layer)
    for (x, y, r, a) in [(30, 40, 170, 120), (930, 470, 190, 120), (900, 50, 60, 90), (80, 450, 50, 90)]:
        d.ellipse((x - r, y - r, x + r, y + r), fill=hex_rgb(blob, a))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(6)))
    return img


def sparkle(img, x, y, r, color='#FFFFFF', alpha=235):
    """A four-pointed twinkle."""
    layer = Image.new('RGBA', img.size, hex_rgb(color, 0))
    d = ImageDraw.Draw(layer)
    k = r * 0.22
    d.polygon([(x, y - r), (x + k, y - k), (x + r, y), (x + k, y + k), (x, y + r), (x - k, y + k), (x - r, y), (x - k, y - k)],
              fill=hex_rgb(color, alpha))
    img.alpha_composite(layer)


def glow(img, x, y, r, color, alpha=150):
    layer = Image.new('RGBA', img.size, hex_rgb(color, 0))
    ImageDraw.Draw(layer).ellipse((x - r, y - r, x + r, y + r), fill=hex_rgb(color, alpha))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r * 0.35)))


def put(img, name, cx, cy, size, rotate=0, flip=False, shadow=True, lower_half=False):
    """
    Pastes an emoji centred on (cx, cy), `size` pixels wide, with a soft shadow under it. `lower_half` pastes only
    the bottom half (the front lip of a hole, drawn again over what comes out of it).
    """
    pic = emoji(name)
    if flip:
        pic = pic.transpose(Image.FLIP_LEFT_RIGHT)
    pic = pic.resize((size, size), Image.LANCZOS)
    if rotate:
        pic = pic.rotate(rotate, resample=Image.BICUBIC, expand=True)
    x, y = int(cx - pic.width / 2), int(cy - pic.height / 2)
    if lower_half:
        front = pic.crop((0, pic.height // 2, pic.width, pic.height))
        img.alpha_composite(front, (x, y + pic.height // 2))
        return
    if shadow:
        alpha = pic.getchannel('A').point(lambda a: a * 0.28)
        sh = Image.new('RGBA', pic.size, (31, 42, 68, 0))
        sh.putalpha(alpha)
        sh = sh.filter(ImageFilter.GaussianBlur(size * 0.04))
        img.alpha_composite(sh, (x + int(size * 0.02), y + int(size * 0.06)))
    img.alpha_composite(pic, (x, y))


def floor_shadow(img, cx, cy, rx, ry, alpha=40):
    layer = Image.new('RGBA', img.size, (31, 42, 68, 0))
    ImageDraw.Draw(layer).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(31, 42, 68, alpha))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(10)))


def rope(img, x0, x1, y, thick=26):
    """A twisted rope from x0 to x1, sagging a little in the middle."""
    layer = Image.new('RGBA', img.size, (176, 122, 62, 0))
    d = ImageDraw.Draw(layer)
    pts = [(x, y + 10 * (1 - ((x - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2)) for x in range(x0, x1 + 1, 4)]
    d.line(pts, fill=hex_rgb('#B07A3E'), width=thick, joint='curve')
    for i in range(0, len(pts) - 1, 4):
        px, py = pts[i]
        d.line([(px - 6, py - thick / 2 + 3), (px + 6, py + thick / 2 - 3)], fill=hex_rgb('#E0B07A'), width=5)
    sh = layer.getchannel('A').point(lambda a: a * 0.3)
    shadow = Image.new('RGBA', img.size, (31, 42, 68, 0))
    shadow.putalpha(sh)
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(6)), (0, 10))
    img.alpha_composite(layer)


def sparkles(img, color='#FFFFFF', accent='#FFFFFF'):
    for x, y, r, c in [(116, 260, 30, color), (848, 236, 26, color), (216, 116, 16, accent), (776, 392, 16, accent)]:
        sparkle(img, x, y, r, c)


CARDS = {}


def card(name):
    def register(fn):
        CARDS[name] = fn
        return fn
    return register


@card('millionaire')
def _millionaire():
    img = background('#33449A', '#141C55', '#4A5BC0')
    glow(img, 480, 250, 190, '#FFD15C', 110)
    floor_shadow(img, 480, 400, 200, 22, 70)
    put(img, 'Money bag', 300, 300, 170, rotate=10)
    put(img, 'Gem stone', 668, 312, 140, rotate=-12)
    put(img, 'Trophy', 480, 230, 280)
    sparkles(img, '#FFE58A', '#FFFFFF')
    return img


@card('whack-mole')
def _whack_mole():
    img = background('#EAF7E2', '#BFE5A8', '#A9DA8E')
    put(img, 'Hole', 300, 360, 170, shadow=False)
    put(img, 'Hole', 660, 360, 170, shadow=False)
    put(img, 'Hole', 480, 380, 210, shadow=False)
    put(img, 'Mouse face', 480, 300, 200)
    put(img, 'Hole', 480, 380, 210, shadow=False, lower_half=True)
    put(img, 'Hammer', 650, 170, 200, rotate=35)
    put(img, 'Dizzy', 350, 170, 90)
    sparkles(img, '#FFFFFF', '#2E9E6A')
    return img


@card('tug-of-war')
def _tug_of_war():
    img = background('#E6F2FF', '#BCDDFB', '#A9D1F7')
    floor_shadow(img, 480, 400, 320, 18, 45)
    rope(img, 210, 750, 262)
    put(img, 'Triangular flag', 488, 214, 120)
    put(img, 'Flexed biceps', 220, 250, 190, rotate=-6, flip=True)
    put(img, 'Flexed biceps', 740, 250, 190, rotate=6)
    sparkles(img, '#FFFFFF', '#3563E9')
    return img


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'public', 'assets', 'games')
    names = sys.argv[2:] or list(CARDS)
    for name in names:
        CARDS[name]().convert('RGB').save(os.path.join(out, f'card-{name}.webp'), 'WEBP', quality=84, method=6)
    print(len(names), 'cards:', ', '.join(names))
