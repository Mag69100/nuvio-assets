"""Animations de survol des tuiles Plateformes et Studios : un passage de la vraie intro de chaque marque.

- gifs/platforms/<slug>.gif et gifs/studios/<slug>.gif : GIF 480x270 (la taille de la tuile sur une TV 1080p),
  cadence d'origine (25 i/s au plus), logo final tenu 1,5 s avant que la boucle reparte.
- GIF et pas WebP : Nuvio TV n'anime que le GIF avant Android 9 (Fire TV Stick 4K de 2018 : Fire OS 6),
  et sur ces appareils un WebP animé ne s'affiche même pas.
- encodé par gifski en qualité maximale (palettes optimisées image par image, sans grain) ;
  7 Mo au plus, car Nuvio TV abandonne une image qui met plus de 8 s à arriver.

Les vidéos sont téléchargées depuis YouTube avec yt-dlp (meilleure définition), découpées par ffmpeg.

Usage : python scripts/make_intros.py [slug ...]
Sans argument, toutes les intros sont refaites. yt-dlp, ffmpeg et gifski doivent être dans le PATH
(ou YTDLP=… et GIFSKI=… pour donner leur chemin).
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".intros"          # vidéos sources téléchargées (ignoré par git)
W, H = 480, 270
MAX_FPS = 25
HOLD = 1.5                        # secondes sur la dernière image
# qualité maximale ; le léger lissage (90) est invisible sur la tuile et allège de 30 %.
# En dessous (65), du grain se voit.
GIFSKI_OPTS = ["--quality", "100", "--motion-quality", "90", "--lossy-quality", "90"]

# slug, dossier, vidéo YouTube, début, fin, cadrage, retouche ffmpeg[, secondes sur la dernière image]
#   cadrage : None = remplit le 16:9 (recadre au centre)
#             (x, y, l, h) = zone de la source gardée, posée sur fond noir si elle n'est pas en 16:9
#   la fin tombe juste avant le fondu au noir de la vidéo
INTROS = [
    ("netflix",        "platforms", "6Jg_rkKtJgo", 0.0, 3.8, None, "", 0.3),   # finit sur le ruban, pas sur un logo
    ("prime-video",    "platforms", "QJNynN61wHA", 0.0, 4.9, None, ""),
    ("paramount-plus", "platforms", "YAPiO_1SJG8", 9.5, 14.8, None, ""),
    ("disney-plus",    "platforms", "EWxFJlPN8Iw", 0.9, 5.5, None, ""),
    ("hbo-max",        "platforms", "lP6Rs_QWJtI", 1.55, 4.5, None, ""),
    ("apple-tv-plus",  "platforms", "3zIL54Yt8Zo", 0.2, 5.0, None, ""),
    ("canal-plus",     "platforms", "CtCY8z2iuSE", 1.0, 6.8, None, ""),
    ("crunchyroll",    "platforms", "jFJjCMPUTpE", 0.0, 5.6, None, ""),
    ("marvel-studios", "platforms", "lEmIYhVCGvg", 22.0, 27.6, (178, 100, 3484, 1960), ""),
    ("warner-bros",    "platforms", "O-jh_CDstZg", 5.4, 9.6, None, ""),
    # (x, y) excluent le logo de la chaîne YouTube en bas à droite
    ("dc-comics",      "platforms", "SHGB8bpClkU", 7.3, 14.6, (320, 108, 3200, 1800), ""),
    ("studio-33",      "studios",   "MmqV1BNNd4w", 15.6, 20.4, None, ""),
    ("studio-1",       "studios",   "ND5BlZCvx-E", 1.8, 7.4, None,
     "curves=all='0/0 0.12/0.3 0.4/0.75 1/1'"),   # éclairci (très sombre), le noir reste noir
    ("studio-41077",   "studios",   "silbBKuaXI4", 0.8, 6.1, None, ""),
    ("studio-3172",    "studios",   "Y77qa2feubs", 9.3, 14.4, None, ""),
    ("studio-3",       "studios",   "6ZyEU-uFbpk", 0.5, 10.9, None, ""),   # version 16:9 (open matte)
    ("studio-6125",    "studios",   "HCZeBzeAkPM", 7.2, 13.2, None, ""),
    ("studio-521",     "studios",   "6n3B01aRcvA", 16.6, 22.4, None, ""),
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
    return min(float(num) / float(den), MAX_FPS)


def make(slug, group, video_id, start, end, crop, extra, hold=HOLD) -> Path:
    src = download(video_id)
    if crop:
        x, y, cw, ch = crop
        frame = f"crop={cw}:{ch}:{x}:{y},scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos," \
                f"pad={W}:{H}:-1:-1:black"
    else:
        frame = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"
    fps = fps_of(src)
    chain = ",".join(s for s in (f"fps={fps:.5f}", frame, extra, f"tpad=stop_mode=clone:stop_duration={hold}") if s)
    out = ROOT / "gifs" / group / f"{slug}.gif"
    # ffmpeg découpe et met à l'échelle, gifski encode le GIF (flux y4m entre les deux)
    ffmpeg = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", str(start), "-to", str(end), "-i", str(src),
                               "-vf", chain, "-pix_fmt", "yuv444p", "-f", "yuv4mpegpipe", "-"],
                              stdout=subprocess.PIPE)
    subprocess.run([os.environ.get("GIFSKI", "gifski"), "-q", *GIFSKI_OPTS, "--fps", f"{fps:.3f}",
                    "-o", str(out), "-"], stdin=ffmpeg.stdout, check=True)
    ffmpeg.stdout.close()
    if ffmpeg.wait():
        raise RuntimeError(f"ffmpeg a échoué pour {slug}")
    return out


def main() -> None:
    wanted = set(sys.argv[1:])
    for intro in INTROS:
        if wanted and intro[0] not in wanted:
            continue
        out = make(*intro)
        print(f"ok {intro[0]} ({out.stat().st_size / 1e6:.1f} Mo)", flush=True)


if __name__ == "__main__":
    main()
