"""Card art (430x116) for the new games, in the style of the existing cards: pastel ground, soft blobs, sparkles."""
import sys
# Usage: python3 scripts/make_card_art.py public/assets/games
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/assets/games"

def sparkle(x, y, r, color='#FFFFFF', op=0.9):
    return (f'<path d="M{x} {y-r} Q{x+r*0.18} {y-r*0.18} {x+r} {y} Q{x+r*0.18} {y+r*0.18} {x} {y+r} '
            f'Q{x-r*0.18} {y+r*0.18} {x-r} {y} Q{x-r*0.18} {y-r*0.18} {x} {y-r}Z" fill="{color}" opacity="{op}"/>')

def card(bg, blob, body, spark='#FFFFFF'):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="430" height="116" viewBox="0 0 430 116">
<defs><clipPath id="c"><rect width="430" height="116" rx="12"/></clipPath></defs>
<g clip-path="url(#c)">
<rect width="430" height="116" fill="{bg}"/>
<circle cx="18" cy="8" r="46" fill="{blob}" opacity="0.55"/>
<circle cx="412" cy="112" r="52" fill="{blob}" opacity="0.55"/>
<circle cx="396" cy="10" r="18" fill="{blob}" opacity="0.35"/>
{sparkle(58, 72, 11, spark)}{sparkle(372, 62, 9, spark)}{sparkle(96, 26, 6, spark, 0.7)}
{body}
</g>
</svg>'''

R = lambda x, y, w, h, rx, fill, extra='': f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'
T = lambda x, y, s, size, fill='#1F2A44', weight=800, anchor='middle': (
    f'<text x="{x}" y="{y}" font-family="Arial, Helvetica, sans-serif" font-size="{size}" font-weight="{weight}" '
    f'fill="{fill}" text-anchor="{anchor}">{s}</text>')

cards = {}

# Rung chuông vàng: golden bell with a ribbon, small boards around.
bell = '''
<g transform="translate(215 60)">
  <ellipse cx="0" cy="46" rx="58" ry="7" fill="#E9B949" opacity="0.35"/>
  <path d="M-40 30 C-40 -6 -30 -34 0 -38 C30 -34 40 -6 40 30 L48 38 L-48 38 Z" fill="#FFC93C" stroke="#D99A12" stroke-width="3"/>
  <path d="M-24 -10 C-20 -24 -12 -30 -2 -32" stroke="#FFF3C4" stroke-width="7" stroke-linecap="round" fill="none"/>
  <circle cx="0" cy="44" r="9" fill="#D99A12"/>
  <rect x="-7" y="-50" width="14" height="14" rx="4" fill="#D99A12"/>
  <path d="M-62 -18 l-12 -6 M-64 0 l-14 0 M62 -18 l12 -6 M64 0 l14 0" stroke="#F2A93B" stroke-width="5" stroke-linecap="round"/>
</g>'''
boards = ''.join(
    R(x, 40, 52, 36, 7, '#FFFFFF', 'stroke="#F0D9A0" stroke-width="2"') + T(x + 26, 65, t, 18, '#3563E9' if t != 'C' else '#E5484D')
    for x, t in [(84, 'A'), (294, 'B')])
cards['golden-bell'] = card('#FFF3D6', '#FFE2A3', boards + bell, '#FFFFFF')

# Đua thuyền: river with three boats racing to a flag.
def boat(x, y, color, flag):
    return f'''<g transform="translate({x} {y})">
  <path d="M-30 0 L30 0 L20 14 L-20 14 Z" fill="{color}"/>
  <rect x="-2" y="-30" width="4" height="30" fill="#6B4E2E"/>
  <path d="M2 -28 L26 -14 L2 -6 Z" fill="{flag}"/>
</g>'''
river = ('<path d="M0 64 C80 56 160 72 240 64 C320 56 380 70 430 62 L430 116 L0 116 Z" fill="#7CC4F0"/>'
         '<path d="M0 84 C70 78 150 90 230 84 C300 78 380 90 430 82" stroke="#B8E2FA" stroke-width="4" fill="none"/>'
         '<path d="M20 104 C90 98 170 110 250 104" stroke="#B8E2FA" stroke-width="3" fill="none"/>')
finish = ('<rect x="352" y="22" width="5" height="58" fill="#6B4E2E"/>'
          '<path d="M357 24 h28 v8 h-28z" fill="#1F2A44"/><path d="M357 24 h7 v4 h-7z M371 24 h7 v4 h-7z M364 28 h7 v4 h-7z M378 28 h7 v4 h-7z" fill="#FFFFFF"/>')
cards['boat-race'] = card('#E6F4FE', '#C9E7FB',
    river + finish + boat(120, 72, '#F28C28', '#FFD15C') + boat(205, 92, '#3563E9', '#8BD3FF') + boat(285, 76, '#2E9E6A', '#B9F0C9'))

# Ô chữ: crossword grid with a highlighted keyword column.
cells = ''
rows = [(0, 'CÂY'), (1, 'TRE'), (2, 'HOA'), (3, 'SEN')]
grid = []
for r, (col0, word) in enumerate([(4, 'CÂY'), (3, 'BÚT'), (2, 'ĐÈN'), (4, 'TRỜI')]):
    pass
layout = [(3, 'MÈO', 1), (2, 'SÁCH', 2), (4, 'HOA', 0), (2, 'TRỜI', 2)]  # (start col, word, key letter index)
key_col = 4
for r, (start, word, key) in enumerate(layout):
    start = key_col - key
    for i, ch in enumerate(word):
        x = 140 + (start + i) * 26
        y = 12 + r * 24
        is_key = start + i == key_col
        cells += R(x, y, 23, 21, 4, '#FFD15C' if is_key else '#FFFFFF', 'stroke="#C9B6F2" stroke-width="1.5"')
        if r < 3:
            cells += T(x + 11.5, y + 16, ch, 13, '#1F2A44')
cards['crossword'] = card('#F1EAFE', '#DDCCFB', cells)

# Sắp xếp: four numbered cards with an arrow.
order = ''
for i, (n, c) in enumerate([('1', '#3563E9'), ('2', '#F28C28'), ('3', '#2E9E6A'), ('4', '#8B5CF6')]):
    x = 120 + i * 52
    y = 34 + (8 if i % 2 else 0) - (i == 2) * 4
    order += R(x, y, 42, 48, 9, '#FFFFFF', f'stroke="{c}" stroke-width="3"') + T(x + 21, y + 33, n, 24, c)
order += '<path d="M120 96 H318" stroke="#2E9E6A" stroke-width="5" stroke-linecap="round"/><path d="M318 88 L330 96 L318 104 Z" fill="#2E9E6A"/>'
cards['ordering'] = card('#E3F6EC', '#C3EBD4', order)

# Phân loại: two baskets and falling cards.
def basket(x, color, label):
    return (f'<g transform="translate({x} 62)"><path d="M-38 0 H38 L30 40 H-30 Z" fill="{color}"/>'
            f'<path d="M-38 0 H38" stroke="#FFFFFF" stroke-width="3" opacity="0.6"/>'
            f'<path d="M-26 8 L-22 34 M-8 8 L-6 34 M8 8 L6 34 M26 8 L22 34" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>'
            + T(0, 26, label, 14, '#FFFFFF') + '</g>')
falling = (R(178, 16, 34, 26, 6, '#FFFFFF', 'stroke="#F28C28" stroke-width="2" transform="rotate(-10 195 29)"')
           + R(222, 22, 34, 26, 6, '#FFFFFF', 'stroke="#3563E9" stroke-width="2" transform="rotate(8 239 35)"'))
cards['sorting'] = card('#FDEBDD', '#FBD3B5', basket(150, '#F28C28', 'A') + basket(285, '#3563E9', 'B') + falling)

# Chia nhóm: three colored groups of little people.
def person(x, y, c):
    return f'<circle cx="{x}" cy="{y}" r="7" fill="{c}"/><path d="M{x-10} {y+22} q10 -16 20 0 z" fill="{c}"/>'
groups = ''
for gx, c in [(130, '#F28C28'), (215, '#3563E9'), (300, '#2E9E6A')]:
    groups += f'<circle cx="{gx}" cy="60" r="36" fill="#FFFFFF" opacity="0.9"/>'
    groups += person(gx - 14, 50, c) + person(gx + 14, 50, c) + person(gx, 66, c)
cards['team-maker'] = card('#EAF1FE', '#CFDDFB', groups)

# Đồng hồ: big stopwatch.
watch = '''<g transform="translate(215 62)">
  <rect x="-8" y="-50" width="16" height="10" rx="3" fill="#E5484D"/>
  <circle cx="0" cy="0" r="40" fill="#FFFFFF" stroke="#E5484D" stroke-width="7"/>
  <path d="M0 0 L0 -26 A26 26 0 0 1 22 -13 Z" fill="#FFD3D4"/>
  <path d="M0 0 L0 -24" stroke="#1F2A44" stroke-width="4" stroke-linecap="round"/>
  <path d="M0 0 L15 9" stroke="#1F2A44" stroke-width="4" stroke-linecap="round"/>
  <circle cx="0" cy="0" r="4" fill="#1F2A44"/>
</g>''' + T(112, 70, '05:00', 24, '#E5484D') + sparkle(318, 60, 12, '#E5484D', 0.5)
cards['timer'] = card('#FDE8E8', '#FAC9CB', watch)

# Xúc xắc: two dice.
def die(x, y, rot, pips, c):
    dots = ''.join(f'<circle cx="{px}" cy="{py}" r="4.5" fill="{c}"/>' for px, py in pips)
    return f'<g transform="translate({x} {y}) rotate({rot})">{R(-26, -26, 52, 52, 11, "#FFFFFF", f"stroke=\'{c}\' stroke-width=\'3\'")}{dots}</g>'
five = [(-13, -13), (13, -13), (0, 0), (-13, 13), (13, 13)]
three = [(-13, -13), (0, 0), (13, 13)]
cards['dice'] = card('#FFF1E0', '#FFD9AE', die(180, 58, -12, five, '#E5484D') + die(255, 62, 10, three, '#3563E9'))

for name, svg in cards.items():
    with open(f'{OUT}/card-{name}.svg', 'w') as f:
        f.write(svg)
print(sorted(cards))
