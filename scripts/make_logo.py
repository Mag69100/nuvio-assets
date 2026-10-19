"""
Logo de l'addon et du site (logo/addon.png, 512x512) : une enseigne de cinéma.

Fond de velours bordeaux éclairé par le haut, cadre doré bordé d'ampoules, « FR » en grand avec le
triangle « lecture », un liseré bleu-blanc-rouge et « CATALOGUE » dessous : les couleurs et la police
(Bebas Neue) du site. Dessiné en 4x puis réduit, pour des bords nets.

    python scripts/make_logo.py [sortie.png]
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "fonts" / "BebasNeue-Regular.ttf"
SIZE, K = 512, 4               # taille finale, facteur de suréchantillonnage
S = SIZE * K

VELVET_TOP, VELVET_BOTTOM = (74, 18, 36), (20, 9, 15)
GOLD_LIGHT, GOLD_DARK = (250, 228, 166), (196, 146, 60)
BULB = (255, 214, 120)
CREAM = (248, 238, 222)
RED = (229, 65, 58)
BLUE, WHITE = (44, 92, 196), (245, 240, 230)


def px(v):
    return int(round(v * K))


def vertical(size, top, bottom):
    """Dégradé vertical."""
    w, h = size
    col = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / (h - 1)
        col.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return col.resize((w, h))


def rounded_mask(size, box, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return m


def gold_fill(size):
    """Dorure : clair en haut, plus sombre en bas, avec un reflet au tiers."""
    w, h = size
    col = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / (h - 1)
        shine = math.exp(-((t - 0.32) / 0.12) ** 2) * 0.55
        base = [GOLD_LIGHT[i] + (GOLD_DARK[i] - GOLD_LIGHT[i]) * t for i in range(3)]
        col.putpixel((0, y), tuple(min(255, int(c + (255 - c) * shine)) for c in base))
    return col.resize((w, h))


def glow(layer, radius, strength=1.0):
    """Halo lumineux d'un calque RGBA."""
    g = layer.filter(ImageFilter.GaussianBlur(radius))
    if strength != 1.0:
        g.putalpha(g.getchannel("A").point(lambda a: min(255, int(a * strength))))
    return g


def make(out):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # Fond : velours, éclairé par le haut (projecteur rouge), plis verticaux très discrets.
    bg = vertical((S, S), VELVET_TOP, VELVET_BOTTOM).convert("RGBA")
    light = Image.new("L", (S, S), 0)
    ImageDraw.Draw(light).ellipse((-S * 0.2, -S * 0.75, S * 1.2, S * 0.55), fill=150)
    light = light.filter(ImageFilter.GaussianBlur(px(70)))
    bg = Image.composite(Image.new("RGBA", (S, S), (150, 38, 52, 255)), bg, light)
    folds = Image.new("L", (S, S), 0)
    fd = ImageDraw.Draw(folds)
    for x in range(0, S, px(23)):
        fd.rectangle((x, 0, x + px(3), S), fill=26)
    bg = Image.composite(Image.new("RGBA", (S, S), (0, 0, 0, 255)), bg, folds.filter(ImageFilter.GaussianBlur(px(2))))
    img.paste(bg, (0, 0), rounded_mask((S, S), (0, 0, S - 1, S - 1), px(112)))

    # L'enseigne : cadre doré à coins arrondis.
    x0, y0, x1, y1 = px(54), px(60), px(458), px(392)
    frame = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ring = Image.new("L", (S, S), 0)
    rd = ImageDraw.Draw(ring)
    rd.rounded_rectangle((x0, y0, x1, y1), radius=px(46), fill=255)
    rd.rounded_rectangle((x0 + px(15), y0 + px(15), x1 - px(15), y1 - px(15)), radius=px(32), fill=0)
    frame.paste(gold_fill((S, S)), (0, 0), ring)
    # Panneau intérieur, plus sombre, pour faire ressortir les lettres.
    panel = rounded_mask((S, S), (x0 + px(15), y0 + px(15), x1 - px(15), y1 - px(15)), px(32))
    inner = vertical((S, S), (38, 12, 22), (16, 7, 12)).convert("RGBA")
    img.paste(inner, (0, 0), panel)
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 170), (0, 0), ring)
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(px(10))), (0, px(6)))
    img.alpha_composite(frame)

    # Les ampoules, posées sur le cadre, avec leur halo.
    bulbs = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bulbs)
    cx0, cy0, cx1, cy1 = x0 + px(7.5), y0 + px(7.5), x1 - px(7.5), y1 - px(7.5)
    r_bulb = px(5.2)
    n_top, n_side = 9, 7
    points = []
    for i in range(n_top):
        x = cx0 + px(40) + (cx1 - cx0 - px(80)) * i / (n_top - 1)
        points += [(x, cy0), (x, cy1)]
    for i in range(n_side):
        y = cy0 + px(40) + (cy1 - cy0 - px(80)) * i / (n_side - 1)
        points += [(cx0, y), (cx1, y)]
    for x, y in points:
        bd.ellipse((x - r_bulb, y - r_bulb, x + r_bulb, y + r_bulb), fill=BULB + (255,))
    img.alpha_composite(glow(bulbs, px(9), 1.6))
    img.alpha_composite(bulbs)
    cores = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cores)
    for x, y in points:
        cd.ellipse((x - r_bulb * 0.45, y - r_bulb * 0.45, x + r_bulb * 0.45, y + r_bulb * 0.45), fill=(255, 250, 235, 255))
    img.alpha_composite(cores)

    # « ▶ FR » au centre de l'enseigne.
    font = ImageFont.truetype(str(FONT), px(236))
    text = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    td = ImageDraw.Draw(text)
    l, t, r, b = td.textbbox((0, 0), "FR", font=font)
    tri_w, gap = px(66), px(10)
    total = tri_w + gap + (r - l)
    left = (S - total) // 2
    mid_y = (y0 + y1) // 2 - px(8)
    tx, ty = left + tri_w + gap - l, mid_y - (t + b) // 2
    td.text((tx, ty), "FR", font=font, fill=CREAM + (255,))
    th = px(78)
    tri = [(left, mid_y - th // 2), (left, mid_y + th // 2), (left + tri_w, mid_y)]
    td.polygon(tri, fill=RED + (255,))
    img.alpha_composite(glow(text, px(14), 0.55))
    img.alpha_composite(text)

    # Liseré bleu-blanc-rouge sous les lettres.
    bar_y = ty + b + px(14)
    bar_x0, bar_x1 = tx + l, tx + r
    third = (bar_x1 - bar_x0) / 3
    bars = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bard = ImageDraw.Draw(bars)
    for i, c in enumerate((BLUE, WHITE, RED)):
        bard.rectangle((bar_x0 + third * i, bar_y, bar_x0 + third * (i + 1), bar_y + px(9)), fill=c + (255,))
    img.alpha_composite(bars)

    # « CATALOGUE » en lettres dorées sous l'enseigne.
    small = ImageFont.truetype(str(FONT), px(66))
    label = "CATALOGUE"
    sp = px(7)
    widths = [ImageDraw.Draw(img).textlength(ch, font=small) for ch in label]
    lw = sum(widths) + sp * (len(label) - 1)
    lab = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lab)
    x = (S - lw) / 2
    _, lt, _, lb = ld.textbbox((0, 0), label, font=small)
    ly = (y1 + px(472)) // 2 - (lt + lb) // 2
    for ch, w in zip(label, widths):
        ld.text((x, ly), ch, font=small, fill=(255, 255, 255, 255))
        x += w + sp
    gold_text = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gold_text.paste(gold_fill((S, S)), (0, 0), lab.getchannel("A"))
    img.alpha_composite(glow(gold_text, px(8), 0.8))
    img.alpha_composite(gold_text)

    # Coins arrondis pour tout le monde (les halos ne débordent pas).
    img.putalpha(ImageChops.multiply(img.getchannel("A"), rounded_mask((S, S), (0, 0, S - 1, S - 1), px(112))))
    img.resize((SIZE, SIZE), Image.LANCZOS).save(out, optimize=True)


if __name__ == "__main__":
    make(sys.argv[1] if len(sys.argv) > 1 else ROOT / "logo" / "addon.png")
