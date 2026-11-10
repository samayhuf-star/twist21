"""Generates the Twist 21 icon set (run once; outputs are committed)."""
import math, glob
from PIL import Image, ImageDraw, ImageFont

def font(size):
    for pat in ['**/Unbounded*Black*.ttf', '**/Poppins-ExtraBold.ttf', '**/Poppins-Bold.ttf']:
        hits = glob.glob('/usr/share/fonts/truetype/google-fonts/' + pat, recursive=True)
        if hits:
            return ImageFont.truetype(hits[0], size)
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', size)

INK = (16, 14, 38)
YEL = (255, 210, 63)
HOT = (255, 90, 60)
PAPER = (243, 238, 228)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def ring_21(size, scale=1.0, mono=False):
    """Twist ring + '21' on a transparent canvas, drawn at 4x then downsampled."""
    S = size * 4
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = S / 2
    R = S * 0.36 * scale
    w = S * 0.065 * scale
    steps = 720
    for i in range(steps):
        a0 = 360 * i / steps - 90
        a1 = 360 * (i + 1.6) / steps - 90
        t = abs(((i / steps) * 2) - 1)           # yellow -> hot -> yellow
        col = (255, 255, 255) if mono else lerp(YEL, HOT, t)
        d.arc([cx - R, cy - R, cx + R, cy + R], a0, a1, fill=col + (255,), width=int(w))
    f = font(int(S * 0.30 * scale))
    txt = '21'
    bb = d.textbbox((0, 0), txt, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text((cx - tw / 2 - bb[0], cy - th / 2 - bb[1]), txt, font=f, fill=(255, 255, 255, 255) if mono else PAPER + (255,))
    return img.resize((size, size), Image.LANCZOS)

def bg(size):
    img = Image.new('RGB', (size, size), INK)
    px = img.load()
    for y in range(size):
        for x in range(size):
            dist = math.hypot(x - size / 2, y - size * 0.1) / size
            t = max(0, 1 - dist * 1.4)
            px[x, y] = lerp(INK, (48, 42, 118), t * t)
    return img

icon = bg(1024); icon.paste(ring_21(1024), (0, 0), ring_21(1024)); icon.save('assets/icon.png')
fg = ring_21(1024, scale=0.78); fg.save('assets/android-icon-foreground.png')
Image.new('RGB', (1024, 1024), INK).save('assets/android-icon-background.png')
ring_21(1024, scale=0.78, mono=True).save('assets/android-icon-monochrome.png')
ring_21(1024, scale=0.9).save('assets/splash-icon.png')
icon.resize((48, 48), Image.LANCZOS).save('assets/favicon.png')
print('icons ok')
