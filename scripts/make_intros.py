"""Animations de survol des tuiles Plateformes et Studios : un passage de la vraie intro de chaque marque.

- gifs/platforms/<slug>.webp et gifs/studios/<slug>.webp : WebP animé 640x360, cadence d'origine (30 i/s au plus).
  Le WebP garde toutes les couleurs pour un poids 4 à 5 fois plus petit qu'un GIF à 256 couleurs ;
  Nuvio TV l'anime sur Android 9 et plus (AnimatedImageDecoder), comme les navigateurs du site.
- la première image est le logo final : les appareils plus anciens, qui n'affichent que la première image,
  montrent le logo, et la boucle repart sans saut (elle finit sur ce même logo)
- le logo final reste affiché 1,5 s avant que la boucle reparte

Les vidéos sont téléchargées depuis YouTube avec yt-dlp (meilleure définition), puis découpées avec ffmpeg.

Usage : python scripts/make_intros.py [slug ...]
Sans argument, toutes les intros sont refaites. yt-dlp et ffmpeg doivent être dans le PATH
(ou YTDLP=chemin/vers/yt-dlp).
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".intros"          # vidéos sources téléchargées (ignoré par git)
W, H = 640, 360
MAX_FPS = 30
HOLD = 1.5                        # secondes sur la dernière image
QUALITY = 80                      # qualité WebP (0-100)

# slug, dossier, vidéo YouTube, début, fin, cadrage, retouche ffmpeg[, logo final en première image]
#   cadrage : None = remplit le 16:9 (recadre au centre)
#             (x, y, l, h) = zone de la source gardée, posée sur fond noir si elle n'est pas en 16:9
#   la fin tombe juste avant le fondu au noir de la vidéo
INTROS = [
    # finit sur le ruban rouge, pas sur le logo : on part du N déjà formé, qui sert de première image
    ("netflix",        "platforms", "6Jg_rkKtJgo", 0.85, 3.95, None, "", False),
    ("prime-video",    "platforms", "QJNynN61wHA", 0.0, 4.9, None, ""),
    ("paramount-plus", "platforms", "YAPiO_1SJG8", 8.0, 14.8, None, ""),
    ("disney-plus",    "platforms", "EWxFJlPN8Iw", 0.9, 5.5, None, ""),
    ("hbo-max",        "platforms", "lP6Rs_QWJtI", 1.55, 4.5, None, ""),
    ("apple-tv-plus",  "platforms", "3zIL54Yt8Zo", 0.2, 5.0, None, ""),
    ("canal-plus",     "platforms", "CtCY8z2iuSE", 1.0, 6.8, None, ""),
    ("crunchyroll",    "platforms", "jFJjCMPUTpE", 0.0, 5.6, None, ""),
    ("marvel-studios", "platforms", "lEmIYhVCGvg", 20.5, 28.0, (178, 100, 3484, 1960), ""),
    ("warner-bros",    "platforms", "O-jh_CDstZg", 4.2, 10.6, None, ""),
    # (x, y) excluent le logo de la chaîne YouTube en bas à droite
    ("dc-comics",      "platforms", "SHGB8bpClkU", 7.3, 14.6, (320, 108, 3200, 1800), ""),
    ("studio-33",      "studios",   "MmqV1BNNd4w", 13.5, 21.0, None, ""),
    ("studio-1",       "studios",   "ND5BlZCvx-E", 1.8, 7.4, None,
     "curves=all='0/0 0.12/0.3 0.4/0.75 1/1'"),   # éclairci (très sombre), le noir reste noir
    ("studio-41077",   "studios",   "silbBKuaXI4", 0.8, 6.1, None, ""),
    ("studio-3172",    "studios",   "Y77qa2feubs", 9.3, 14.4, None, ""),
    ("studio-3",       "studios",   "UtLqABjbHAE", 8.9, 16.0, (204, 222, 3432, 1716), ""),
    ("studio-6125",    "studios",   "HCZeBzeAkPM", 5.3, 13.5, None, ""),
    ("studio-521",     "studios",   "6n3B01aRcvA", 15.0, 23.0, None, ""),
    ("studio-6704",    "studios",   "tKgTedV6Soo", 25.7, 33.0, (120, 0, 1680, 800), ""),
    ("studio-10342",   "studios",   "Ox_OHC8p2wo", 0.9, 6.3, None, ""),
]


def run(cmd: list[str]) -> str:
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout.strip()


def download(video_id: str) -> Path:
    CACHE.mkdir(exist_ok=True)
    found = list(CACHE.glob(f"{video_id}.*"))
    if found:
        return found[0]
    ytdlp = os.environ.get("YTDLP", "yt-dlp")
    run([ytdlp, "-q", "--no-warnings", "-f", "bv*", "-S", "res,fps",
         "-o", str(CACHE / f"{video_id}.%(ext)s"), "--", video_id])
    return next(CACHE.glob(f"{video_id}.*"))


def fps_of(src: Path) -> float:
    num, den = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                    "stream=r_frame_rate", "-of", "csv=p=0", str(src)]).strip(",").split("/")
    fps = float(num) / float(den)
    while fps > MAX_FPS:          # 60 → 30, 50 → 25
        fps /= 2
    return fps


def make(slug, group, video_id, start, end, crop, extra, logo_first=True) -> Path:
    src = download(video_id)
    if crop:
        x, y, cw, ch = crop
        frame = f"crop={cw}:{ch}:{x}:{y},scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos," \
                f"pad={W}:{H}:-1:-1:black"
    else:
        frame = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    chain = ",".join(s for s in (f"fps={fps_of(src):.5f}", frame, extra) if s)
    hold = f"tpad=stop_mode=clone:stop_duration={HOLD}"
    if logo_first:   # [logo final] + intro + logo final tenu HOLD secondes
        graph = f"[0:v]{chain},split[c][d];[d]reverse,trim=end_frame=1,setpts=PTS-STARTPTS[l];" \
                f"[c]setpts=PTS-STARTPTS[i];[l][i]concat=n=2:v=1,{hold}[v]"
    else:
        graph = f"[0:v]{chain},{hold}[v]"
    out = ROOT / "gifs" / group / f"{slug}.webp"
    run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-to", str(end), "-i", str(src),
         "-filter_complex", graph, "-map", "[v]", "-an", "-c:v", "libwebp", "-quality", str(QUALITY),
         "-compression_level", "6", "-loop", "0", str(out)])
    return out


def main() -> None:
    wanted = set(sys.argv[1:])
    for intro in INTROS:
        if wanted and intro[0] not in wanted:
            continue
        out = make(*intro)
        print(f"ok {intro[0]} ({out.stat().st_size / 1e6:.1f} Mo)")


if __name__ == "__main__":
    main()
