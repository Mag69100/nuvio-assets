"""Vocabulaire des titres connus, pour corriger les fautes de frappe de la recherche (worker/search.js).

Mots des titres français, originaux (alphabet latin) et anglais des films et séries les plus connus
sur TMDB (les plus votés, plus les plus populaires du moment). Chaque mot a un poids : la somme de
log10(1 + votes) des titres où il apparaît. « inseption » est corrigé en « inception » parce que
« inception » est un mot proche et très connu du vocabulaire.

Écrit data/search-words.json ({ "mot": poids }). Exécuté chaque nuit par GitHub Actions,
avec le secret TMDB_API_KEY. Sans clé (en local), reconstruit le vocabulaire à partir des
catalogues déjà générés dans addon/ (titres français seulement, poids = nombre de titres).
"""
import json
import math
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "search-words.json"
KEY = os.environ.get("TMDB_API_KEY", "").strip()
TOP_PAGES = 150      # les plus votés : 3 000 films et 3 000 séries
POPULAR_PAGES = 50   # les plus populaires du moment : 1 000 de plus de chaque


def tmdb(path: str, **params) -> dict:
    params = {"api_key": KEY, **params}
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


def words(title: str | None) -> list[str]:
    """Mêmes règles que norm() dans worker/search.js : minuscules, sans accents ni ponctuation."""
    s = unicodedata.normalize("NFD", (title or "").lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).replace("&", " and ")
    return [w for w in re.split(r"[^a-z0-9]+", s) if len(w) >= 3 and not w.isdigit()]


def from_tmdb() -> dict[str, float]:
    jobs = []
    for kind in ("movie", "tv"):
        for lang in ("fr-FR", "en-US"):
            jobs += [(kind, lang, "vote_count.desc", p, 0) for p in range(1, TOP_PAGES + 1)]
            jobs += [(kind, lang, "popularity.desc", p, 20) for p in range(1, POPULAR_PAGES + 1)]

    def fetch(job):
        kind, lang, sort, page, min_votes = job
        d = tmdb(f"/discover/{kind}", language=lang, sort_by=sort, page=page,
                 include_adult="false", **({"vote_count.gte": min_votes} if min_votes else {}))
        return kind, d.get("results") or []

    titles: dict[tuple[str, int], tuple[int, set[str]]] = {}
    with ThreadPoolExecutor(8) as pool:
        for kind, results in pool.map(fetch, jobs):
            for it in results:
                key = (kind, it["id"])
                votes, names = titles.get(key, (0, set()))
                names |= {it.get(k) or "" for k in ("title", "name", "original_title", "original_name")}
                titles[key] = (max(votes, it.get("vote_count") or 0), names)

    weights: dict[str, float] = {}
    for votes, names in titles.values():
        for w in {w for n in names for w in words(n)}:
            weights[w] = weights.get(w, 0) + math.log10(1 + votes)

    # Noms des personnes connues : « dujardin », « tarantino » ne sont pas des fautes.
    with ThreadPoolExecutor(8) as pool:
        people = [p for page in pool.map(lambda p: tmdb("/person/popular", page=p).get("results") or [], range(1, 51))
                  for p in page]
    for p in people:
        for w in set(words(p.get("name"))):
            weights[w] = weights.get(w, 0) + 1
    print(f"{len(titles)} titres, {len(people)} personnes")
    return weights


def from_catalogs() -> dict[str, float]:
    weights: dict[str, float] = {}
    seen: set[str] = set()
    for path in (ROOT / "addon" / "catalog").rglob("*.json"):
        for meta in json.loads(path.read_text(encoding="utf-8")).get("metas", []):
            if meta.get("id") in seen:
                continue
            seen.add(meta.get("id"))
            for w in set(words(meta.get("name"))):
                weights[w] = weights.get(w, 0) + 1
    print(f"{len(seen)} titres (catalogues de addon/)")
    return weights


def main() -> None:
    weights = from_tmdb() if KEY else from_catalogs()
    if len(weights) < 1000:
        raise SystemExit(f"vocabulaire trop petit ({len(weights)} mots), fichier non modifié")
    data = {w: round(v, 1) for w, v in sorted(weights.items(), key=lambda x: -x[1])}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(data)} mots : {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    main()
