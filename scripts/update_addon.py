"""Construit l'addon Nuvio complet (exécuté chaque nuit par GitHub Actions).

- Catalogues des tuiles (plateformes, genres, sagas, studios, saisons) : définis dans catalogs.json,
  invisibles sur l'accueil ("showInHome": false) mais utilisés par les collections.
- Rangées d'accueil : À la une, Tendances, Au cinéma, En ce moment.
- Tuile « En ce moment » : saison choisie selon la date (heure de Paris) + images « current ».
- Les identifiants sont des IDs IMDb (compatibles avec tous les addons de lecture),
  mis en cache dans data/imdb_cache.json pour limiter les appels à TMDB.

Nécessite le secret TMDB_API_KEY. Argument optionnel : forcer une saison.

Une panne de TMDB ne publie jamais un addon troué. Code de sortie :
- 0 : tout est à jour ;
- 3 : quelques listes en échec (ou vides) : elles gardent leurs pages de la veille, le reste est écrit ;
- 1 : clé refusée ou plus de 10 % des listes en échec : rien n'est modifié.
"""
import datetime as dt
import http.client
import json
import os
import shutil
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
class TMDBError(RuntimeError):
    """TMDB n'a pas répondu après plusieurs essais : le catalogue concerné est en échec (jamais vide)."""


class TMDBAuthError(TMDBError):
    """Clé refusée (401) : inutile d'insister, toute la nuit échouerait pareil."""


def tmdb(path: str, **params) -> dict:
    """Réponse de TMDB ; {} pour un titre qui n'existe plus (404). Lève TMDBError si TMDB reste
    injoignable : une panne ne doit jamais passer pour une liste vide."""
    params = {"api_key": KEY, "language": LANG, **params}
    url = f"https://api.themoviedb.org/3{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "nuvio-assets"})
    last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return {}
            if e.code == 401:
                raise TMDBAuthError("clé TMDB refusée (401) : vérifier le secret TMDB_API_KEY") from e
            if e.code != 429 and e.code < 500:
                raise TMDBError(f"{path} : erreur {e.code}") from e
            last = f"erreur {e.code}"
        except (OSError, ValueError, http.client.HTTPException) as e:   # réseau, délai, réponse tronquée
            last = type(e).__name__
        if attempt < 4:
            time.sleep(2 ** attempt)
    raise TMDBError(f"{path} : TMDB injoignable après 5 essais ({last})")


_cache_lock = Lock()
CACHE: dict[str, str] = json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}
# Titre sans identifiant IMDb : « ?AAAA-MM-JJ » (jour de la vérification), redemandé après NO_IMDB_DAYS
# jours (IMDb crée souvent la fiche après TMDB). L'ancien format "" (date inconnue) est redemandé aussi.
NO_IMDB_DAYS = 7


def imdb_id(kind: str, tmdb_id: int) -> str | None:
    key = f"{kind}:{tmdb_id}"
    with _cache_lock:
        value = CACHE.get(key)
    if value:
        if not value.startswith("?"):
            return value
        try:
            if (TODAY - dt.date.fromisoformat(value[1:])).days < NO_IMDB_DAYS:
                return None
        except ValueError:
            pass
    # Une erreur de TMDB remonte sans rien mettre en cache : le titre sera redemandé la prochaine fois.
    ext = tmdb(f"/{'tv' if kind == 'series' else 'movie'}/{tmdb_id}/external_ids")
    value = ext.get("imdb_id") or ""
    with _cache_lock:
        CACHE[key] = value or f"?{TODAY.isoformat()}"
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
        total = max(min(tmdb(endpoint, page=1, **params).get("total_pages", 1), 50), 1)   # 0 page : liste vide
        start = TODAY.toordinal() % total + 1
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


def discover_defs() -> list[dict]:
    """Catalogues de Découvrir. « Par année » commence à l'année en cours (ajoutée d'elle-même
    sur le modèle de la plus récente) ; films de l'année et de l'an dernier : déjà dispo en France."""
    out = []
    for d in DEFS.get("discover", []):
        if not d.get("yearly"):
            out.append(d)
            continue
        key = "first_air_date_year" if d["type"] == "series" else "primary_release_year"
        model = d["options"][0]["def"]
        added = [{"label": str(y), "def": {**model, "discover": {**model["discover"], key: y}}}
                 for y in range(TODAY.year, model["discover"][key], -1)]
        options = []
        for o in added + d["options"]:
            year = o["def"]["discover"][key]
            if year > TODAY.year:
                continue
            defn = {k: v for k, v in o["def"].items() if k != "availableHere"}
            if d["type"] == "movie" and year >= TODAY.year - 1:
                defn["availableHere"] = True
            options.append({**o, "def": defn})
        out.append({**d, "options": options})
    return out


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


# ---------- écriture ----------
def write_json(path: Path, data, pretty: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1 if pretty else None,
                               separators=None if pretty else (",", ":")), encoding="utf-8")


def season_images(season: str) -> str:
    """Images de la tuile « En ce moment ». TMDB injoignable : celles de la veille restent."""
    seasons = {slug: path for slug, _label, path in m.ASSETS["seasons"]}
    label = SEASON_TITLES[season]
    card = ROOT / "seasons" / "current.jpg"
    try:
        if season == "a-laffiche":
            results = tmdb("/trending/movie/day").get("results") or []
            backdrop = next((x["backdrop_path"] for x in results if x.get("backdrop_path")), None)
            if not backdrop:
                raise TMDBError("tendances du jour sans image")
        else:
            backdrop = seasons[season]
        src = m.fetch(backdrop)
    except TMDBAuthError:
        raise
    except Exception as e:
        if not card.exists():
            raise
        print(f"::warning::Images de la saison non refaites ({e}) : celles de la veille restent.")
        return label
    card.parent.mkdir(exist_ok=True)
    m.titled(m.cover(src, *m.CARD), label).save(card, quality=88, optimize=True, progressive=True)
    m.sheen(m.titled(m.cover(src, *m.GIF), label), ROOT / "gifs" / "seasons" / "current.gif")
    m.hero_title(label, ROOT / "titles" / "seasons" / "current.png")
    m.cover(src, 1280, 720).save(ROOT / "seasons" / "current-hero.jpg", quality=88, optimize=True, progressive=True)
    return label


# ---------- catalogues : une liste en échec garde ses pages de la veille ----------
MAX_FAILED = 0.10    # plus de 10 % des listes en échec : panne de TMDB, rien n'est modifié
PARTIAL_EXIT = 3     # quelques listes en échec : le reste est écrit, le workflow enregistre puis passe au rouge


def old_pages(catalog: Path, kind: str, cid: str, genre: str | None = None) -> list[Path]:
    """Pages déjà publiées d'une liste : <cid>.json et <cid>/skip=N.json, ou pour un filtre de
    Découvrir <cid>/genre=X.json et <cid>/genre=X&skip=N.json."""
    folder = catalog / kind / cid
    files = sorted(folder.iterdir()) if folder.is_dir() else []
    if genre is None:
        first = catalog / kind / f"{cid}.json"
        return ([first] if first.is_file() else []) + [f for f in files if f.name.startswith("skip=")]
    return [f for f in files if f.name == f"genre={genre}.json" or f.name.startswith(f"genre={genre}&skip=")]


def publish_catalog(pages_out: dict[str, list[dict]], keep: list[tuple[str, str, str | None]],
                    catalog: Path | None = None) -> int:
    """Écrit les nouvelles pages dans un dossier à part, y recopie les pages de la veille des listes
    en échec, puis remplace le dossier des catalogues d'un coup (les pages disparues s'en vont).
    Renvoie le nombre de pages gardées."""
    catalog = catalog or ADDON / "catalog"
    new, old = catalog.with_name(catalog.name + ".new"), catalog.with_name(catalog.name + ".old")
    shutil.rmtree(new, ignore_errors=True)
    shutil.rmtree(old, ignore_errors=True)
    for path, chunk in pages_out.items():
        write_json(new / path, {"metas": chunk})
    kept = 0
    for kind, cid, genre in keep:
        for f in old_pages(catalog, kind, cid, genre):
            dest = new / f.relative_to(catalog)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(f, dest)
            kept += 1
    if catalog.exists():
        catalog.rename(old)
    new.rename(catalog)
    shutil.rmtree(old, ignore_errors=True)
    return kept


def main() -> None:
    if not KEY:
        sys.exit("Secret TMDB_API_KEY manquant : ajoutez-le dans Settings → Secrets and variables → Actions.")
    season = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else pick_season(TODAY)

    # Seules les rangées d'accueil et la saison passent par l'addon : les versions de Nuvio qui
    # ignorent "showInHome" afficheraient sinon tous les catalogues des tuiles sur l'accueil.
    # Les tuiles utilisent les sources TMDB intégrées à Nuvio (définies dans catalogs.json pour mémoire).
    defs = season_defs(season) + [d for d in DEFS["catalogs"] if d.get("home")]
    discover = discover_defs()
    counts, failed, empty = {}, [], []
    keep: list[tuple[str, str, str | None]] = []   # listes en échec : leurs pages de la veille restent
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

    # (nom, type, id, filtre de Découvrir, définition) de chaque liste.
    units = [(d["id"], d["type"], d["id"], None, d) for d in defs]
    # Découvrir : un catalogue par entrée du 2e menu, un fichier par filtre du 3e menu.
    # Le fichier sans filtre reste vide : vide, la rangée n'apparaît pas sur l'accueil.
    for d in discover:
        pages_out[f"{d['type']}/{d['id']}.json"] = []
        units += [(f"{d['id']}/{o['label']}", d["type"], d["id"], o["label"],
                   {"type": d["type"], "limit": DISCOVER_LIMIT, **o["def"]}) for o in d["options"]]

    for name, kind, cid, genre, defn in units:
        try:
            metas = build(defn)
        except TMDBAuthError as e:
            sys.exit(f"{e} — rien n'est modifié.")
        except Exception as e:  # un catalogue en échec ne bloque pas les autres
            failed.append(f"{name}: {e}")
            keep.append((kind, cid, genre))
            continue
        if not metas:   # jamais vide d'habitude : la veille plutôt qu'une rangée qui disparaît
            failed.append(f"{name}: liste vide")
            empty.append(name)
            keep.append((kind, cid, genre))
            continue
        counts[name] = len(metas)
        for meta in metas:
            meta.pop("_tmdb", None)
        paginate(kind, cid, metas, genre)

    if len(failed) > MAX_FAILED * len(units):
        for f in failed[:20]:
            print("  ", f)
        sys.exit(f"{len(failed)} listes sur {len(units)} en échec (plus de {MAX_FAILED:.0%}) : "
                 "TMDB en panne ? Rien n'est modifié.")

    kept = publish_catalog(pages_out, keep)

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
                                      "empty": empty, "failed": failed}, pretty=True)
    print(f"Saison : {label} — {len(counts)} listes, {len(pages_out)} pages, échecs : {len(failed)}"
          + (f" (pages de la veille gardées : {kept})" if failed else ""))
    for f in failed:
        print("  ", f)
    if failed:
        sys.exit(PARTIAL_EXIT)


if __name__ == "__main__":
    main()
