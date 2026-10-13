"""Art of the question set pages (frontend/public/assets/question-sets/*.svg).

* subject-<subject>.svg: the picture of a set, by subject, 120x104 on a pastel tile. The names follow the backend's
  subjects (TOAN -> toan, TU_NHIEN_XA_HOI -> tu-nhien-xa-hoi...).
* banner.svg: the teacher reading with two pupils, a light bulb and stars, for the "Bộ câu hỏi" banner, 340x240.
* tip.svg: a fox reading, for the "Mẹo nhỏ" card, 150x130.

Vector, so they stay sharp at any size and pixel density. Reuses the drawing helpers of make_class_art.py.

Usage: python3 scripts/make_question_art.py [out_dir]
"""
import re
import sys

from make_class_art import AVATARS, TEACHER_FIGURE, pupil, svg

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/question-sets'
FONT = 'Nunito, Arial Rounded MT Bold, Arial, sans-serif'


def tile(bg, body):
    return svg(120, 104, f'<rect width="120" height="104" rx="18" fill="{bg}"/>\n{body}')


def glyph(x, y, s, size, fill, rotate=0):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="900" fill="{fill}" '
            f'text-anchor="middle" transform="rotate({rotate} {x} {y})" stroke="#FFFFFF" stroke-width="3" '
            f'paint-order="stroke">{s}</text>')


def sparkle(x, y, r, color='#FFFFFF'):
    return (f'<path d="M{x} {y - r} L{x + r * .3} {y - r * .3} L{x + r} {y} L{x + r * .3} {y + r * .3} L{x} {y + r} '
            f'L{x - r * .3} {y + r * .3} L{x - r} {y} L{x - r * .3} {y - r * .3} Z" fill="{color}"/>')


def animal(name, x, y, scale):
    """An avatar animal without its tile, its 96x96 drawing placed at (x, y)."""
    inner = re.sub(r'^<svg[^>]*>\n<rect[^>]*/>\n', '', AVATARS[name]).replace('\n</svg>\n', '')
    return f'<g transform="translate({x} {y}) scale({scale})">{inner}</g>'


SUBJECTS = {
    # Toán: big digits, a plus sign, the cat counting.
    'toan': tile('#E3F6EC', (
        glyph(28, 44, '1', 34, '#3563E9', -8) + glyph(56, 40, '2', 34, '#E5484D', 6) + glyph(84, 46, '3', 34, '#22A06B', -4)
        + glyph(30, 84, '+', 34, '#F28C28') + animal('cat', 52, 46, 0.6)
        + sparkle(104, 18, 6, '#FFD15C'))),
    # Tiếng Việt: an open book with letters, a pencil.
    'tieng-viet': tile('#FFF0D9', (
        '<path d="M18 36 q21 -10 42 0 v44 q-21 -10 -42 0 z" fill="#FFFFFF" stroke="#F3C27E" stroke-width="2"/>'
        '<path d="M102 36 q-21 -10 -42 0 v44 q21 -10 42 0 z" fill="#FFF8EE" stroke="#F3C27E" stroke-width="2"/>'
        + glyph(39, 66, 'Aa', 22, '#F08A24') + glyph(81, 66, 'ă', 24, '#E5484D')
        + '<g transform="rotate(35 92 30)"><rect x="86" y="4" width="11" height="40" rx="2" fill="#FFD15C"/>'
        '<path d="M86 44 h11 l-5.5 10 z" fill="#F6C9A4"/><path d="M89.5 50 h4 l-2 4 z" fill="#2B2235"/>'
        '<rect x="86" y="4" width="11" height="7" rx="2" fill="#FF8FAB"/></g>'
        + sparkle(18, 20, 6, '#F08A24'))),
    # Tiếng Anh: letter blocks and the bear.
    'tieng-anh': tile('#EEE7FD', (
        '<rect x="14" y="56" width="30" height="30" rx="6" fill="#E5484D"/>' + glyph(29, 79, 'A', 22, '#FFFFFF')
        + '<rect x="46" y="56" width="30" height="30" rx="6" fill="#3563E9"/>' + glyph(61, 79, 'B', 22, '#FFFFFF')
        + '<rect x="30" y="24" width="30" height="30" rx="6" fill="#F5A524"/>' + glyph(45, 47, 'C', 22, '#FFFFFF')
        + animal('bear', 66, 36, 0.58) + sparkle(104, 16, 6, '#7B4FE0'))),
    # Tự nhiên và Xã hội: leaves under a magnifying glass.
    'tu-nhien-xa-hoi': tile('#E2F6E8', (
        '<path d="M30 86 C24 60 34 36 58 24 C64 46 56 72 30 86 Z" fill="#6CC24A"/>'
        '<path d="M30 86 C38 66 46 48 58 24" stroke="#3E8E2E" stroke-width="2.4" fill="none"/>'
        '<path d="M52 88 C56 70 70 58 90 56 C88 74 74 88 52 88 Z" fill="#94D873"/>'
        '<path d="M52 88 C64 78 76 66 90 56" stroke="#5DB244" stroke-width="2.2" fill="none"/>'
        '<circle cx="78" cy="44" r="17" fill="#FFFFFF" fill-opacity="0.55" stroke="#3563E9" stroke-width="6"/>'
        '<path d="M90 57 L104 72" stroke="#3563E9" stroke-width="8" stroke-linecap="round"/>'
        + sparkle(20, 20, 6, '#FFD15C'))),
    # Khoa học: a flask with bubbles and an atom.
    'khoa-hoc': tile('#E1F1FB', (
        '<path d="M42 18 h20 M47 18 v22 L28 78 a6 6 0 0 0 5 9 h38 a6 6 0 0 0 5 -9 L57 40 V18" fill="#FFFFFF" '
        'stroke="#1E88C7" stroke-width="4" stroke-linejoin="round"/>'
        '<path d="M35 66 h34 l7 13 a5 5 0 0 1 -4.5 7.5 h-39 a5 5 0 0 1 -4.5 -7.5 z" fill="#4FB3E8"/>'
        '<circle cx="46" cy="58" r="3" fill="#4FB3E8"/><circle cx="56" cy="50" r="2.2" fill="#4FB3E8"/>'
        '<g transform="translate(90 34)" fill="none" stroke="#F28C28" stroke-width="2.6">'
        '<ellipse rx="16" ry="6"/><ellipse rx="16" ry="6" transform="rotate(60)"/><ellipse rx="16" ry="6" transform="rotate(-60)"/>'
        '</g><circle cx="90" cy="34" r="3.6" fill="#F28C28"/>'
        + sparkle(98, 80, 6, '#FFD15C'))),
    # Khác: a light bulb with an idea.
    'khac': tile('#FFF6D6', (
        '<path d="M60 18 a24 24 0 0 0 -14 43 c3 2 4 5 4 8 h20 c0 -3 1 -6 4 -8 a24 24 0 0 0 -14 -43 z" fill="#FFD15C" '
        'stroke="#E3A008" stroke-width="3"/>'
        '<path d="M50 74 h20 M52 81 h16" stroke="#8C8FA3" stroke-width="4" stroke-linecap="round"/>'
        '<path d="M55 50 l5 -8 l5 8" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
        + ''.join(f'<path d="M{60 + 34 * c:.1f} {42 + 34 * s:.1f} L{60 + 42 * c:.1f} {42 + 42 * s:.1f}" '
                  f'stroke="#F5A524" stroke-width="3.4" stroke-linecap="round"/>'
                  for c, s in [(-1, 0), (1, 0), (-.7, -.7), (.7, -.7), (0, -1)])
        + sparkle(22, 84, 7, '#FF8FAB') + sparkle(98, 86, 5, '#3563E9'))),
}

# Banner: the teacher reading in the middle, a pupil on each side, all cut by the bottom edge (they stand in front of
# the banner, as in the design), with a star, a chart, a light bulb and a heart above. 340x240, drawn to fill the
# banner's height on its right side.
banner = (
    '<circle cx="190" cy="150" r="104" fill="#FFFFFF" opacity="0.45"/>'
    '<circle cx="190" cy="150" r="76" fill="#FFFFFF" opacity="0.35"/>'
    # props
    + '<polygon points="40,26 47,41 63,42 51,52 55,68 40,59 25,68 29,52 17,42 33,41" fill="#FFD15C" stroke="#F5A524" '
      'stroke-width="2" stroke-linejoin="round"/>'
    + '<g transform="rotate(-10 86 92)"><rect x="64" y="72" width="44" height="40" rx="8" fill="#FFFFFF"/>'
      '<rect x="72" y="94" width="7" height="10" rx="2" fill="#3563E9"/><rect x="82" y="86" width="7" height="18" rx="2" '
      'fill="#22A06B"/><rect x="92" y="80" width="7" height="24" rx="2" fill="#F28C28"/></g>'
    + '<g transform="translate(300 46)"><path d="M0 -20 a16 16 0 0 0 -9 29 c2 1.5 2.5 3.5 2.5 5.5 h13 c0 -2 .5 -4 2.5 -5.5 '
      'a16 16 0 0 0 -9 -29 z" fill="#FFD15C" stroke="#E3A008" stroke-width="2"/><path d="M-6 21 h12 M-4.5 26 h9" '
      'stroke="#8C8FA3" stroke-width="3" stroke-linecap="round"/></g>'
    + '<path d="M262 74 c-5 -7 -15 -2 -10 7 l10 9 l10 -9 c5 -9 -5 -14 -10 -7 z" fill="#FFB547"/>'
    # the teacher, then the pupils in front of her sides
    + f'<g transform="translate(52.5 -8) scale(1.25)">{TEACHER_FIGURE}</g>'
    + pupil(64, 266, 1.9, '#FFD9BE', '#3A2A20', '#F5A524', girl=True, wave=1)
    + pupil(298, 266, 1.9, '#F6C9A4', '#2B2235', '#3E9BEA', girl=False, wave=-1)
    + sparkle(150, 26, 7) + sparkle(236, 18, 5, '#FFD15C') + sparkle(326, 120, 6) + sparkle(18, 120, 5, '#B7A2F5')
)

# Tip: the fox reading a blue book.
tip = (
    '<path d="M48 124 q-4 -30 27 -34 q31 4 27 34 z" fill="#F07F3C"/><path d="M62 124 q0 -20 13 -22 q13 2 13 22 z" fill="#FFFFFF"/>'
    + animal('fox', 27, 4, 1.0)
    + '<path d="M40 108 l35 -12 l35 12 v10 l-35 -10 l-35 10 z" fill="#2F5FD0"/>'
    + '<path d="M44 104 q15 -8 31 -5 v12 q-16 -3 -31 3 z" fill="#FFFFFF"/>'
    + '<path d="M106 104 q-15 -8 -31 -5 v12 q16 -3 31 3 z" fill="#F3F7FF"/>'
    + '<circle cx="44" cy="110" r="7" fill="#F07F3C"/><circle cx="106" cy="110" r="7" fill="#F07F3C"/>'
    + '<polygon points="122,10 125,18 133,18 127,23 129,31 122,26 115,31 117,23 111,18 119,18" fill="#FFD15C"/>'
    + sparkle(18, 40, 6, '#FF8FAB') + sparkle(136, 64, 5, '#3563E9') + sparkle(20, 100, 4, '#F5A524')
)

if __name__ == '__main__':
    files = {f'subject-{name}.svg': art for name, art in SUBJECTS.items()}
    files['banner.svg'] = svg(340, 240, banner)
    files['tip.svg'] = svg(150, 130, tip)
    for name, content in files.items():
        with open(f'{OUT}/{name}', 'w') as f:
            f.write(content)
    print(len(files), 'files:', ', '.join(files))
