# Icônes d'Arc : reprend le tracé du logo SVG (viewBox 24) « M4 18 C7.5 6 16.5 6 20 18 », trait 2.6, bouts ronds.
# Usage : python3 outils/icones.py  (depuis le dossier Arc)
# Carré plein bord (iOS arrondit lui-même), arc recentré verticalement.
import sys
from PIL import Image, ImageDraw

BG, FG = (0xF5, 0xF2, 0xEC), (0xE4, 0x57, 0x2E)  # thème Papier
P0, P1, P2, P3 = (4, 18), (7.5, 6), (16.5, 6), (20, 18)
STROKE = 2.6
# Le trait occupe y 9-1.3 → 18+1.3 = 7.7..19.3 : centre 13.5 → on remonte de 1.5
DY = -1.5

def bez(t):
    u = 1 - t
    x = u**3*P0[0] + 3*u*u*t*P1[0] + 3*u*t*t*P2[0] + t**3*P3[0]
    y = u**3*P0[1] + 3*u*u*t*P1[1] + 3*u*t*t*P2[1] + t**3*P3[1]
    return x, y + DY

def icon(size, out):
    ss = 8
    S = size * ss
    k = S / 24
    img = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(img)
    r = STROKE / 2 * k
    for i in range(2001):
        x, y = bez(i / 2000)
        d.ellipse((x*k - r, y*k - r, x*k + r, y*k + r), fill=FG)
    img.resize((size, size), Image.LANCZOS).save(out, optimize=True)

outdir = sys.argv[1] if len(sys.argv) > 1 else '.'
icon(180, f'{outdir}/apple-touch-icon.png')
icon(192, f'{outdir}/icon-192.png')
icon(512, f'{outdir}/icon-512.png')
print('ok')
