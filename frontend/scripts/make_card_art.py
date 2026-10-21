"""Card art of every game (frontend/public/assets/games/card-*.svg).

Vector, so the cards stay sharp at any size and pixel density. Drawn 480x240; the chooser shows them with
object-fit: cover in boxes from about 3:1 to 1.5:1, so the motif stays inside the safe area in the middle
(x 90-390, y 45-195) and only the background reaches the edges.

Usage: python3 scripts/make_card_art.py [out_dir]
"""
import math
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/games'
W, H = 480, 240
FONT = 'Nunito, Arial, Helvetica, sans-serif'


def sparkle(x, y, r, color='#FFFFFF', op=0.95):
    return (f'<path d="M{x} {y - r} Q{x + r * .18} {y - r * .18} {x + r} {y} Q{x + r * .18} {y + r * .18} {x} {y + r} '
            f'Q{x - r * .18} {y + r * .18} {x - r} {y} Q{x - r * .18} {y - r * .18} {x} {y - r}Z" fill="{color}" opacity="{op}"/>')


def text(x, y, s, size, fill='#1F2A44', weight=900, anchor='middle'):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'text-anchor="{anchor}">{s}</text>')


def rect(x, y, w, h, rx, fill, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'


def card(name, top, bottom, blob, body, spark='#FFFFFF', accent=None):
    """Pastel ground, two soft blobs in the corners, sparkles at the sides, then the motif (with soft shadows)."""
    accent = accent or spark
    return name, f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#1F2A44" flood-opacity="0.14"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<circle cx="14" cy="18" r="78" fill="{blob}" opacity="0.6"/>
<circle cx="470" cy="236" r="88" fill="{blob}" opacity="0.6"/>
<circle cx="452" cy="26" r="28" fill="{blob}" opacity="0.4"/>
<circle cx="38" cy="226" r="22" fill="{blob}" opacity="0.4"/>
{sparkle(58, 130, 15, spark)}{sparkle(424, 118, 13, spark)}{sparkle(108, 58, 8, accent, 0.8)}{sparkle(388, 196, 8, accent, 0.8)}
<g filter="url(#sh)">
{body}
</g>
</svg>'''


cards = []


def star(cx, cy, r, fill):
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{fill}" stroke-width="2" stroke-linejoin="round"/>'


def smiley(cx, cy, r, ink):
    return (f'<circle cx="{cx - r * .38}" cy="{cy - r * .15}" r="{r * .12}" fill="{ink}"/><circle cx="{cx + r * .38}" cy="{cy - r * .15}" r="{r * .12}" fill="{ink}"/>'
            f'<path d="M{cx - r * .4} {cy + r * .2} Q{cx} {cy + r * .62} {cx + r * .4} {cy + r * .2}" stroke="{ink}" stroke-width="3" fill="none" stroke-linecap="round"/>')


def apple(cx, cy):
    return (f'<circle cx="{cx}" cy="{cy + 2}" r="13" fill="#E5484D"/><path d="M{cx} {cy - 10} q2 -6 6 -8" stroke="#6B4E2E" stroke-width="2.5" fill="none"/>'
            f'<ellipse cx="{cx + 7}" cy="{cy - 12}" rx="5" ry="2.6" fill="#2E9E6A" transform="rotate(-25 {cx + 7} {cy - 12})"/>'
            + smiley(cx, cy + 2, 10, '#7A1F22'))

# --- Lật ô thi đua: numbered tiles, one turned into a star, one into a smiley. ---
tiles = ''
for i, (label, fill, ink) in enumerate([('1', '#FFFFFF', '#3563E9'), ('★', '#FFC93C', '#FFFFFF'), ('3', '#FFFFFF', '#3563E9'),
                                        ('4', '#FFFFFF', '#3563E9'), ('☺', '#FFB4A8', '#B4473A'), ('6', '#FFFFFF', '#3563E9')]):
    x, y = 150 + (i % 3) * 64, 56 + (i // 3) * 66
    tiles += rect(x, y, 54, 54, 14, fill) + rect(x, y + 46, 54, 8, 4, '#1F2A44', 'opacity="0.06"')
    if label == '★':
        tiles += star(x + 27, y + 27, 16, ink)
    elif label == '☺':
        tiles += smiley(x + 27, y + 27, 18, ink)
    else:
        tiles += text(x + 27, y + 38, label, 30, ink)
cards.append(card('grid-board', '#E3EAFE', '#C9D7FB', '#B7C9F8', tiles, '#FFFFFF', '#3563E9'))

# --- Trắc nghiệm: speech bubble with "?", three answers. ---
quiz = ('<path d="M128 62 h88 a22 22 0 0 1 22 22 v58 a22 22 0 0 1 -22 22 h-52 l-26 22 v-22 h-10 a22 22 0 0 1 -22 -22 v-58 a22 22 0 0 1 22 -22z" fill="#FFFFFF"/>'
        + text(172, 140, '?', 72, '#F28C28'))
for i, (letter, color, soft) in enumerate([('A', '#3563E9', '#D8E3FD'), ('B', '#D99A12', '#FFF0C2'), ('C', '#E5484D', '#FFD9DA')]):
    y = 64 + i * 42
    quiz += rect(262, y, 120, 32, 16, '#FFFFFF' if i != 1 else '#FFF7DC')
    quiz += f'<circle cx="279" cy="{y + 16}" r="11" fill="{soft}"/>' + text(279, y + 21, letter, 13, color)
    quiz += rect(298, y + 13, 66 if i != 1 else 50, 7, 3.5, '#DCE2EE')
cards.append(card('quiz', '#FFF4D6', '#FFE3A1', '#FFD879', quiz, '#FFFFFF', '#F2A93B'))

# --- Rung chuông vàng: golden bell, answer boards raised on both sides. ---
bell = '''<g transform="translate(240 118)">
  <path d="M-46 36 C-46 -6 -34 -40 0 -45 C34 -40 46 -6 46 36 L56 46 L-56 46 Z" fill="#FFC93C" stroke="#D99A12" stroke-width="3.5"/>
  <path d="M-28 -12 C-23 -28 -14 -35 -3 -38" stroke="#FFF3C4" stroke-width="8" stroke-linecap="round" fill="none"/>
  <circle cx="0" cy="53" r="10" fill="#D99A12"/>
  <rect x="-8" y="-60" width="16" height="16" rx="5" fill="#D99A12"/>
</g>
<path d="M164 70 l-14 -8 M160 96 h-16 M316 70 l14 -8 M320 96 h16" stroke="#F2A93B" stroke-width="6" stroke-linecap="round"/>'''
boards = ''
for x, letter, color in [(96, 'A', '#3563E9'), (324, 'C', '#2E9E6A')]:
    boards += rect(x, 120, 60, 44, 10, '#FFFFFF', 'stroke="#F0D9A0" stroke-width="2"') + text(x + 30, 151, letter, 24, color)
    boards += rect(x + 26, 164, 8, 22, 3, '#C9A46B')
cards.append(card('golden-bell', '#FFF6DC', '#FFE6A6', '#FFD879', boards + bell, '#FFFFFF', '#F2A93B'))


# --- Đua thuyền: three boats on a river racing to the dock. ---
def boat(x, y, hull, sail):
    return f'''<g transform="translate({x} {y})">
  <rect x="-2" y="-46" width="5" height="46" fill="#6B4E2E"/>
  <path d="M3 -44 L36 -12 L3 -6 Z" fill="#FFFFFF"/><path d="M-2 -38 L-26 -8 L-2 -6 Z" fill="{sail}"/>
  <path d="M-40 0 L42 0 L28 20 L-26 20 Z" fill="{hull}"/><path d="M-32 6 H34" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="3"/>
</g>'''


river = ('<path d="M-10 118 C90 104 170 128 260 116 C350 104 420 124 500 112 L500 260 L-10 260 Z" fill="#7CC4F0"/>'
         '<path d="M40 160 q16 -7 32 0 t32 0 M250 196 q16 -7 32 0 t32 0 M150 214 q14 -6 28 0" stroke="#C6E9FC" stroke-width="4" fill="none" stroke-linecap="round"/>'
         '<rect x="380" y="96" width="70" height="150" fill="#C89B6D"/>'
         + ''.join(f'<rect x="380" y="{y}" width="70" height="3" fill="#A87C50"/>' for y in range(112, 240, 16))
         + '<rect x="392" y="44" width="5" height="62" fill="#6B4E2E"/><rect x="397" y="46" width="38" height="24" fill="#1F2A44"/>'
         + ''.join(f'<rect x="{397 + c * 8}" y="{46 + r * 8}" width="8" height="8" fill="#FFFFFF"/>' for c in range(5) for r in range(3) if (c + r) % 2 == 0))
cards.append(card('boat-race', '#E9F6FF', '#CBEAFE', '#B5DFFB',
                  river + boat(150, 140, '#F28C28', '#FFE08A') + boat(240, 172, '#3563E9', '#BFD7FF') + boat(318, 150, '#2E9E6A', '#C3F0D2'),
                  '#FFFFFF', '#3563E9'))

# --- Nối cặp: two columns joined by curved lines. ---
match = ''
for i, (left, right) in enumerate([('🍎', 'Ngôi sao'), ('⭐', 'Quả táo')]):
    y = 66 + i * 70
    match += rect(118, y, 76, 50, 14, '#FFFFFF') + (apple(156, y + 24) if i == 0 else star(156, y + 25, 15, '#FFC93C'))
    match += rect(286, y, 104, 50, 14, '#FFFFFF') + text(338, y + 32, right, 17)
match += ('<path d="M204 91 C 240 91, 240 161, 276 161" stroke="#2E9E6A" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
          '<path d="M204 161 C 240 161, 240 91, 276 91" stroke="#2E9E6A" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-dasharray="1 10"/>'
          '<circle cx="204" cy="91" r="6" fill="#2E9E6A"/><circle cx="276" cy="161" r="6" fill="#2E9E6A"/>'
          '<circle cx="204" cy="161" r="6" fill="#2E9E6A"/><circle cx="276" cy="91" r="6" fill="#2E9E6A"/>')
cards.append(card('matching', '#E5F7EE', '#C8EED9', '#AFE3C6', match, '#FFFFFF', '#2E9E6A'))


# --- Lật thẻ trí nhớ: two cards face down around one face up with a cat. ---
def back_card(x, y, rot):
    return (f'<g transform="translate({x} {y}) rotate({rot})">' + rect(-34, -48, 68, 96, 12, '#8B5CF6')
            + rect(-27, -41, 54, 82, 8, 'none', 'stroke="#FFFFFF" stroke-width="2.5" stroke-dasharray="4 5"')
            + text(0, 12, '?', 36, '#FFFFFF') + '</g>')


cat = ('<g transform="translate(240 120)">' + rect(-38, -54, 76, 108, 13, '#FFFFFF', 'stroke="#8B5CF6" stroke-width="4"')
       + '<path d="M-22 -6 L-24 -30 L-8 -18 Z M22 -6 L24 -30 L8 -18 Z" fill="#FFC93C"/><circle cx="0" cy="2" r="24" fill="#FFC93C"/>'
       + '<circle cx="-8" cy="-2" r="3" fill="#1F2A44"/><circle cx="8" cy="-2" r="3" fill="#1F2A44"/>'
       + '<path d="M-4 8 Q0 12 4 8" stroke="#1F2A44" stroke-width="2" fill="none" stroke-linecap="round"/></g>')
cards.append(card('memory', '#F1EAFE', '#DDCCFB', '#CDB6F8', back_card(168, 124, -10) + back_card(312, 124, 10) + cat, '#FFFFFF', '#8B5CF6'))

# --- Ô chữ bí mật: rows lined up on a yellow keyword column. ---
cells = ''
layout = [('MÈO', 1), ('SÁCH', 2), ('HOA', 0), ('TRỜI', 2)]
key_col = 6
for r, (word, key) in enumerate(layout):
    start = key_col - key
    for i, ch in enumerate(word):
        x = 70 + (start + i) * 34
        y = 52 + r * 36
        is_key = start + i == key_col
        cells += rect(x, y, 30, 30, 7, '#FFD15C' if is_key else '#FFFFFF', 'stroke="#C9B6F2" stroke-width="2"')
        if r < 3:
            cells += text(x + 15, y + 22, ch, 17)
cards.append(card('crossword', '#F3EDFE', '#E0D3FC', '#D2BFFA', cells, '#FFFFFF', '#8B5CF6'))

# --- Sắp xếp thứ tự: numbered cards climbing, with an arrow. ---
order = ''
for i, (n, c) in enumerate([('1', '#3563E9'), ('2', '#F28C28'), ('3', '#2E9E6A'), ('4', '#8B5CF6')]):
    x = 132 + i * 56
    y = 108 - i * 14
    order += rect(x, y, 46, 56, 12, '#FFFFFF', f'stroke="{c}" stroke-width="3.5"') + text(x + 23, y + 39, n, 28, c)
order += '<path d="M132 186 H352" stroke="#2E9E6A" stroke-width="6" stroke-linecap="round"/><path d="M350 176 L366 186 L350 196 Z" fill="#2E9E6A"/>'
cards.append(card('ordering', '#E6F7EE', '#C9EED9', '#B0E4C8', order, '#FFFFFF', '#2E9E6A'))


# --- Phân loại: two baskets with cards dropping in. ---
def basket(x, color, label):
    return (f'<g transform="translate({x} 120)"><path d="M-48 0 H48 L38 58 H-38 Z" fill="{color}"/>'
            '<path d="M-48 0 H48" stroke="#FFFFFF" stroke-width="4" opacity="0.6"/>'
            '<path d="M-32 10 L-27 50 M-11 10 L-9 50 M11 10 L9 50 M32 10 L27 50" stroke="#FFFFFF" stroke-width="2.5" opacity="0.5"/>'
            + text(0, 40, label, 20, '#FFFFFF') + '</g>')


drops = (rect(196, 52, 42, 32, 8, '#FFFFFF', 'stroke="#F28C28" stroke-width="2.5" transform="rotate(-12 217 68)"')
         + rect(248, 62, 42, 32, 8, '#FFFFFF', 'stroke="#3563E9" stroke-width="2.5" transform="rotate(9 269 78)"')
         + '<path d="M200 100 q-10 10 -20 12" stroke="#F28C28" stroke-width="3" fill="none" stroke-dasharray="2 6" stroke-linecap="round"/>'
         + '<path d="M286 104 q10 8 20 10" stroke="#3563E9" stroke-width="3" fill="none" stroke-dasharray="2 6" stroke-linecap="round"/>')
cards.append(card('sorting', '#FFF0E3', '#FCD9BD', '#FBCBA5', basket(160, '#F28C28', 'A') + basket(320, '#3563E9', 'B') + drops, '#FFFFFF', '#F28C28'))

# --- Vòng quay may mắn: wheel with a pointer. ---
segments = ''
colors = ['#FFD15C', '#C9B6F2', '#9FD9B4', '#FF9B8E', '#A9D6F5', '#FFC6A0', '#B7E4C7', '#F7B5CF']
for i, c in enumerate(colors):
    a0, a1 = math.radians(i * 45 - 90), math.radians((i + 1) * 45 - 90)
    x0, y0 = 240 + 62 * math.cos(a0), 126 + 62 * math.sin(a0)
    x1, y1 = 240 + 62 * math.cos(a1), 126 + 62 * math.sin(a1)
    segments += f'<path d="M240 126 L{x0:.1f} {y0:.1f} A62 62 0 0 1 {x1:.1f} {y1:.1f} Z" fill="{c}"/>'
wheel = (f'<circle cx="240" cy="126" r="69" fill="#FFFFFF"/>{segments}<circle cx="240" cy="126" r="12" fill="#1F2A44"/>'
         '<circle cx="240" cy="126" r="4.5" fill="#FFFFFF"/><path d="M229 46 L251 46 L240 66 Z" fill="#E5484D"/>')
cards.append(card('spin-wheel', '#FFE8DE', '#FDD3C2', '#FBC0A9', wheel, '#FFFFFF', '#F2A93B'))


# --- Đua tên: a folder of five name pickers (horse, balloon, claw, fish, rocket) on a race track. ---
def tile(x, y, bg, inner):
    return f'<g transform="translate({x} {y})">{rect(-28, -28, 56, 56, 15, bg)}{inner}</g>'


horse = ('<path d="M-12 14 L-12 -4 Q-12 -14 -2 -16 L6 -22 L8 -14 Q16 -10 14 0 L4 -2 L4 14 Z" fill="#B5733C"/>'
         '<path d="M-2 -16 Q-10 -12 -12 -2" stroke="#5A3A1C" stroke-width="4" fill="none"/><circle cx="6" cy="-10" r="1.8" fill="#1F2A44"/>')
balloon = ('<ellipse cx="0" cy="-6" rx="14" ry="17" fill="#E5484D"/><path d="M-3 11 L3 11 L0 15 Z" fill="#E5484D"/>'
           '<path d="M0 15 q-4 6 0 12" stroke="#5B6478" stroke-width="1.5" fill="none"/><ellipse cx="-5" cy="-12" rx="3" ry="5" fill="#FFFFFF" opacity="0.6"/>')
claw = ('<rect x="-2" y="-24" width="4" height="14" fill="#5B6478"/><rect x="-10" y="-12" width="20" height="6" rx="3" fill="#5B6478"/>'
        '<path d="M-8 -6 L-12 6 L-6 10 M8 -6 L12 6 L6 10" stroke="#5B6478" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        '<circle cx="0" cy="14" r="8" fill="#FFC93C"/>')
fish = ('<path d="M-14 0 Q0 -14 12 0 Q0 14 -14 0 Z" fill="#3563E9"/><path d="M12 0 L22 -8 L22 8 Z" fill="#3563E9"/>'
        '<circle cx="-6" cy="-2" r="2" fill="#FFFFFF"/>')
rocket = ('<path d="M0 -22 Q10 -10 8 10 L-8 10 Q-10 -10 0 -22 Z" fill="#FFFFFF" stroke="#8B5CF6" stroke-width="2.5"/>'
          '<circle cx="0" cy="-6" r="4" fill="#8B5CF6"/><path d="M-8 4 L-14 14 L-8 12 Z M8 4 L14 14 L8 12 Z" fill="#8B5CF6"/>'
          '<path d="M-4 12 Q0 22 4 12 Z" fill="#F28C28"/>')
track = ('<rect x="-10" y="150" width="500" height="100" fill="#E7C48F"/><rect x="-10" y="150" width="500" height="5" fill="#FFFFFF" opacity="0.8"/>'
         '<path d="M-10 196 H500" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12" opacity="0.7"/>'
         + ''.join(f'<path d="M{x} 36 l12 16 l12 -16 z" fill="{c}"/>' for x, c in zip(range(80, 420, 26),
                   ['#E5484D', '#FFC93C', '#3563E9', '#2E9E6A', '#8B5CF6', '#F28C28'] * 3))
         + '<path d="M70 36 Q240 52 430 36" stroke="#5B6478" stroke-width="2" fill="none"/>')
folder = (tile(108, 112, '#FFF4D6', horse) + tile(174, 112, '#FFE4E4', balloon) + tile(240, 112, '#FFF0C2', claw)
          + tile(306, 112, '#DCEBFF', fish) + tile(372, 112, '#EDE4FF', rocket))
cards.append(card('name-race', '#E9F7E2', '#CDEBC0', '#B9E2A8', track + folder, '#FFFFFF', '#2E9E6A'))


# --- Chia nhóm ngẫu nhiên: three groups of children. ---
def person(x, y, c, s=1.0):
    return f'<circle cx="{x}" cy="{y}" r="{9 * s}" fill="{c}"/><path d="M{x - 14 * s} {y + 30 * s} q{14 * s} -22 {28 * s} 0 z" fill="{c}"/>'


groups = ''
for gx, c in [(150, '#F28C28'), (240, '#3563E9'), (330, '#2E9E6A')]:
    groups += f'<circle cx="{gx}" cy="122" r="44" fill="#FFFFFF"/>'
    groups += person(gx - 17, 104, c) + person(gx + 17, 104, c) + person(gx, 124, c, 1.1)
cards.append(card('team-maker', '#EAF1FE', '#D2DFFB', '#BFD1FA', groups, '#FFFFFF', '#3563E9'))

# --- Đồng hồ đếm ngược: stopwatch and the time. ---
watch = '''<g transform="translate(296 122)">
  <rect x="-11" y="-72" width="22" height="14" rx="4" fill="#E5484D"/>
  <circle cx="0" cy="0" r="58" fill="#FFFFFF" stroke="#E5484D" stroke-width="9"/>
  <path d="M0 0 L0 -40 A40 40 0 0 1 35 -20 Z" fill="#FFD3D4"/>
  <path d="M0 0 L0 -36" stroke="#1F2A44" stroke-width="5" stroke-linecap="round"/>
  <path d="M0 0 L22 13" stroke="#1F2A44" stroke-width="5" stroke-linecap="round"/>
  <circle cx="0" cy="0" r="6" fill="#1F2A44"/>
</g>''' + rect(112, 98, 110, 48, 14, '#FFFFFF') + text(167, 132, '05:00', 26, '#E5484D')
cards.append(card('timer', '#FDECEC', '#FAD0D1', '#F8BDBF', watch, '#FFFFFF', '#E5484D'))


# --- Xúc xắc: two dice tumbling. ---
def die(x, y, rot, pips, c):
    dots = ''.join(f'<circle cx="{px}" cy="{py}" r="6" fill="{c}"/>' for px, py in pips)
    return f'<g transform="translate({x} {y}) rotate({rot})">{rect(-36, -36, 72, 72, 16, "#FFFFFF", f"stroke=\'{c}\' stroke-width=\'4\'")}{dots}</g>'


five = [(-18, -18), (18, -18), (0, 0), (-18, 18), (18, 18)]
three = [(-18, -18), (0, 0), (18, 18)]
cards.append(card('dice', '#FFF3E3', '#FFDDB5', '#FFCF96', die(200, 118, -12, five, '#E5484D') + die(290, 126, 10, three, '#3563E9'), '#FFFFFF', '#F28C28'))


# --- Gọi tên: one card per name picker. ---

def horse(x, y, color, mane, tag):
    dark = '#00000022'
    return f'''<g transform="translate({x} {y}) scale(1.2)">
  <path d="M-30 -6 q-16 2 -18 20" stroke="{mane}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <rect x="-24" y="6" width="7" height="26" rx="3" fill="{color}"/><rect x="-24" y="6" width="7" height="26" rx="3" fill="{dark}"/>
  <rect x="-12" y="8" width="7" height="24" rx="3" fill="{color}"/>
  <rect x="12" y="8" width="7" height="24" rx="3" fill="{color}"/><rect x="12" y="8" width="7" height="24" rx="3" fill="{dark}"/>
  <rect x="22" y="6" width="7" height="26" rx="3" fill="{color}"/>
  <ellipse cx="0" cy="0" rx="32" ry="17" fill="{color}"/>
  <path d="M16 -8 L28 -34 L42 -30 L32 4 Z" fill="{color}"/>
  <ellipse cx="42" cy="-31" rx="14" ry="9" fill="{color}" transform="rotate(22 42 -31)"/>
  <path d="M28 -40 l4 -11 l5 10 z" fill="{color}"/>
  <path d="M18 -10 Q22 -28 30 -40" stroke="{mane}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="44" cy="-34" r="2.4" fill="#1F2A44"/>
  {rect(-12, -10, 24, 15, 5, '#FFFFFF')}{text(0, 1, tag, 10)}
</g>'''


track2 = ('<rect x="-10" y="132" width="500" height="120" fill="#E7C48F"/><rect x="-10" y="130" width="500" height="5" fill="#FFFFFF" opacity="0.85"/>'
          '<path d="M-10 178 H500 M-10 222 H500" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="14 12" opacity="0.6"/>'
          '<rect x="432" y="60" width="10" height="190" fill="#1F2A44"/>'
          + ''.join(f'<rect x="432" y="{y}" width="10" height="10" fill="#FFFFFF"/>' for y in range(60, 250, 20))
          + ''.join(f'<path d="M{x} 30 l12 16 l12 -16 z" fill="{c}"/>' for x, c in zip(range(40, 460, 26), ['#E5484D', '#FFC93C', '#3563E9', '#2E9E6A', '#8B5CF6', '#F28C28'] * 3))
          + '<path d="M30 30 Q240 46 470 30" stroke="#5B6478" stroke-width="2" fill="none"/>')
cards.append(card('pick-horse', '#E4F6FF', '#CDEBFA', '#B9E2F7',
                  track2 + horse(150, 116, '#B5733C', '#5A3A1C', 'An') + horse(340, 116, '#8A5A3B', '#3E2414', 'Chi')
                  + horse(240, 160, '#E59A4F', '#9A5A1E', 'Bảo'), '#FFFFFF', '#3563E9'))


def balloon2(x, y, color, tag, scale=1.0):
    return f'''<g transform="translate({x} {y}) scale({scale})">
  <path d="M0 30 q-6 14 2 28 q6 12 -2 24" stroke="#7A8499" stroke-width="2" fill="none"/>
  <ellipse cx="0" cy="0" rx="24" ry="29" fill="{color}"/><path d="M-5 28 L5 28 L0 34 Z" fill="{color}"/>
  <ellipse cx="-9" cy="-11" rx="5" ry="9" fill="#FFFFFF" opacity="0.5"/>
  {text(0, 5, tag, 12, '#FFFFFF')}
</g>'''


clouds = ''.join(f'<g fill="#FFFFFF" opacity="0.9"><ellipse cx="{x}" cy="{y}" rx="26" ry="11"/><ellipse cx="{x + 16}" cy="{y - 8}" rx="16" ry="12"/></g>'
                 for x, y in [(70, 70), (360, 52), (420, 150)])
hill = '<path d="M-10 214 Q120 176 250 206 T500 196 L500 250 L-10 250 Z" fill="#B7E4A0"/>'
cards.append(card('pick-balloon', '#EAF4FF', '#F8E6F4', '#DCE9FB',
                  clouds + hill + balloon2(150, 120, '#3563E9', 'An') + balloon2(205, 92, '#F28C28', 'Hà', 1.05)
                  + balloon2(262, 64, '#E5484D', 'Chi', 1.12) + balloon2(318, 104, '#2E9E6A', 'Mai') + balloon2(366, 132, '#8B5CF6', 'Vy', 0.9),
                  '#FFFFFF', '#E5484D'))

plush = ''.join(f'<circle cx="{x}" cy="{y}" r="13" fill="{c}"/><circle cx="{x - 5}" cy="{y - 2}" r="1.8" fill="#1F2A44"/><circle cx="{x + 5}" cy="{y - 2}" r="1.8" fill="#1F2A44"/>'
                for x, y, c in [(188, 160, '#FFD15C'), (214, 164, '#9FD9B4'), (240, 160, '#A9D6F5'), (266, 164, '#F7B5CF'), (292, 160, '#C9B6F2'),
                                (201, 142, '#FF9B8E'), (229, 140, '#FFC6A0'), (279, 142, '#B7E4C7')])
machine = (rect(150, 46, 180, 150, 22, '#F27BA6') + rect(162, 54, 156, 16, 8, '#FFD3E2') + text(240, 66, 'MÁY GẮP THÚ', 11, '#C2417B')
           + rect(164, 76, 152, 100, 10, '#E9F4FF') + '<path d="M178 82 L196 172 M282 82 L300 172" stroke="#FFFFFF" stroke-width="5" opacity="0.7"/>'
           + plush + '<rect x="252" y="76" width="4" height="26" fill="#5B6478"/><rect x="242" y="100" width="24" height="7" rx="3.5" fill="#5B6478"/>'
           + '<path d="M244 107 L238 122 L245 126 M264 107 L270 122 L263 126" stroke="#5B6478" stroke-width="4" fill="none" stroke-linecap="round"/>'
           + '<circle cx="254" cy="134" r="12" fill="#FFD15C"/><circle cx="249" cy="132" r="1.8" fill="#1F2A44"/><circle cx="259" cy="132" r="1.8" fill="#1F2A44"/>'
           + rect(164, 180, 46, 12, 4, '#2A2F45') + '<circle cx="290" cy="186" r="7" fill="#FFC93C"/><circle cx="270" cy="186" r="6" fill="#E5484D"/>')
cards.append(card('pick-claw', '#F6EEFF', '#FBE3F0', '#E8D7FB', machine, '#FFFFFF', '#C2417B'))


def fish2(x, y, color, tag, flip=False):
    s = -1 if flip else 1
    return f'''<g transform="translate({x} {y}) scale({s * 1.3} 1.3)">
  <path d="M-26 0 Q0 -22 22 0 Q0 22 -26 0 Z" fill="{color}"/><path d="M22 0 L38 -12 L38 12 Z" fill="{color}"/>
  <circle cx="-12" cy="-4" r="3" fill="#FFFFFF"/><circle cx="-12" cy="-4" r="1.4" fill="#1F2A44"/>
</g>{text(x + (8 if not flip else -8), y + 5, tag, 12, '#FFFFFF')}'''


pond = ('<path d="M-10 108 C90 98 170 116 260 108 C350 100 420 114 500 106 L500 250 L-10 250 Z" fill="#7CC4F0"/>'
        '<path d="M60 150 q14 -6 28 0 t28 0 M300 206 q14 -6 28 0 t28 0" stroke="#C6E9FC" stroke-width="4" fill="none" stroke-linecap="round"/>'
        '<rect x="-10" y="92" width="130" height="16" rx="4" fill="#B98552"/><rect x="20" y="108" width="10" height="60" fill="#8E6236"/><rect x="80" y="108" width="10" height="60" fill="#8E6236"/>'
        '<path d="M70 92 Q170 10 300 40" stroke="#6B4E2E" stroke-width="5" fill="none" stroke-linecap="round"/>'
        '<path d="M300 40 V150" stroke="#5B6478" stroke-width="2"/><path d="M300 150 q0 10 -8 8" stroke="#5B6478" stroke-width="3" fill="none"/>'
        '<ellipse cx="300" cy="112" rx="7" ry="5" fill="#E5484D"/><path d="M293 112 h14" stroke="#FFFFFF" stroke-width="2"/>')
cards.append(card('pick-fishing', '#E8F7EC', '#CFEBF7', '#BFE5D0',
                  pond + fish2(228, 168, '#F28C28', 'An') + fish2(352, 150, '#8B5CF6', 'Bảo', True) + fish2(296, 192, '#2E9E6A', 'Chi'),
                  '#FFFFFF', '#3563E9'))


def rocket2(x, y, color, flame=False):
    fire = '<path d="M-8 34 Q0 62 8 34 Z" fill="#FFB547"/><path d="M-4 34 Q0 50 4 34 Z" fill="#FFF3C4"/>' if flame else ''
    return f'''<g transform="translate({x} {y})">{fire}
  <path d="M0 -40 Q16 -18 13 30 L-13 30 Q-16 -18 0 -40 Z" fill="#FFFFFF"/>
  <path d="M0 -40 Q9 -28 11 -18 L-11 -18 Q-9 -28 0 -40 Z" fill="{color}"/>
  <circle cx="0" cy="-2" r="7" fill="{color}"/><circle cx="0" cy="-2" r="4" fill="#BFE3FF"/>
  <path d="M-13 14 L-24 34 L-13 30 Z M13 14 L24 34 L13 30 Z" fill="{color}"/>
</g>'''


space = ('<circle cx="372" cy="70" r="32" fill="#FFF3C4"/><circle cx="362" cy="62" r="6" fill="#F2D98A"/><circle cx="382" cy="82" r="4" fill="#F2D98A"/>'
         + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" opacity="0.9"/>' for x, y, r in
                   [(120, 40, 2), (180, 70, 1.6), (260, 30, 2.2), (300, 90, 1.5), (420, 140, 1.8), (90, 120, 1.6), (230, 120, 1.4)])
         + '<path d="M-10 214 Q240 188 500 214 L500 250 L-10 250 Z" fill="#3B4C94"/>'
         + ''.join(rect(x - 20, 196, 40, 8, 4, '#8A97C9') for x in (170, 240, 310)))
cards.append(card('pick-rocket', '#2B3A7A', '#1B2552', '#3B4C94',
                  space + rocket2(170, 158, '#E5484D') + rocket2(240, 112, '#F28C28', True) + rocket2(310, 158, '#8B5CF6'),
                  '#FFFFFF', '#FFD15C'))

# --- Ai là triệu phú: the lit stage, a gold diamond with the question mark, the ladder beside it. ---
ladder = ''.join(rect(330, 52 + i * 18, 62, 13, 6, '#F28C28' if i == 3 else '#22307A') for i in range(8))
millionaire = (f'<circle cx="210" cy="122" r="74" fill="#22307A"/>'
               f'<polygon points="210,60 268,122 210,184 152,122" fill="#FFD15C" stroke="#C9A13B" stroke-width="5" stroke-linejoin="round"/>'
               + text(210, 142, '?', 64, '#22307A') + ladder
               + rect(120, 190, 180, 18, 9, '#14215E') + rect(126, 194, 168, 10, 5, '#C9A13B', 'opacity="0.6"'))
cards.append(card('millionaire', '#2B3A86', '#121B52', '#3B4CA8', millionaire, '#FFD15C', '#FFFFFF'))

# --- Kéo co: the rope with its red ribbon over the middle line, two teams' hands pulling. ---
tug = ('<rect x="0" y="150" width="480" height="90" fill="#9ED37E"/>'
       '<line x1="240" y1="140" x2="240" y2="236" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="10 8"/>'
       '<path d="M80 128 H400" stroke="#B07A3E" stroke-width="12" stroke-linecap="round"/>'
       '<path d="M80 128 H400" stroke="#D9A566" stroke-width="4" stroke-dasharray="9 11"/>'
       '<path d="M240 128 l-16 40 h32 z" fill="#E5484D"/>'
       + ''.join(f'<circle cx="{x}" cy="128" r="14" fill="#FFD9B8" stroke="{c}" stroke-width="6"/>' for x, c in
                 [(112, '#F28C28'), (152, '#F28C28'), (328, '#3563E9'), (368, '#3563E9')])
       + rect(90, 60, 94, 34, 17, '#F28C28') + text(137, 84, 'ĐỘI 1', 18, '#FFFFFF')
       + rect(296, 60, 94, 34, 17, '#3563E9') + text(343, 84, 'ĐỘI 2', 18, '#FFFFFF'))
cards.append(card('tug-of-war', '#E6F4FF', '#CDE8FD', '#B8DDFB', tug, '#FFFFFF', '#E5484D'))


def flower(cx, cy, r, petal, label=''):
    petals = ''.join(f'<ellipse cx="{cx}" cy="{cy - r * .55}" rx="{r * .38}" ry="{r * .52}" fill="{petal}" transform="rotate({a} {cx} {cy})"/>'
                     for a in (0, 72, 144, 216, 288))
    return petals + f'<circle cx="{cx}" cy="{cy}" r="{r * .42}" fill="#FFF6C7" stroke="#F2B705" stroke-width="2.5"/>' + (text(cx, cy + 6, label, 16, '#5A3A00') if label else '')


# --- Hái hoa dân chủ: a round tree full of numbered flowers. ---
tree = ('<path d="M226 230 Q236 170 228 140 L252 140 Q246 170 256 230 Z" fill="#9A6B43"/>'
        '<ellipse cx="240" cy="104" rx="140" ry="74" fill="#7CC36B"/><ellipse cx="240" cy="84" rx="96" ry="50" fill="#8ED07B"/>'
        + ''.join(flower(x, y, 26, c, n) for x, y, c, n in
                  [(160, 100, '#FF8FB1', '1'), (214, 70, '#FFB547', '2'), (272, 76, '#B98CFF', '3'), (322, 108, '#5EC2FF', '4'),
                   (204, 132, '#FF7A6B', '5'), (268, 136, '#F7D046', '6')]))
cards.append(card('flower-pick', '#FFF0F5', '#FFDCE8', '#FFC9DB', tree, '#FFFFFF', '#FF6F9C'))


def mole(cx, cy, label, fill='#FFFFFF'):
    return (f'<ellipse cx="{cx}" cy="{cy + 34}" rx="44" ry="12" fill="#4E3524"/>'
            f'<path d="M{cx - 30} {cy + 34} Q{cx - 30} {cy - 18} {cx} {cy - 18} Q{cx + 30} {cy - 18} {cx + 30} {cy + 34} Z" fill="#8B5E3C"/>'
            f'<ellipse cx="{cx}" cy="{cy + 14}" rx="16" ry="14" fill="#C79A72"/>'
            f'<circle cx="{cx - 11}" cy="{cy - 2}" r="4.5" fill="#1F2A44"/><circle cx="{cx + 11}" cy="{cy - 2}" r="4.5" fill="#1F2A44"/>'
            f'<ellipse cx="{cx}" cy="{cy + 8}" rx="6" ry="4" fill="#F28CA0"/>'
            + rect(cx - 26, cy - 52, 52, 28, 10, fill) + text(cx, cy - 31, label, 20, '#3563E9'))


# --- Đập chuột: moles holding answers, a hammer coming down on one. ---
whack = ('<rect x="0" y="150" width="480" height="90" fill="#8BC86C"/>' + mole(150, 140, 'A') + mole(240, 120, 'B', '#E3F6EC') + mole(330, 140, 'C')
         + '<g transform="rotate(-35 300 70)"><rect x="296" y="40" width="12" height="80" rx="5" fill="#9A6B43"/>'
         '<rect x="272" y="26" width="60" height="30" rx="10" fill="#E5484D"/></g>')
cards.append(card('whack-mole', '#EAF7E4', '#D2EDC5', '#BDE3AC', whack, '#FFFFFF', '#E5484D'))

# --- Đúng hay sai: a statement card between a big check and a big cross. ---
tf = (rect(150, 58, 180, 70, 18, '#FFFFFF') + rect(170, 78, 140, 10, 5, '#C9D7FB') + rect(170, 98, 96, 10, 5, '#C9D7FB')
      + '<circle cx="168" cy="166" r="34" fill="#2E9E6A"/><path d="M152 166 l11 11 l22 -24" stroke="#FFFFFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="312" cy="166" r="34" fill="#E5484D"/><path d="M298 152 l28 28 M326 152 l-28 28" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>')
cards.append(card('true-false', '#EEF3FF', '#DCE6FE', '#C9D7FB', tf, '#FFFFFF', '#3563E9'))

# --- Ngôi sao may mắn: a night board of numbered stars, one glowing lucky star. ---
stars = ''.join(star(x, y, 22, c) + text(x, y + 6, n, 15, '#1F2A44') for x, y, c, n in
                [(150, 80, '#FFC93C', '1'), (210, 64, '#7BC8F6', '2'), (330, 80, '#B98CFF', '4'), (160, 160, '#FF9F43', '5'),
                 (320, 162, '#FF8FB1', '7')])
lucky = '<circle cx="250" cy="126" r="46" fill="#FFF3C4" opacity="0.35"/>' + star(250, 126, 40, '#FFD43B') + text(250, 136, '★', 26, '#E59400')
cards.append(card('lucky-star', '#2C3577', '#1E2457', '#3B4594', stars + lucky, '#FFD15C', '#FFFFFF'))

# --- Ô cửa bí mật: a picture behind doors, two of them open on a sunny landscape. ---
doors_bg = ('<rect x="140" y="50" width="200" height="150" rx="16" fill="#BFE3FF"/><circle cx="300" cy="84" r="16" fill="#FFD43B"/>'
            '<path d="M140 170 Q190 120 240 160 Q290 128 340 168 L340 200 L140 200 Z" fill="#7CC36B"/>')
doors = ''
for i in range(6):
    x, y = 140 + (i % 3) * 67, 50 + (i // 3) * 75
    if i in (1, 5):
        continue
    doors += rect(x + 2, y + 2, 63, 71, 10, ['#3563E9', '#F08C00', '#1FA463', '#8B5CF6', '#E5484D', '#0E9AA7'][i]) + text(x + 33, y + 48, str(i + 1), 28, '#FFFFFF')
cards.append(card('secret-picture', '#FFF4E3', '#FFE2BC', '#FFD39C', doors_bg + doors, '#FFFFFF', '#F08C00'))

# --- Leo núi: a snowy mountain, a trail of steps and a flag on the summit. ---
mountain = ('<path d="M90 206 L240 50 L390 206 Z" fill="#7FB77E"/><path d="M90 206 L240 50 L262 206 Z" fill="#6AA56B"/>'
            '<path d="M206 86 L240 50 L274 86 L256 78 L240 92 L222 78 Z" fill="#FFFFFF"/>'
            '<rect x="238" y="22" width="4" height="34" fill="#6B4E2E"/><path d="M242 24 L266 32 L242 40 Z" fill="#E5484D"/>'
            + ''.join(f'<circle cx="{x}" cy="{y}" r="6" fill="#FFFFFF" stroke="#F28C28" stroke-width="3"/>' for x, y in
                      [(150, 190), (178, 160), (200, 132), (224, 106)])
            + '<circle cx="178" cy="146" r="9" fill="#FFD9B8"/><rect x="170" y="154" width="16" height="16" rx="5" fill="#F28C28"/>')
cards.append(card('mountain-climb', '#E6F4FF', '#CDE6FA', '#B8DAF6', mountain, '#FFFFFF', '#2E9E6A'))

# --- Vòng quay điểm thưởng: a wheel of points with "x2" and a pointer. ---
seg_labels = ['10', '20', 'x2', '50', '30', '100']
seg_colors = ['#FFD15C', '#BFD3FF', '#FF8FB1', '#BDEBD3', '#E3D5FF', '#FFC3A8']
pw = ''
for i, (lab, col) in enumerate(zip(seg_labels, seg_colors)):
    a0, a1 = math.radians(-90 + i * 60), math.radians(-90 + (i + 1) * 60)
    x0, y0 = 240 + 86 * math.cos(a0), 128 + 86 * math.sin(a0)
    x1, y1 = 240 + 86 * math.cos(a1), 128 + 86 * math.sin(a1)
    am = (a0 + a1) / 2
    pw += f'<path d="M240 128 L{x0:.1f} {y0:.1f} A86 86 0 0 1 {x1:.1f} {y1:.1f} Z" fill="{col}" stroke="#FFFFFF" stroke-width="3"/>'
    pw += text(round(240 + 56 * math.cos(am), 1), round(128 + 56 * math.sin(am) + 7, 1), lab, 20)
pw += '<circle cx="240" cy="128" r="16" fill="#FFFFFF"/><path d="M240 28 l-12 -10 h24 z" fill="#E5484D" transform="rotate(180 240 23)"/>'
cards.append(card('point-wheel', '#FFF6DC', '#FFE6A6', '#FFD879', pw, '#FFFFFF', '#F2A93B'))

for name, svg in cards:
    with open(f'{OUT}/card-{name}.svg', 'w') as f:
        f.write(svg)
print(len(cards), 'cards:', ', '.join(n for n, _ in cards))
