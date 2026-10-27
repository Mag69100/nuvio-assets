"""Sagas rangées en thèmes (scripts/build_sagas.py), sans réseau : python -m unittest discover -s tests/python"""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import build_sagas as bs  # noqa: E402


def coll(id=1, name="Saga - Saga", parts=None, poster="/defaut.jpg"):
    """Collection TMDB ; poster = affiche par défaut du premier film (pas celle du coffret)."""
    return {"id": id, "name": name, "poster_path": "/coffret.jpg",
            "parts": parts if parts is not None else [
                {"id": 2, "vote_count": 5, "release_date": "2005-01-01", "poster_path": "/deuxieme.jpg"},
                {"id": 1, "vote_count": 10, "release_date": "2001-01-01", "poster_path": poster}]}


def imgs(posters=None, backdrops=None):
    return {"posters": posters if posters is not None else [{"iso_639_1": "fr", "file_path": "/fr.jpg"}],
            "backdrops": backdrops if backdrops is not None else []}


class Titres(unittest.TestCase):
    def test_titre_nettoye(self):
        self.assertEqual(bs.clean_title("Harry Potter - Saga"), "Harry Potter")
        self.assertEqual(bs.clean_title("My Hero Academia Collection"), "My Hero Academia")

    def test_titre_impose(self):
        e = bs.saga_entry(coll(id=9485, name="Fast and Furious - Saga"), imgs(), "Fast & Furious")
        self.assertEqual(e["title"], "Fast & Furious")


class Entree(unittest.TestCase):
    def test_votes_des_films_sortis(self):
        parts = [{"vote_count": 100, "release_date": "2001-01-01"},
                 {"vote_count": 50, "release_date": "2999-01-01"},
                 {"vote_count": 7, "release_date": ""}]
        self.assertEqual(bs.saga_entry(coll(parts=parts), imgs(), None)["votes"], 100)

    def test_affiche_fr_puis_neutre_puis_defaut(self):
        fr = [{"iso_639_1": "en", "file_path": "/en.jpg"}, {"iso_639_1": "fr", "file_path": "/fr.jpg"}]
        self.assertEqual(bs.saga_entry(coll(), imgs(fr), None)["poster"], "/fr.jpg")
        neutre = [{"iso_639_1": "en", "file_path": "/en.jpg"}, {"iso_639_1": None, "file_path": "/null.jpg"}]
        self.assertEqual(bs.saga_entry(coll(), imgs(neutre), None)["poster"], "/null.jpg")
        self.assertEqual(bs.saga_entry(coll(), imgs([{"iso_639_1": "en", "file_path": "/en.jpg"}]), None)["poster"], "/defaut.jpg")
        self.assertIsNone(bs.saga_entry(coll(poster=None), imgs([]), None))

    def test_affiches_de_tous_les_films(self):
        parts = [{"id": 2, "vote_count": 5, "release_date": "2005-01-01", "poster_path": "/b.jpg"},
                 {"id": 1, "vote_count": 9, "release_date": "2001-01-01", "poster_path": "/a.jpg"},
                 {"id": 3, "vote_count": 1, "release_date": "2003-01-01", "poster_path": None},
                 {"id": 4, "vote_count": 0, "release_date": "2999-01-01", "poster_path": "/futur.jpg"}]
        self.assertEqual(bs.saga_entry(coll(parts=parts), imgs(), None)["films"], ["/a.jpg", "/b.jpg"])

    def test_premier_film_de_la_saga(self):
        self.assertEqual(bs.first_film(coll())["id"], 1)
        self.assertIsNone(bs.first_film(coll(parts=[{"id": 3, "release_date": ""}])))

    def test_fond_sans_texte(self):
        bd = [{"iso_639_1": "en", "file_path": "/en.jpg"}, {"iso_639_1": None, "file_path": "/nu.jpg"}]
        self.assertEqual(bs.saga_entry(coll(), imgs(backdrops=bd), None)["backdrop"], "/nu.jpg")
        self.assertIsNone(bs.saga_entry(coll(), imgs(backdrops=bd[:1]), None)["backdrop"])


class Liste(unittest.TestCase):
    def test_aucune_saga_en_double(self):
        ids = [i for _slug, _title, sagas in bs.THEMES for i in sagas]
        self.assertEqual(len(ids), len(set(ids)))

    def test_huit_themes(self):
        self.assertEqual([s for s, _t, _l in bs.THEMES],
                         ["action", "super-heros", "sf", "horreur", "animation", "comedie", "francais", "animes"])


ROOT = SCRIPTS.parent
THEMES = json.loads((ROOT / "data" / "sagas.json").read_text(encoding="utf-8"))
RAW = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/main"


class Collection(unittest.TestCase):
    def test_collection_sagas(self):
        c = bs.sagas_collection(THEMES)
        self.assertEqual(c["id"], "sagas")
        self.assertEqual(c["viewMode"], "ROWS")
        self.assertEqual([f["id"] for f in c["folders"]],
                         ["sagas-action", "sagas-super-heros", "sagas-sf", "sagas-horreur", "sagas-animation",
                          "sagas-comedie", "sagas-francais", "sagas-animes"])
        action = c["folders"][0]
        self.assertEqual(action["title"], "Action et aventure")
        # Rangée de l'addon (films dans l'ordre de sortie : TMDB mélange certaines sagas, Nuvio ne sait pas les trier).
        self.assertEqual(action["sources"][0], {"provider": "addon", "addonId": "com.xnzx07.catalogue-fr", "type": "movie",
                                                "catalogId": "saga", "genre": THEMES[0]["sagas"][0]["title"]})
        self.assertEqual(action["coverImageUrl"], f"{RAW}/sagas/action.jpg?v=1")
        self.assertEqual(action["focusGifUrl"], f"{RAW}/gifs/sagas/action.gif?v=1")
        self.assertEqual(action["titleLogoUrl"], f"{RAW}/titles/sagas/action.png?v=1")
        self.assertEqual(action["heroBackdropUrl"], f"{RAW}/sagas/action-fond.jpg?v=1")
        self.assertEqual(action["heroVideoUrl"], f"{RAW}/sagas/action-fond.mp4?v=1")
        self.assertTrue(action["hideTitle"] and action["focusGifEnabled"])
        self.assertEqual(action["tileShape"], "LANDSCAPE")
        names = [s["genre"] for f in c["folders"] for s in f["sources"]]
        self.assertEqual(len(names), len(set(names)))          # le nom désigne la saga : jamais deux fois le même

    def test_ecriture_ne_touche_que_les_sagas(self):
        src = ROOT / "collections" / "collections.json"
        before = json.loads(src.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "collections.json"
            shutil.copy(src, path)
            bs.write_collection(path, THEMES)
            once = path.read_bytes()
            after = json.loads(once)
            self.assertEqual([c["id"] for c in after], [c["id"] for c in before])
            for b, a in zip(before, after):
                if b["id"] != "sagas":
                    self.assertEqual(a, b)
            self.assertEqual(after[[c["id"] for c in after].index("sagas")], bs.sagas_collection(THEMES))
            bs.write_collection(path, THEMES)
            self.assertEqual(path.read_bytes(), once)


class AnciensLiens(unittest.TestCase):
    def test_anciennes_images_des_sagas_gardees(self):
        """Tant que tout le monde n'a pas réimporté, l'ancienne collection (24 sagas) lit encore ces images."""
        catalogs = json.loads((ROOT / "catalogs.json").read_text(encoding="utf-8"))["folders"]
        old = [k for k in catalogs if k.startswith("saga-")]
        self.assertEqual(len(old), 24)
        for slug in old:
            self.assertTrue((ROOT / "gifs" / "sagas" / f"{slug}.gif").exists(), slug)
            self.assertTrue((ROOT / "titles" / "sagas" / f"{slug}.png").exists(), slug)


if __name__ == "__main__":
    unittest.main()
