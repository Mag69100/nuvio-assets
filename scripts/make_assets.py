"""Génère toutes les images des collections Nuvio à partir de assets.json.

- genres/<slug>.jpg et seasons/<slug>.jpg : cartes 1280x720 (image + dégradé + titre)
- gifs/<groupe>/<slug>.gif : animations jouées au survol (480x270)
    * genres, saisons, sagas : un reflet lumineux traverse la carte
    * plateformes, studios : logo qui « respire » sur fond blanc

Usage : python scripts/make_assets.py [dossier_images_locales]
Sans argument, les images sont téléchargées depuis TMDB.
"""
import io
import json
import math
import sys
import urllib.request
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "fonts" / "BebasNeue-Regular.ttf"
ASSETS = json.loads((ROOT / "assets.json").read_text(encoding="utf-8"))
LOCAL: Path | None = None   # dossier d'images locales (tests), défini dans main()

CARD = (1280, 720)
GIF = (480, 270)
FRAMES = 36          # ~2,9 s par boucle
FRAME_MS = 80


# ---------- chargement ----------
@lru_cache(maxsize=None)
def fetch(path: str, size: str = "w1280") -> Image.Image:
    if LOCAL:
        return Image.open(LOCAL / path.lstrip("/")).convert("RGBA")
    url = f"https://image.tmdb.org/t/p/{size}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "nuvio-assets"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def cover(img: Image.Image, w: int, h: int, zoom: float = 1.0) -> Image.Image:
    scale = max(w / img.width, h / img.height) * zoom
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((left, top, left + w, top + h)).convert("RGB")


# ---------- habillage ----------
@lru_cache(maxsize=None)
def shade_mask(w: int, h: int) -> Image.Image:
    col = Image.new("L", (1, h))
    for y in range(h):
        t = y / h
        col.putpixel((0, y), int(70 + 150 * max(0.0, (t - 0.35) / 0.65) ** 1.4))
    return col.resize((w, h))


def shade(img: Image.Image) -> Image.Image:
    w, h = img.size
    return Image.composite(Image.new("RGB", (w, h)), img, shade_mask(w, h))


@lru_cache(maxsize=None)
def title_layer(text: str, w: int, h: int) -> Image.Image:
    k = w / CARD[0]
    text = text.upper()
    size = int(150 * k)
    font = ImageFont.truetype(str(FONT), size)
    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    while probe.textlength(text, font=font) > w - 140 * k:
        size -= 4
        font = ImageFont.truetype(str(FONT), size)
    tw = probe.textlength(text, font=font)
    x, y = (w - tw) / 2, h - size - 60 * k

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((x, y + 4 * k), text, font=font, fill=(0, 0, 0, 200))
    layer = layer.filter(ImageFilter.GaussianBlur(10 * k))
    ImageDraw.Draw(layer).text((x, y), text, font=font, fill=(255, 255, 255, 255))
    return layer


def titled(bg: Image.Image, text: str) -> Image.Image:
    base = shade(bg).convert("RGBA")
    return Image.alpha_composite(base, title_layer(text, *bg.size)).convert("RGB")


# ---------- animations ----------
def save_gif(frames: list[Image.Image], out: Path, durations, palette_from: Image.Image) -> None:
    # Palette commune : pas de scintillement, et seules les zones qui bougent pèsent.
    out.parent.mkdir(parents=True, exist_ok=True)
    pal = palette_from.quantize(colors=255, method=Image.Quantize.MAXCOVERAGE)
    # La couleur de fond (coin de l'image) doit être reproduite exactement,
    # sinon un fond blanc devient blanc cassé et la tuile change de teinte au survol.
    bg = palette_from.convert("RGB").getpixel((0, 0))
    entries = pal.getpalette()[:255 * 3]
    nearest = min(range(255), key=lambda k: sum((entries[3 * k + c] - bg[c]) ** 2 for c in range(3)))
    entries[3 * nearest:3 * nearest + 3] = list(bg)
    pal.putpalette(entries)
    # Pillow arrondit la correspondance couleur -> palette : on force donc les pixels
    # exactement égaux au fond à utiliser l'entrée exacte.
    solid = Image.new("RGB", frames[0].size, bg)
    q = []
    for f in frames:
        p = f.quantize(palette=pal, dither=Image.Dither.NONE)
        exact = ImageChops.difference(f.convert("RGB"), solid).convert("L").point(lambda v: 255 if v == 0 else 0)
        p.paste(nearest, mask=exact)
        q.append(p)
    q[0].save(out, save_all=True, append_images=q[1:], duration=durations, loop=0, optimize=True, disposal=1)


def light_band(cx: float, w: int, h: int) -> Image.Image:
    mask = Image.new("L", (w, h), 0)
    bw = 70 * w / GIF[0]
    ImageDraw.Draw(mask).polygon(
        [(cx - bw, h), (cx, h), (cx + h * 0.5, 0), (cx + h * 0.5 - bw, 0)], fill=110)
    return mask.filter(ImageFilter.GaussianBlur(18 * w / GIF[0]))


def sheen(card: Image.Image, out: Path) -> None:
    """Un reflet lumineux traverse la carte, puis pause."""
    w, h = card.size
    white = Image.new("RGB", (w, h), (255, 255, 255))
    steps = 32                     # 25 images/s pendant le passage (~1,3 s)

    def ease(t: float) -> float:   # accélère puis ralentit
        return 0.5 - 0.5 * math.cos(math.pi * t)

    start, end = -h * 0.5 - 70 * w / GIF[0] - 40, w + 40   # du bord gauche au bord droit, sans image perdue
    frames = [Image.composite(white, card, light_band(start + (end - start) * ease(i / (steps - 1)), w, h))
              for i in range(steps)]
    frames.append(card)
    # Palette construite à partir de la carte ET d'une image avec le reflet :
    # les tons éclaircis ont leurs propres couleurs, sans cassure.
    sample = Image.new("RGB", (w * 2, h))
    sample.paste(card, (0, 0))
    sample.paste(frames[steps // 2], (w, 0))
    save_gif(frames, out, [40] * steps + [1500], sample)


LOGO_FRAMES = 50      # 25 images/s sur une boucle de 2 s
LOGO_FRAME_MS = 40
SUPERSAMPLE = 4      # calcul en haute résolution puis réduction : pas de saccade d'un pixel


def breathing_logo(path: str, out: Path) -> None:
    """Le logo grossit puis rétrécit doucement, centré au sous-pixel près."""
    logo = fetch(path, "original")
    w, h = GIF
    big_w, big_h = w * SUPERSAMPLE, h * SUPERSAMPLE
    fit = min(330 / logo.width, 145 / logo.height) * SUPERSAMPLE
    frames = []
    for i in range(LOGO_FRAMES):
        s = fit * (1.0 + 0.08 * (1 - math.cos(2 * math.pi * i / LOGO_FRAMES)) / 2)
        # Transformation affine en flottant : échelle et centrage continus.
        cx, cy = logo.width / 2, logo.height / 2
        matrix = (1 / s, 0, cx - big_w / 2 / s, 0, 1 / s, cy - big_h / 2 / s)
        layer = logo.transform((big_w, big_h), Image.AFFINE, matrix, resample=Image.BICUBIC,
                               fillcolor=(255, 255, 255, 0))
        frame = Image.new("RGBA", (big_w, big_h), (255, 255, 255, 255))
        frame.alpha_composite(layer)
        frames.append(frame.convert("RGB").resize((w, h), Image.LANCZOS))
    save_gif(frames, out, LOGO_FRAME_MS, frames[LOGO_FRAMES // 2])


# ---------- logos et titres pour le grand carrousel ----------
KEEP_COLORS = set(ASSETS.get("keep_logo_colors", []))
LIGHTEN_DARK = set(ASSETS.get("lighten_dark_logos", []))


def hero_logo(slug: str, path: str, out: Path) -> None:
    """Logo lisible sur un fond sombre : blanc, sauf logos déjà colorés."""
    logo = fetch(path, "original")
    logo = logo.crop(logo.getbbox() or (0, 0, logo.width, logo.height))
    if slug in LIGHTEN_DARK:
        # Garde les couleurs vives, passe en blanc les zones sombres (illisibles sur fond noir).
        rgb = logo.convert("RGB")
        r, g, b = rgb.split()
        brightest = ImageChops.lighter(ImageChops.lighter(r, g), b)
        lum = brightest.point(lambda v: 255 if v < 80 else 0)  # quasi-noir seulement
        white = Image.new("RGBA", logo.size, (255, 255, 255, 255))
        white.putalpha(logo.getchannel("A"))
        logo = Image.composite(white, logo, lum)
    elif slug not in KEEP_COLORS:
        alpha = logo.getchannel("A")
        logo = Image.new("RGBA", logo.size, (255, 255, 255, 255))
        logo.putalpha(alpha)
    logo.thumbnail((900, 300), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    logo.save(out, optimize=True)


def hero_title(text: str, out: Path) -> None:
    """Titre en Bebas Neue blanc, ombre douce, fond transparent."""
    text = text.upper()
    font = ImageFont.truetype(str(FONT), 200)
    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    l, t, r, b = probe.textbbox((0, 0), text, font=font)
    pad = 30
    w, h = r - l + 2 * pad, b - t + 2 * pad
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((pad - l, pad - t + 5), text, font=font, fill=(0, 0, 0, 170))
    layer = layer.filter(ImageFilter.GaussianBlur(12))
    ImageDraw.Draw(layer).text((pad - l, pad - t), text, font=font, fill=(255, 255, 255, 255))
    layer.thumbnail((1000, 300), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    layer.save(out, optimize=True)


# ---------- programme ----------
def main() -> None:
    global LOCAL
    LOCAL = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    for group in ("platforms", "studios"):
        for slug, _label, path in ASSETS[group]:
            hero_logo(slug, path, ROOT / "logos" / f"{slug}.png")
    for group in ("genres", "seasons", "moods", "sagas"):
        for slug, label, _path in ASSETS[group]:
            hero_title(label, ROOT / "titles" / group / f"{slug}.png")
    print("ok logos et titres")
    for group in ("genres", "seasons", "moods"):
        (ROOT / group).mkdir(exist_ok=True)
        for slug, label, path in ASSETS[group]:
            titled(cover(fetch(path), *CARD), label).save(
                ROOT / group / f"{slug}.jpg", quality=88, optimize=True, progressive=True)
            sheen(titled(cover(fetch(path), *GIF), label), ROOT / "gifs" / group / f"{slug}.gif")
            print("ok", group, slug)
    for slug, _label, path in ASSETS["sagas"]:
        sheen(cover(fetch(path), *GIF), ROOT / "gifs" / "sagas" / f"{slug}.gif")
        print("ok sagas", slug)
    for group in ("platforms", "studios"):
        for slug, _label, path in ASSETS[group]:
            breathing_logo(path, ROOT / "gifs" / group / f"{slug}.gif")
            print("ok", group, slug)


if __name__ == "__main__":
    main()
