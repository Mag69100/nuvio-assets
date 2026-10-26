"""Studios (scripts/build_studios.py), sans réseau : python -m unittest discover -s tests/python"""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import build_studios as bs  # noqa: E402

ROOT = SCRIPTS.parent
RAW = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/main"


def film(id, poster):
    return {"id": id, "poster_path": poster}


class Donnees(unittest.TestCase):
    def test_studios_de_la_collection(self):
        got = {s["slug"]: s["company"] for s in bs.studios()}
        self.assertEqual(got["studio-3"], "3")
        self.assertEqual(got["dc-comics"], "429|128064")
        self.assertEqual(len(got), 12)

    def test_classiques_sans_doublon(self):
        """Les films les plus vus du studio, page après page, sans doublon ni film sans affiche."""
        pages = {1: [film(1, "/a"), film(2, None), film(3, "/b")], 2: [film(3, "/b"), film(4, "/c")]}
        calls = []

        def call(path, **params):
            calls.append(params)
            return {"results": pages.get(params["page"], [])}
        with mock.patch.object(bs, "tmdb", side_effect=call):
            self.assertEqual(bs.studio_posters("3", pages=3), ["/a", "/b", "/c"])
        self.assertTrue(all(c["sort_by"] == "vote_count.desc" and c["with_companies"] == "3" for c in calls))

    def test_couleurs_de_chaque_studio(self):
        colors = json.loads((ROOT / "assets.json").read_text(encoding="utf-8"))["studio_tiles"]
        self.assertEqual(set(colors), {s["slug"] for s in bs.studios()})
        self.assertTrue(all(len(v) == 2 and all(len(c) == 3 for c in v) for v in colors.values()))


class Collection(unittest.TestCase):
    def test_collection_studios(self):
        src = ROOT / "collections" / "collections.json"
        before = json.loads(src.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "collections.json"
            shutil.copy(src, path)
            bs.write_collection(path)
            once = path.read_bytes()
            after = json.loads(once)
            bs.write_collection(path)
            self.assertEqual(path.read_bytes(), once)
        for b, a in zip(before, after):
            if a["id"] != "studios":
                self.assertEqual(a, b)
                continue
            for fb, fa in zip(b["folders"], a["folders"]):
                slug = fa["id"]
                self.assertEqual(fa["coverImageUrl"], f"{RAW}/studios/{slug}.jpg?v=1")
                self.assertEqual(fa["focusGifUrl"], f"{RAW}/studios/{slug}.gif?v=1")
                self.assertEqual(fa["heroBackdropUrl"], f"{RAW}/studios/{slug}-fond.jpg?v=1")
                self.assertEqual(fa["heroVideoUrl"], f"{RAW}/studios/{slug}-fond.mp4?v=1")
                self.assertEqual(fa["sources"], fb["sources"])
                self.assertEqual(fa["titleLogoUrl"], fb["titleLogoUrl"])


if __name__ == "__main__":
    unittest.main()
