"""Art of the class pages (frontend/public/assets/classes/*.svg).

* avatar-<animal>.svg: the animal of a class (and of a student), 96x96 on a pastel tile. The names are the avatars
  the backend accepts (Classroom.AVATARS).
* banner-school.svg: the school, trees and three pupils of the "Quản lý lớp học" banner, 420x150.
* teacher.svg: the teacher reading, for the "create a class" card, 200x200.

Vector, so they stay sharp at any size and pixel density.

Usage: python3 scripts/make_class_art.py [out_dir]
(make_question_art.py imports the drawing helpers.)
"""
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/classes'
INK = '#2B2235'


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n{body}\n</svg>\n'


def eyes(lx, rx, y, r=3.6, color=INK):
    out = ''
    for x in (lx, rx):
        out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/><circle cx="{x + r * .35}" cy="{y - r * .4}" r="{r * .35}" fill="#FFFFFF"/>'
    return out


def cheeks(lx, rx, y, color='#FF9EB0', op=0.55):
    return ''.join(f'<ellipse cx="{x}" cy="{y}" rx="5.5" ry="3.4" fill="{color}" opacity="{op}"/>' for x in (lx, rx))


def smile(cx, y, w=7, color=INK):
    return (f'<path d="M{cx - w} {y} q{w / 2} {w * .55} {w} 0 q{w / 2} {w * .55} {w} 0" fill="none" stroke="{color}" '
            f'stroke-width="2.2" stroke-linecap="round"/>')


def avatar(bg, body):
    return svg(96, 96, f'<rect width="96" height="96" rx="24" fill="{bg}"/>\n{body}')


AVATARS = {
    'bear': avatar('#FDEBD3', (
        '<circle cx="27" cy="30" r="12" fill="#B9773F"/><circle cx="69" cy="30" r="12" fill="#B9773F"/>'
        '<circle cx="27" cy="30" r="6" fill="#E9B585"/><circle cx="69" cy="30" r="6" fill="#E9B585"/>'
        '<circle cx="48" cy="54" r="29" fill="#C98A4E"/>'
        '<ellipse cx="48" cy="65" rx="14" ry="10.5" fill="#F3D3AE"/>'
        '<ellipse cx="48" cy="60" rx="5.2" ry="3.6" fill="#3B2414"/>'
        + eyes(37, 59, 49) + smile(48, 66, 5, '#3B2414') + cheeks(31, 65, 60))),
    'rabbit': avatar('#F1E6FA', (
        '<ellipse cx="37" cy="26" rx="8" ry="21" fill="#FFFFFF" stroke="#E2D5EE" stroke-width="2"/>'
        '<ellipse cx="59" cy="26" rx="8" ry="21" fill="#FFFFFF" stroke="#E2D5EE" stroke-width="2"/>'
        '<ellipse cx="37" cy="28" rx="3.6" ry="14" fill="#FFC4D3"/><ellipse cx="59" cy="28" rx="3.6" ry="14" fill="#FFC4D3"/>'
        '<circle cx="48" cy="60" r="26" fill="#FFFFFF" stroke="#E2D5EE" stroke-width="2"/>'
        '<path d="M44.5 63 h7 l-3.5 3.6z" fill="#FF8FAB" stroke="#FF8FAB" stroke-width="1.5" stroke-linejoin="round"/>'
        + eyes(38, 58, 56) + smile(48, 68, 4.2) + cheeks(32, 64, 64))),
    'lion': avatar('#FFE9C7', (
        ''.join(f'<circle cx="{48 + 26 * c:.1f}" cy="{54 + 26 * s:.1f}" r="11" fill="#E58A2B"/>' for c, s in
                [(1, 0), (.866, .5), (.5, .866), (0, 1), (-.5, .866), (-.866, .5), (-1, 0), (-.866, -.5), (-.5, -.866),
                 (0, -1), (.5, -.866), (.866, -.5)])
        + '<circle cx="48" cy="54" r="27" fill="#E58A2B"/>'
        '<circle cx="31" cy="35" r="6" fill="#F6C25B"/><circle cx="65" cy="35" r="6" fill="#F6C25B"/>'
        '<circle cx="48" cy="56" r="22" fill="#F6C25B"/>'
        '<ellipse cx="48" cy="65" rx="11" ry="8" fill="#FCE3A8"/>'
        '<path d="M44 60 h8 l-4 4.2z" fill="#7A3E12" stroke="#7A3E12" stroke-width="2" stroke-linejoin="round"/>'
        + eyes(39, 57, 52, 3.3) + smile(48, 67, 4, '#7A3E12') + cheeks(33, 63, 61, '#FF8A65', .45))),
    'cat': avatar('#E3F0FB', (
        '<path d="M24 46 L27 18 L45 33 Z" fill="#9AA6B8"/><path d="M72 46 L69 18 L51 33 Z" fill="#9AA6B8"/>'
        '<path d="M29 37 L30 25 L39 32 Z" fill="#FFC4D3"/><path d="M67 37 L66 25 L57 32 Z" fill="#FFC4D3"/>'
        '<ellipse cx="48" cy="56" rx="28" ry="26" fill="#B6C0CE"/>'
        '<path d="M42 33 v6 M48 31 v8 M54 33 v6" stroke="#8792A6" stroke-width="2.6" stroke-linecap="round"/>'
        '<ellipse cx="48" cy="66" rx="12" ry="8" fill="#E6EBF2"/>'
        '<path d="M45 61 h6 l-3 3z" fill="#FF8FAB" stroke="#FF8FAB" stroke-width="1.5" stroke-linejoin="round"/>'
        '<path d="M22 62 h12 M23 68 l11 -3 M74 62 h-12 M73 68 l-11 -3" stroke="#7E889C" stroke-width="1.6" stroke-linecap="round"/>'
        + eyes(38, 58, 53) + smile(48, 66, 3.6) + cheeks(31, 65, 61))),
    'fox': avatar('#FFE5D6', (
        '<path d="M20 44 L25 14 L44 32 Z" fill="#F07F3C"/><path d="M76 44 L71 14 L52 32 Z" fill="#F07F3C"/>'
        '<path d="M26 34 L28 22 L37 31 Z" fill="#5A2E1A"/><path d="M70 34 L68 22 L59 31 Z" fill="#5A2E1A"/>'
        '<path d="M48 82 C30 82 18 66 19 50 C20 36 33 29 48 29 C63 29 76 36 77 50 C78 66 66 82 48 82 Z" fill="#F07F3C"/>'
        '<path d="M48 82 C38 82 25 74 21 60 C30 60 40 64 48 70 C56 64 66 60 75 60 C71 74 58 82 48 82 Z" fill="#FFFFFF"/>'
        '<ellipse cx="48" cy="70" rx="4.6" ry="3.4" fill="#2B1A10"/>'
        + eyes(37, 59, 53) + cheeks(30, 66, 62, '#FF7E6B', .4))),
    'panda': avatar('#E6F5EA', (
        '<circle cx="26" cy="31" r="11" fill="#2F3443"/><circle cx="70" cy="31" r="11" fill="#2F3443"/>'
        '<circle cx="48" cy="55" r="29" fill="#FFFFFF" stroke="#D9E6DD" stroke-width="2"/>'
        '<ellipse cx="37" cy="51" rx="8" ry="10" transform="rotate(-25 37 51)" fill="#2F3443"/>'
        '<ellipse cx="59" cy="51" rx="8" ry="10" transform="rotate(25 59 51)" fill="#2F3443"/>'
        + '<circle cx="38" cy="51" r="3.6" fill="#FFFFFF"/><circle cx="58" cy="51" r="3.6" fill="#FFFFFF"/>'
        '<circle cx="38.6" cy="51.4" r="2" fill="#2F3443"/><circle cx="58.6" cy="51.4" r="2" fill="#2F3443"/>'
        '<ellipse cx="48" cy="63" rx="5" ry="3.4" fill="#2F3443"/>' + smile(48, 68, 4.2) + cheeks(30, 66, 64))),
    'owl': avatar('#EDE7FB', (
        '<path d="M26 34 L22 16 L38 28 Z M70 34 L74 16 L58 28 Z" fill="#8A5A36"/>'
        '<ellipse cx="48" cy="56" rx="29" ry="28" fill="#A8754B"/>'
        '<ellipse cx="48" cy="66" rx="17" ry="15" fill="#E9CFA8"/>'
        '<path d="M42 72 q6 4 12 0 M40 78 q8 4 16 0" fill="none" stroke="#C9A77A" stroke-width="2" stroke-linecap="round"/>'
        '<circle cx="36" cy="47" r="12" fill="#FFFFFF"/><circle cx="60" cy="47" r="12" fill="#FFFFFF"/>'
        + eyes(36, 60, 47, 5.6) +
        '<path d="M44 57 h8 l-4 7z" fill="#F5A524" stroke="#F5A524" stroke-width="2" stroke-linejoin="round"/>')),
    'frog': avatar('#E5F7DA', (
        '<circle cx="32" cy="34" r="12" fill="#6CC24A"/><circle cx="64" cy="34" r="12" fill="#6CC24A"/>'
        '<ellipse cx="48" cy="58" rx="32" ry="24" fill="#6CC24A"/>'
        '<circle cx="32" cy="33" r="7.5" fill="#FFFFFF"/><circle cx="64" cy="33" r="7.5" fill="#FFFFFF"/>'
        + eyes(32, 64, 34, 4)
        + '<path d="M30 60 q18 14 36 0" fill="none" stroke="#2F6B1F" stroke-width="2.6" stroke-linecap="round"/>'
        '<circle cx="44" cy="50" r="1.5" fill="#2F6B1F"/><circle cx="52" cy="50" r="1.5" fill="#2F6B1F"/>'
        + cheeks(25, 71, 58, '#FF8FAB', .5))),
}


# --- Banner: the school with its flag between trees, three pupils waving in front. ---

def tree(x, y, s, leaf, dark):
    return (f'<rect x="{x - 3 * s}" y="{y - 6 * s}" width="{6 * s}" height="{22 * s}" rx="{2 * s}" fill="#9A6A43"/>'
            f'<circle cx="{x}" cy="{y - 16 * s}" r="{17 * s}" fill="{leaf}"/>'
            f'<circle cx="{x - 12 * s}" cy="{y - 6 * s}" r="{11 * s}" fill="{leaf}"/>'
            f'<circle cx="{x + 12 * s}" cy="{y - 7 * s}" r="{11 * s}" fill="{dark}"/>')


def kid(x, y, skin, hair, shirt, girl=False, wave=1):
    """A pupil standing at (x, y) (feet), about 64 tall; wave = 1 (right arm up), -1 (left) or 0."""
    arm_up = f'M{x + 9 * wave} {y - 34} q{10 * wave} -8 {12 * wave} -22' if wave else ''
    hair_shape = (f'<path d="M{x - 13} {y - 50} q0 -16 13 -16 q13 0 13 16 v10 q-3 -10 -13 -12 q-10 2 -13 12 z" fill="{hair}"/>'
                  f'<circle cx="{x - 14}" cy="{y - 56}" r="5" fill="{hair}"/><circle cx="{x + 14}" cy="{y - 56}" r="5" fill="{hair}"/>'
                  if girl else
                  f'<path d="M{x - 12} {y - 52} q1 -14 12 -14 q11 0 12 14 q-6 -6 -12 -5 q-7 -1 -12 5 z" fill="{hair}"/>')
    # Arms hanging at the sides: one when the other waves, both otherwise.
    hanging = [-wave] if wave else [-1, 1]
    return (f'<path d="M{x - 6} {y - 2} v-12 M{x + 6} {y - 2} v-12" stroke="#3E4A6B" stroke-width="5.5" stroke-linecap="round"/>'
            f'<path d="M{x - 13} {y - 12} q-1 -22 13 -24 q14 2 13 24 z" fill="{shirt}"/>'
            f'<path d="M{x - 6} {y - 35} l6 6 l6 -6" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>'
            + (f'<path d="{arm_up}" stroke="{skin}" stroke-width="5" stroke-linecap="round" fill="none"/>' if wave else '')
            + ''.join(f'<path d="M{x + 9 * s} {y - 33} q{7 * s} 8 {6 * s} 16" stroke="{skin}" stroke-width="5" '
                      f'stroke-linecap="round" fill="none"/>' for s in hanging)
            + f'<circle cx="{x}" cy="{y - 48}" r="13" fill="{skin}"/>'
            + hair_shape
            + eyes(x - 4.5, x + 4.5, y - 47, 1.8)
            + f'<path d="M{x - 4} {y - 42} q4 3.5 8 0" fill="none" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>'
            + f'<circle cx="{x - 8}" cy="{y - 43}" r="2.2" fill="#FF9EB0" opacity="0.6"/><circle cx="{x + 8}" cy="{y - 43}" r="2.2" fill="#FF9EB0" opacity="0.6"/>')


def cloud(x, y, s, op=0.9):
    return (f'<g opacity="{op}" fill="#FFFFFF"><ellipse cx="{x}" cy="{y}" rx="{22 * s}" ry="{9 * s}"/>'
            f'<circle cx="{x - 7 * s}" cy="{y - 6 * s}" r="{9 * s}"/><circle cx="{x + 7 * s}" cy="{y - 8 * s}" r="{11 * s}"/></g>')


def pupil(x, y, scale, *args, **kwargs):
    """A pupil (see kid) standing at (x, y), scaled."""
    return f'<g transform="translate({x} {y}) scale({scale})">{kid(0, 0, *args, **kwargs)}</g>'


# The school in the middle on a hill that slopes down to both bottom corners (no cut edge at the sides); the pupils
# stand on the grass in front of the side walls, below the windows; trees outside them.
school = (
    # sky details and the hill
    cloud(62, 32, 1.1) + cloud(330, 26, 0.9) + cloud(148, 18, 0.6, 0.7)
    + '<circle cx="388" cy="34" r="15" fill="#FFE07A"/><circle cx="388" cy="34" r="21" fill="#FFE07A" opacity="0.35"/>'
    + '<path d="M0 150 C40 132 110 116 210 118 C310 116 380 132 420 150 Z" fill="#BFE6A6"/>'
    + '<path d="M0 150 C60 138 140 130 210 132 C290 130 360 138 420 150 Z" fill="#9ED486"/>'
    # school: wings, centre with roof, door, windows, clock, flag
    + '<rect x="128" y="74" width="164" height="56" rx="4" fill="#FFF4E0"/>'
    + '<path d="M120 78 L210 42 L300 78 Z" fill="#F07F5E"/><path d="M120 78 L300 78 L296 84 L124 84 Z" fill="#D9654A"/>'
    + '<rect x="176" y="58" width="68" height="72" rx="3" fill="#FFF9EE"/>'
    + '<path d="M168 62 L210 34 L252 62 Z" fill="#E85D4A"/>'
    + '<circle cx="210" cy="56" r="8" fill="#FFFFFF" stroke="#D9654A" stroke-width="2.4"/>'
    + '<path d="M210 51 v5 l3.5 2" stroke="#2B2235" stroke-width="1.8" stroke-linecap="round" fill="none"/>'
    + '<path d="M210 34 v-24" stroke="#8C8FA3" stroke-width="2.2"/><path d="M210 10 h18 l-4 6 l4 6 h-18 z" fill="#E5484D"/>'
    + '<polygon points="217,13 218.2,16 221.4,16 218.8,17.9 219.8,21 217,19.2 214.2,21 215.2,17.9 212.6,16 215.8,16" fill="#FFD15C"/>'
    + '<path d="M198 130 v-28 a12 12 0 0 1 24 0 v28 z" fill="#5B8DEF"/><path d="M210 90 v40" stroke="#4673D6" stroke-width="2"/>'
    + ''.join(f'<rect x="{x}" y="{y}" width="18" height="{h}" rx="3" fill="#8EC5FF" stroke="#FFFFFF" stroke-width="2"/>'
              for x, y, h in [(135, 86, 11), (155, 86, 11), (247, 86, 11), (267, 86, 11), (183, 70, 14), (219, 70, 14)])
    + '<rect x="122" y="128" width="176" height="6" rx="3" fill="#E9D7B8"/>'
    + tree(86, 130, 1.1, '#7CCB5B', '#5DB244') + tree(338, 132, 1.05, '#7CCB5B', '#5DB244')
    + tree(30, 140, 0.85, '#94D873', '#74C25A') + tree(394, 142, 0.8, '#94D873', '#74C25A')
    + '<circle cx="54" cy="142" r="6" fill="#FF9EB0"/><circle cx="62" cy="145" r="5" fill="#FFD15C"/>'
    + '<circle cx="364" cy="145" r="5.5" fill="#FF9EB0"/><circle cx="372" cy="142" r="5" fill="#B7A2F5"/>'
    # pupils on the grass in front of the side walls
    + pupil(152, 147, 0.78, '#FFD9BE', '#3A2A20', '#F5A524', girl=False, wave=-1)
    + pupil(258, 147, 0.78, '#FFD3B0', '#4A2E1E', '#E85D75', girl=True, wave=1)
    + pupil(284, 147, 0.78, '#F6C9A4', '#2B2235', '#3E9BEA', girl=False, wave=0)
)

# --- Teacher reading a book: the figure (200x200 frame, cut at the bottom edge), then her card scene. ---
# Her hair ends in rounded locks resting on the shoulders (not cut straight above them).
TEACHER_BODY = (
    # hair back
    '<path d="M70 92 q-6 -52 40 -54 q46 2 40 54 q2 30 -4 50 q-4 8 -12 8 h-48 q-8 0 -12 -8 q-6 -20 -4 -50 z" fill="#5A3622"/>'
    '<circle cx="110" cy="36" r="13" fill="#5A3622"/>'
    # body
    '<path d="M60 200 q0 -52 50 -58 q50 6 50 58 z" fill="#5B8DEF"/>'
    '<path d="M96 144 l14 16 l14 -16" fill="#FFFFFF"/>'
    # face
    '<rect x="102" y="118" width="16" height="16" rx="6" fill="#F6C9A4"/>'
    '<ellipse cx="110" cy="92" rx="30" ry="33" fill="#FFD9BE"/>'
    '<path d="M80 86 q4 -32 34 -30 q24 2 26 30 q-16 -4 -26 -18 q-14 16 -34 18 z" fill="#5A3622"/>'
    '<circle cx="98" cy="94" r="9" fill="none" stroke="#2B2235" stroke-width="2.4"/>'
    '<circle cx="122" cy="94" r="9" fill="none" stroke="#2B2235" stroke-width="2.4"/>'
    '<path d="M107 94 h6" stroke="#2B2235" stroke-width="2.4"/>'
    + eyes(98, 122, 95, 2.6)
    + '<path d="M103 108 q7 6 14 0" fill="none" stroke="#B5523B" stroke-width="2.4" stroke-linecap="round"/>'
    '<circle cx="88" cy="104" r="4" fill="#FF9EB0" opacity="0.6"/><circle cx="132" cy="104" r="4" fill="#FF9EB0" opacity="0.6"/>'
)

# An open book held in both hands, in front of TEACHER_BODY.
BOOK = (
    '<path d="M70 176 l40 -14 l40 14 v8 l-40 -12 l-40 12 z" fill="#2F5FD0"/>'
    '<path d="M74 172 q18 -10 36 -6 v14 q-18 -4 -36 4 z" fill="#FFFFFF"/>'
    '<path d="M146 172 q-18 -10 -36 -6 v14 q18 -4 36 4 z" fill="#F3F7FF"/>'
    '<path d="M82 172 q10 -5 22 -4 M82 177 q10 -5 22 -4 M116 168 q12 -1 22 4 M116 173 q12 -1 22 4" stroke="#B9C9EE" stroke-width="1.6" fill="none"/>'
    '<circle cx="74" cy="178" r="7" fill="#FFD9BE"/><circle cx="146" cy="178" r="7" fill="#FFD9BE"/>'
)

TEACHER_FIGURE = TEACHER_BODY + BOOK

PLANT = (
    '<path d="M28 186 q-2 -30 10 -46 M38 186 q4 -26 22 -36 M30 186 q-14 -18 -16 -36" stroke="#4FA36B" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<ellipse cx="38" cy="140" rx="9" ry="5" transform="rotate(-50 38 140)" fill="#6CC24A"/>'
    '<ellipse cx="60" cy="150" rx="10" ry="5" transform="rotate(-20 60 150)" fill="#6CC24A"/>'
    '<ellipse cx="14" cy="150" rx="9" ry="4.6" transform="rotate(60 14 150)" fill="#6CC24A"/>'
    '<path d="M18 186 h34 l-4 12 h-26 z" fill="#F2A65A"/>'
)

HEART = '<path d="M168 52 c-6 -8 -18 -2 -12 8 l12 11 l12 -11 c6 -10 -6 -16 -12 -8 z" fill="#FFB547"/>'

teacher = (
    '<circle cx="104" cy="104" r="86" fill="#DCEBFF" opacity="0.7"/>'
    + PLANT + TEACHER_FIGURE + HEART
    + '<path d="M46 52 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#FFFFFF"/>'
    '<path d="M176 120 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#FFFFFF"/>'
)

if __name__ == '__main__':
    files = {f'avatar-{name}.svg': art for name, art in AVATARS.items()}
    files['banner-school.svg'] = svg(420, 150, school)
    files['teacher.svg'] = svg(200, 200, teacher)

    for name, content in files.items():
        with open(f'{OUT}/{name}', 'w') as f:
            f.write(content)
    print(len(files), 'files:', ', '.join(files))
