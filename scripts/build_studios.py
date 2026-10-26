"""Studios : leurs grands classiques (data/studios.json) et la collection « Studios » de collections.json.

- data/studios.json : pour chaque tuile de la collection Studios, les affiches (VF) de ses films les plus vus
  (TMDB, vote_count décroissant). Les 3 premières vont sur la tuile, toutes sur le fond (mur incliné).
  Lu par make_assets.py, qui dessine studios/<slug>.jpg, .gif, -fond.jpg et -fond.mp4 (sans clé TMDB).
- Fixes : on reconnaît un studio à ses classiques, pas besoin de les refaire chaque semaine.

Usage :
  python scripts/build_studios.py               refait data/studios.json (TMDB_API_KEY nécessaire) ;
  python scripts/build_studios.py --collection  la collection « Studios » lit ces images (sans réseau).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_addon import tmdb  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "studios.json"
RAW = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/main"


def studios() -> list[dict]:
    """Tuiles de la collection Studios : identifiant, nom, compagnie(s) TMDB de sa première rangée."""
    cols = json.loads((ROOT / "collections" / "collections.json").read_text(encoding="utf-8"))
    folders = next(c for c in cols if c["id"] == "studios")["folders"]
    return [{"slug": f["id"], "title": f["title"], "company": f["sources"][0]["filters"]["withCompanies"]}
            for f in folders]


def studio_posters(company: str, pages: int = 6) -> list[str]:
    """Affiches des films les plus vus du studio, sans doublon ni film sans affiche."""
    out = []
    for page in range(1, pages + 1):
        for f in tmdb("/discover/movie", with_companies=company, sort_by="vote_count.desc", page=page).get("results") or []:
            if f.get("poster_path") and f["poster_path"] not in out:
                out.append(f["poster_path"])
    return out


def write_collection(path: Path) -> None:
    """Tuiles et fonds des studios lus sur main (studios/) ; rien d'autre ne change."""
    collections = json.loads(path.read_text(encoding="utf-8"))
    for folder in next(c for c in collections if c["id"] == "studios")["folders"]:
        slug = folder["id"]
        folder.update(coverImageUrl=f"{RAW}/studios/{slug}.jpg?v=1", focusGifUrl=f"{RAW}/studios/{slug}.gif?v=1",
                      heroBackdropUrl=f"{RAW}/studios/{slug}-fond.jpg?v=1",
                      heroVideoUrl=f"{RAW}/studios/{slug}-fond.mp4?v=1")
    path.write_text(json.dumps(collections, indent=2), encoding="utf-8", newline="\n")


def main() -> None:
    if "--collection" in sys.argv:
        write_collection(ROOT / "collections" / "collections.json")
        return
    data = [{**s, "posters": studio_posters(s["company"])} for s in studios()]
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(", ".join(f"{s['title']} {len(s['posters'])}" for s in data))


if __name__ == "__main__":
    main()
