"""Lauréats des grands prix (Oscar et César du meilleur film, Palme d'or) : data/recompenses.json.

- Liste depuis Wikidata : le prix reçu par le film (P166) et les lauréats notés sur le prix lui-même (P1346), réunis ;
  pour les Césars, aussi l'œuvre des producteurs récompensés ; film retrouvé sur TMDB par son identifiant IMDb.
- Chaque lauréat est gardé comme une ligne de résultats TMDB en français (titre, affiche, fond…) : le Worker sert
  les rangées « Récompenses » sans appeler TMDB pour chacun (worker/facultatives.js).
- À relancer à la main après chaque cérémonie (une fois par an suffit).

Usage : python scripts/build_recompenses.py   (TMDB_API_KEY nécessaire)
"""
import json
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_addon import tmdb  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "recompenses.json"
# (élément Wikidata, chercher aussi l'œuvre d'une personne récompensée) : les Césars du meilleur film sont notés sur
# les producteurs ; ailleurs, ce détour ajoutait des films primés pour autre chose (« Mask » : prix d'interprétation).
PRIZES = {"oscars": ("Q102427", False), "palmes": ("Q179808", False), "cesars": ("Q645595", True)}
SPARQL = "https://query.wikidata.org/sparql"
KEEP = ("id", "title", "original_title", "original_language", "overview", "poster_path", "backdrop_path",
        "release_date", "vote_average", "vote_count", "popularity", "genre_ids")


def sparql(query: str) -> list[dict]:
    req = urllib.request.Request(f"{SPARQL}?format=json&query={urllib.parse.quote(query)}",
                                 headers={"User-Agent": "nuvio-assets (catalogue de films)"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)["results"]["bindings"]


def winners(rows_received: list[dict], rows_listed: list[dict]) -> list[tuple[str, int]]:
    """(identifiant IMDb, année) des lauréats, sans doublon, les plus récents d'abord ; année inconnue : à la fin."""
    best = {}
    for row in rows_received + rows_listed:
        imdb = row.get("imdb", {}).get("value")
        if not imdb or not imdb.startswith("tt"):    # « nm… » : une personne (producteur), pas un film
            continue
        year = int(row["t"]["value"][:4]) if row.get("t") else 0
        best[imdb] = max(best.get(imdb, 0), year)
    return sorted(best.items(), key=lambda kv: -kv[1])


def prize_rows(q: str, works: bool) -> tuple[list[dict], list[dict]]:
    """Le film récompensé, noté sur le film (P166) ou sur le prix (P1346) ; avec works, aussi l'œuvre (P1686) d'une
    personne récompensée (les Césars vont aux producteurs)."""
    via = lambda a, b: f" UNION {{ {a} }}" if works else ""
    received = sparql(f"""SELECT ?imdb ?t WHERE {{
      {{ ?f p:P166 ?s. ?s ps:P166 wd:{q}. }}{via(f"?x p:P166 ?s. ?s ps:P166 wd:{q}; pq:P1686 ?f.", "")}
      OPTIONAL {{ ?s pq:P585 ?t. }} ?f wdt:P345 ?imdb. }}""")
    listed = sparql(f"""SELECT ?imdb ?t WHERE {{
      {{ wd:{q} p:P1346 ?s. ?s ps:P1346 ?f. }}{via(f"wd:{q} p:P1346 ?s. ?s pq:P1686 ?f.", "")}
      OPTIONAL {{ ?s pq:P585 ?t. }} ?f wdt:P345 ?imdb. }}""")
    return received, listed


def tmdb_row(imdb: str) -> dict | None:
    hits = tmdb(f"/find/{imdb}", external_source="imdb_id").get("movie_results") or []
    return {k: hits[0].get(k) for k in KEEP} if hits else None


def main() -> None:
    out = {}
    for name, (q, works) in PRIZES.items():
        ids = [imdb for imdb, _year in winners(*prize_rows(q, works))]
        with ThreadPoolExecutor(8) as ex:
            rows = [r for r in ex.map(tmdb_row, ids) if r]
        out[name] = rows
        print(f"{name} : {len(rows)} films")
    DATA.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
