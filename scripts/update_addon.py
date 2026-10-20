"""Construit l'addon Nuvio complet (exécuté chaque nuit par GitHub Actions).

- Catalogues des tuiles (plateformes, genres, sagas, studios, saisons) : définis dans catalogs.json,
  invisibles sur l'accueil ("showInHome": false) mais utilisés par les collections.
- Rangées d'accueil : À la une, Tendances, Au cinéma, En ce moment.
- Tuile « En ce moment » : saison choisie selon la date (heure de Paris) + images « current ».
- Les identifiants sont des IDs IMDb (compatibles avec tous les addons de lecture),
  mis en cache dans data/imdb_cache.json pour limiter les appels à TMDB.

Nécessite le secret TMDB_API_KEY. Argument optionnel : forcer une saison.
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import make_assets as m  # noqa: E402

ROOT = m.ROOT
ADDON = ROOT / "addon"
CACHE_FILE = ROOT / "data" / "imdb_cache.json"
BUILT_FILE = ROOT / "data" / "meta_built.json"
DEFS = json.loads((ROOT / "catalogs.json").read_text(encoding="utf-8"))
KEY = os.environ.get("TMDB_API_KEY", "").strip()
LANG = "fr-FR"
PER_CATALOG = 100
DISCOVER_LIMIT = 100
PAGE_SIZE = 20
ADDON_ID = "com.xnzx07.catalogue-fr"
TODAY = dt.datetime.now(ZoneInfo("Europe/Paris")).date()

SEASON_KEYWORDS = {
    "halloween": "3335|9694|232795",
    "noel": "207317|5570|260365",
    "saint-valentin": "160404",
    "paques": "9921|9923",
    "ete": "14714",
}


# ---------- saisons ----------
def easter(year: int) -> dt.date:
    """Date de Pâques (algorithme de Meeus/Jones/Butcher)."""
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    mth = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * mth + 114) // 31
    day = ((h + l - 7 * mth + 114) % 31) + 1
    return dt.date(year, month, day)


def pick_season(today: dt.date) -> str:
    md = (today.month, today.day)
    e = easter(today.year)
    if e - dt.timedelta(days=15) <= today <= e + dt.timedelta(days=8):
        return "paques"
    if (10, 1) <= md <= (11, 2):
        return "halloween"
    if md >= (11, 20) or md <= (1, 6):
        return "noel"
    if (1, 25) <= md <= (2, 15):
        return "saint-valentin"
    if (6, 20) <= md <= (8, 31):
        return "ete"
    return "a-laffiche"


# ---------- TMDB ----------
def tmdb(path: str, **params) -> dict:
    params = {"api_key": KEY, "language": LANG, **params}
    url = f"https://api.themoviedb.org/3{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "nuvio-assets"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return {}
            if e.code == 429 or e.code >= 500:
                time.sleep(2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2 ** attempt)
    return {}


_cache_lock = Lock()
CACHE: dict[str, str] = json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}


def imdb_id(kind: str, tmdb_id: int) -> str | None:
    key = f"{kind}:{tmdb_id}"
    with _cache_lock:
        if key in CACHE:
            return CACHE[key] or None
    ext = tmdb(f"/{'tv' if kind == 'series' else 'movie'}/{tmdb_id}/external_ids")
    value = ext.get("imdb_id") or ""
    with _cache_lock:
        CACHE[key] = value
    return value or None


NOISE_TV_GENRES = {"10763", "10764", "10766", "10767"}   # actualité, téléréalité, soap, talk-show


def readable(title: str | None) -> bool:
    """Écarte les titres non traduits dans un alphabet non latin (illisibles pour un public français)."""
    return bool(title) and all(ord(ch) < 0x0370 or 0x2000 <= ord(ch) <= 0x206F for ch in title)


def to_metas(results: list[dict], kind: str) -> list[dict]:
    seen, rows = set(), []
    for it in results:
        if it.get("id") in seen or not it.get("poster_path") or not readable(it.get("title") or it.get("name")):
            continue
        seen.add(it["id"])
        rows.append(it)
    with ThreadPoolExecutor(max_workers=8) as pool:
        ids = list(pool.map(lambda it: imdb_id(kind, it["id"]), rows))
    metas = []
    for it, imdb in zip(rows, ids):
        if not imdb:
            continue
        date = it.get("release_date") or it.get("first_air_date") or ""
        metas.append({
            "_tmdb": it["id"],          # interne : retiré avant écriture
            "id": imdb,
            "type": kind,
            "name": (it.get("title") or it.get("name") or "").strip("\u200e\u200f \t"),
            "poster": "https://image.tmdb.org/t/p/w500" + it["poster_path"],
            "background": ("https://image.tmdb.org/t/p/w1280" + it["backdrop_path"]) if it.get("backdrop_path") else None,
            "description": it.get("overview") or None,
            "releaseInfo": date[:4] or None,
        })
        if len(metas) >= PER_CATALOG:
            break
    return metas


def pages(endpoint: str, params: dict, count: int = 6) -> list[dict]:
    out = []
    for page in range(1, count + 1):
        data = tmdb(endpoint, page=page, **params)
        out += data.get("results", [])
        if page >= data.get("total_pages", 0):
            break
    return out


def build(defn: dict) -> list[dict]:
    if "mix" in defn:
        # Mélange plusieurs sources (ex. films + séries) en alternance.
        lists = [build(sub) for sub in defn["mix"]]
        merged, seen = [], set()
        for i in range(max((len(x) for x in lists), default=0)):
            for lst in lists:
                if i < len(lst) and lst[i]["id"] not in seen:
                    seen.add(lst[i]["id"])
                    merged.append(lst[i])
        return merged[:defn.get("limit", PER_CATALOG)]
    kind = defn["type"]
    if "collection" in defn:
        parts = tmdb(f"/collection/{defn['collection']}").get("parts", [])
        parts.sort(key=lambda p: p.get("release_date") or "9999")   # ordre de sortie
        return to_metas(parts, "movie")
    limit = defn.get("limit", PER_CATALOG)
    npages = min(6, limit // 20 + 2)   # juste assez de pages pour remplir la liste
    if "endpoint" in defn:
        return to_metas(pages(defn["endpoint"], defn.get("params", {}), npages), kind)[:limit]
    params = dict(defn["discover"])
    date_gte = "first_air_date.gte" if kind == "series" else "primary_release_date.gte"
    date_lte = "first_air_date.lte" if kind == "series" else "primary_release_date.lte"
    if defn.get("lastDays"):   # fenêtre glissante : « sortis ces N derniers jours »
        params[date_gte] = (TODAY - dt.timedelta(days=defn["lastDays"])).isoformat()
        params[date_lte] = TODAY.isoformat()
    # Pas de titres confidentiels : un minimum de votes si le catalogue n'en fixe pas.
    params.setdefault("vote_count.gte", 50)
    if kind == "series":
        # Exclut talk-shows, actualité, téléréalité et soaps, qui faussent les classements.
        excluded = set(filter(None, str(params.get("without_genres", "")).replace(",", "|").split("|")))
        params["without_genres"] = "|".join(sorted(excluded | NOISE_TV_GENRES))
    if defn.get("untilToday"):
        params[date_lte] = TODAY.isoformat()
    if defn.get("availableHere"):
        # Seulement ce qu'on peut déjà regarder en France (abonnement, location ou achat).
        params["watch_region"] = "FR"
        params.setdefault("with_watch_monetization_types", "flatrate|free|ads|rent|buy")
    endpoint = f"/discover/{'tv' if kind == 'series' else 'movie'}"
    if defn.get("rotateDaily"):
        # Sélection différente chaque jour : on démarre à une page qui dépend de la date.
        total = min(tmdb(endpoint, page=1, **params).get("total_pages", 1), 50)
        start = TODAY.toordinal() % max(total, 1) + 1
        results = []
        for k in range(6):
            results += tmdb(endpoint, page=(start + k - 1) % total + 1, **params).get("results", [])
        return to_metas(results, kind)[:limit]
    return to_metas(pages(endpoint, params, npages), kind)[:limit]


SEASON_TITLES = {
    "halloween": "Spécial Halloween",
    "noel": "Spécial Noël",
    "saint-valentin": "Spécial Saint-Valentin",
    "paques": "Spécial Pâques",
    "ete": "Spécial été",
    "a-laffiche": "À l'affiche",
}


def season_defs(season: str) -> list[dict]:
    if season == "a-laffiche":
        films = {"endpoint": "/movie/now_playing", "params": {"region": "FR"}}
    elif season == "halloween":
        # Uniquement de l'horreur (pas d'animation ni de films familiaux).
        films = {"discover": {"sort_by": "popularity.desc", "with_genres": "27", "without_genres": "16|10751", "vote_count.gte": 300}}
    else:
        films = {"discover": {"sort_by": "popularity.desc", "with_keywords": SEASON_KEYWORDS[season]}}
    # Une seule rangée : avec les versions de Nuvio qui ignorent "showInHome",
    # chaque catalogue de l'addon apparaît sur l'accueil.
    return [{"id": "accueil-en-ce-moment", "type": "movie", "name": SEASON_TITLES[season], "home": True, **films}]


# ---------- fiches détaillées (ressource « meta ») ----------
IMG = "https://image.tmdb.org/t/p/"


def pick_logo(images: dict) -> str | None:
    logos = images.get("logos") or []
    for lang in ("fr", "en", None):
        for lg in logos:
            if lg.get("iso_639_1") == lang and lg.get("file_path"):
                return IMG + "w500" + lg["file_path"]
    return None


def build_meta(kind: str, tmdb_id: int, imdb: str) -> dict | None:
    """Fiche complète au format addon Stremio : résumé, genres, casting, durée, épisodes…"""
    path = f"/{'tv' if kind == 'series' else 'movie'}/{tmdb_id}"
    d = tmdb(path, append_to_response="credits,images", include_image_language="fr,en,null")
    if not d:
        return None
    crew = d.get("credits", {}).get("crew", [])
    meta = {
        "id": imdb,
        "type": kind,
        "name": d.get("title") or d.get("name"),
        "poster": (IMG + "w500" + d["poster_path"]) if d.get("poster_path") else None,
        "background": (IMG + "original" + d["backdrop_path"]) if d.get("backdrop_path") else None,
        "logo": pick_logo(d.get("images", {})),
        "description": d.get("overview") or None,
        "genres": [g["name"] for g in d.get("genres", [])],
        "cast": [c["name"] for c in d.get("credits", {}).get("cast", [])[:10]],
        "imdbRating": f"{d['vote_average']:.1f}" if d.get("vote_average") else None,
        "country": ", ".join(c.get("iso_3166_1", "") for c in d.get("production_countries", [])) or None,
        "language": d.get("original_language"),
    }
    if kind == "movie":
        date = d.get("release_date") or ""
        meta.update({
            "releaseInfo": date[:4] or None,
            "released": f"{date}T00:00:00.000Z" if date else None,
            "runtime": f"{d['runtime']} min" if d.get("runtime") else None,
            "director": [c["name"] for c in crew if c.get("job") == "Director"],
        })
    else:
        first, last = (d.get("first_air_date") or "")[:4], (d.get("last_air_date") or "")[:4]
        ongoing = d.get("status") in ("Returning Series", "In Production")
        meta.update({
            "releaseInfo": (f"{first}-" if ongoing else f"{first}-{last}" if last and last != first else first) or None,
            "released": f"{d['first_air_date']}T00:00:00.000Z" if d.get("first_air_date") else None,
            "runtime": f"{d['episode_run_time'][0]} min" if d.get("episode_run_time") else None,
            "director": [c["name"] for c in d.get("created_by", [])],
        })
        videos = []
        for season in d.get("seasons", []):
            n = season.get("season_number")
            if not n:      # on ignore les « épisodes spéciaux » (saison 0)
                continue
            for ep in tmdb(f"{path}/season/{n}").get("episodes", []):
                air = ep.get("air_date")
                videos.append({
                    "id": f"{imdb}:{n}:{ep['episode_number']}",
                    "title": ep.get("name") or f"Épisode {ep['episode_number']}",
                    "season": n,
                    "episode": ep["episode_number"],
                    "released": f"{air}T00:00:00.000Z" if air else None,
                    "overview": ep.get("overview") or None,
                    "thumbnail": (IMG + "w500" + ep["still_path"]) if ep.get("still_path") else None,
                })
        meta["videos"] = videos
    return {k: v for k, v in meta.items() if v not in (None, [], "")}


def write_metas(items: dict[tuple[str, str], int]) -> int:
    """Écrit addon/meta/<type>/<imdb>.json pour chaque titre des rangées, supprime les anciens."""
    keep = {f"{kind}/{imdb}.json" for kind, imdb in items}
    for old in (ADDON / "meta").rglob("*.json") if (ADDON / "meta").exists() else []:
        if f"{old.parent.name}/{old.name}" not in keep:
            old.unlink()

    built = json.loads(BUILT_FILE.read_text()) if BUILT_FILE.exists() else {}

    def fresh(kind: str, imdb: str) -> bool:
        """Séries refaites tous les 2 jours (nouveaux épisodes), films toutes les 2 semaines."""
        date = built.get(f"{kind}/{imdb}")
        if not date or not (ADDON / "meta" / kind / f"{imdb}.json").exists():
            return False
        age = (TODAY - dt.date.fromisoformat(date)).days
        return age < (2 if kind == "series" else 14)

    def one(entry):
        (kind, imdb), tmdb_id = entry
        if fresh(kind, imdb):
            return 1
        meta = build_meta(kind, tmdb_id, imdb)
        if meta:
            write_json(ADDON / "meta" / kind / f"{imdb}.json", {"meta": meta})
            with _cache_lock:
                built[f"{kind}/{imdb}"] = TODAY.isoformat()
            return 1
        return 0

    with ThreadPoolExecutor(max_workers=8) as pool:
        total = sum(pool.map(one, items.items()))
    built = {k: v for k, v in built.items() if tuple(k.split("/", 1)) in items}
    write_json(BUILT_FILE, built)
    return total


# ---------- écriture ----------
def write_json(path: Path, data, pretty: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1 if pretty else None,
                               separators=None if pretty else (",", ":")), encoding="utf-8")


def season_images(season: str) -> str:
    seasons = {slug: path for slug, _label, path in m.ASSETS["seasons"]}
    label = SEASON_TITLES[season]
    if season == "a-laffiche":
        top = next(x for x in tmdb("/trending/movie/day")["results"] if x.get("backdrop_path"))
        backdrop = top["backdrop_path"]
    else:
        backdrop = seasons[season]
    src = m.fetch(backdrop)
    (ROOT / "seasons").mkdir(exist_ok=True)
    m.titled(m.cover(src, *m.CARD), label).save(ROOT / "seasons" / "current.jpg", quality=88, optimize=True, progressive=True)
    m.sheen(m.titled(m.cover(src, *m.GIF), label), ROOT / "gifs" / "seasons" / "current.gif")
    m.hero_title(label, ROOT / "titles" / "seasons" / "current.png")
    m.cover(src, 1280, 720).save(ROOT / "seasons" / "current-hero.jpg", quality=88, optimize=True, progressive=True)
    return label


def main() -> None:
    if not KEY:
        sys.exit("Secret TMDB_API_KEY manquant : ajoutez-le dans Settings → Secrets and variables → Actions.")
    season = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else pick_season(TODAY)

    # Seules les rangées d'accueil et la saison passent par l'addon : les versions de Nuvio qui
    # ignorent "showInHome" afficheraient sinon tous les catalogues des tuiles sur l'accueil.
    # Les tuiles utilisent les sources TMDB intégrées à Nuvio (définies dans catalogs.json pour mémoire).
    defs = season_defs(season) + [d for d in DEFS["catalogs"] if d.get("home")]
    discover = DEFS.get("discover", [])
    counts, failed = {}, []
    pages_out: dict[str, list[dict]] = {}   # chemin relatif -> fiches de la page

    def paginate(kind: str, cid: str, metas: list[dict], genre: str | None = None) -> None:
        """Découpe une liste en pages de PAGE_SIZE : l'accueil n'affiche que la 1re,
        « Voir plus » et Découvrir chargent les suivantes (skip=20, 40…)."""
        prefix = f"genre={genre}&" if genre else ""
        for off in range(0, len(metas) + 1, PAGE_SIZE):   # +1 : page vide finale = fin de liste
            chunk = metas[off:off + PAGE_SIZE]
            if off == 0:
                path = f"{kind}/{cid}/genre={genre}.json" if genre else f"{kind}/{cid}.json"
            else:
                path = f"{kind}/{cid}/{prefix}skip={off}.json"
            pages_out[path] = chunk

    for defn in defs:
        try:
            metas = build(defn)
        except Exception as e:  # un catalogue en échec ne bloque pas les autres
            failed.append(f"{defn['id']}: {e}")
            continue
        counts[defn["id"]] = len(metas)
        for meta in metas:
            meta.pop("_tmdb", None)
        if metas:
            paginate(defn["type"], defn["id"], metas)

    # Découvrir : un catalogue par entrée du 2e menu, un fichier par filtre du 3e menu.
    # Le fichier sans filtre reste vide : vide, la rangée n'apparaît pas sur l'accueil.
    for d in discover:
        pages_out[f"{d['type']}/{d['id']}.json"] = []
        for opt in d["options"]:
            try:
                metas = build({"type": d["type"], "limit": DISCOVER_LIMIT, **opt["def"]})
            except Exception as e:
                failed.append(f"{d['id']}/{opt['label']}: {e}")
                continue
            counts[f"{d['id']}/{opt['label']}"] = len(metas)
            for meta in metas:
                meta.pop("_tmdb", None)
            if metas:
                paginate(d["type"], d["id"], metas, opt["label"])

    # Réécriture complète du dossier des catalogues (les anciennes pages disparaissent).
    import shutil
    shutil.rmtree(ADDON / "catalog", ignore_errors=True)
    shutil.rmtree(ADDON / "meta", ignore_errors=True)   # les fiches viennent de TMDB Discover Plus
    for path, chunk in pages_out.items():
        write_json(ADDON / "catalog" / path, {"metas": chunk})

    paging = [{"name": "skip"}]
    write_json(ADDON / "manifest.json", {
        "id": ADDON_ID,
        "version": "2.6.0",
        "name": "Catalogue FR",
        "description": "Rangées d'accueil, Découvrir (films et séries par filtre) et saison en cours, en français, mis à jour chaque nuit.",
        # Catalogues seulement : les fiches détaillées (résumé, épisodes…) sont fournies en direct
        # par TMDB Discover Plus, qui gère les identifiants IMDb.
        "resources": ["catalog"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"],
        # Catalogues Découvrir en tête : c'est l'ordre du menu « catalogue » de Découvrir.
        "catalogs": [{"type": d["type"], "id": d["id"], "name": d["name"], "showInHome": False, "pageSize": PAGE_SIZE,
                        # Filtre obligatoire : l'appli choisit d'office le 1er filtre au lieu
                        # d'afficher la liste vide « Tous les genres ».
                        "extra": [{"name": "genre", "isRequired": True, "options": [o["label"] for o in d["options"]]}] + paging,
                        "extraRequired": ["genre"], "extraSupported": ["genre", "skip"],
                        "genres": [o["label"] for o in d["options"]]}
                     for d in discover]
                    + [{"type": d["type"], "id": d["id"], "name": d["name"], "showInHome": bool(d.get("home")),
                        "pageSize": PAGE_SIZE, "extra": paging, "extraSupported": ["skip"]}
                       for d in defs],
    }, pretty=True)

    label = season_images(season)
    write_json(CACHE_FILE, CACHE)
    write_json(ADDON / "state.json", {"season": season, "label": label, "date": TODAY.isoformat(),
                                      "catalogs": len(counts), "pages": len(pages_out),
                                      "empty": [k for k, v in counts.items() if not v],
                                      "failed": failed}, pretty=True)
    print(f"Saison : {label} — {len(counts)} listes, {len(pages_out)} pages, échecs : {len(failed)}")
    for f in failed:
        print("  ", f)


if __name__ == "__main__":
    main()
