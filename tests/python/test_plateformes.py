"""Tuiles des plateformes refaites chaque semaine (scripts/make_platform_tiles.py), sans réseau :
python -m unittest discover -s tests/python
"""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import make_platform_tiles as mp  # noqa: E402
import update_addon as ua  # noqa: E402


def title(id, popularity, poster="/defaut.jpg"):
    return {"id": id, "popularity": popularity, "poster_path": poster}


def no_images(kind, id):
    return []


class Affiches(unittest.TestCase):
    """Film n°1, film n°2, série n°1 (listes déjà classées par TMDB) ; il en manque : le reste complète."""

    def test_deux_films_puis_une_serie(self):
        movies = [title(1, 50, "/m1.jpg"), title(2, 10, "/m2.jpg"), title(3, 5, "/m3.jpg")]
        shows = [title(4, 99, "/s4.jpg"), title(5, 80, "/s5.jpg")]
        self.assertEqual(mp.pick_posters(movies, shows, no_images), ["/m1.jpg", "/m2.jpg", "/s4.jpg"])

    def test_pas_assez_de_films(self):
        shows = [title(4, 40, "/s4.jpg"), title(5, 30, "/s5.jpg")]
        self.assertEqual(mp.pick_posters([title(1, 5, "/m1.jpg")], shows, no_images), ["/m1.jpg", "/s4.jpg", "/s5.jpg"])

    def test_pas_de_serie(self):
        movies = [title(1, 50, "/m1.jpg"), title(2, 10, "/m2.jpg"), title(3, 5, "/m3.jpg")]
        self.assertEqual(mp.pick_posters(movies, [], no_images), ["/m1.jpg", "/m2.jpg", "/m3.jpg"])

    def test_affiche_fr_sans_doublon(self):
        movies = [title(1, 50, "/m1.jpg"), title(1, 50, "/m1.jpg"), title(2, 10, None), title(3, 9, "/m3.jpg")]
        shows = [title(4, 40, "/s4.jpg")]
        images = lambda kind, id: [{"iso_639_1": "en", "file_path": "/en.jpg"},
                                   {"iso_639_1": "fr", "file_path": f"/fr-{kind}-{id}.jpg"}] if id == 4 else []
        self.assertEqual(mp.pick_posters(movies, shows, images), ["/m1.jpg", "/m3.jpg", "/fr-tv-4.jpg"])

    def test_affiche_sans_langue_ensuite(self):
        images = lambda kind, id: [{"iso_639_1": "en", "file_path": "/en.jpg"}, {"iso_639_1": None, "file_path": "/nu.jpg"}]
        self.assertEqual(mp.pick_posters([title(1, 5)], [], images), ["/nu.jpg"])


def fake_render_genre(job, titles, wall, folder):
    for name in (f"{job['slug']}.jpg", f"{job['slug']}.gif", f"{job['slug']}-fond.jpg", f"{job['slug']}-fond.mp4"):
        (folder / name).write_bytes(b"neuve")


class Construction(unittest.TestCase):
    """build() : panne ou trop peu d'affiches → la tuile de la semaine d'avant reste."""

    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(self.dir, ignore_errors=True))
        for job in mp.jobs():
            folder = self.dir / job["family"]
            folder.mkdir(exist_ok=True)
            (folder / f"{job['slug']}.jpg").write_bytes(b"ancienne")
            (folder / f"{job['slug']}.gif").write_bytes(b"ancienne")
        for name, fake in (("render", self.fake_render), ("render_genre", fake_render_genre)):
            p = mock.patch.object(mp, name, side_effect=fake)
            p.start()
            self.addCleanup(p.stop)

    walls = {}

    def fake_render(self, entry, posters, wall, folder):
        self.walls[entry[0]] = wall
        for name in (f"{entry[0]}.jpg", f"{entry[0]}.gif", f"{entry[0]}-fond.jpg", f"{entry[0]}-fond.mp4"):
            (folder / name).write_bytes(b"neuve")

    def tmdb(self, fail_provider=None, exc=ua.TMDBError, posters=5):
        def call(path, **params):
            if fail_provider and params.get("with_watch_providers") == fail_provider:
                raise exc("x")
            if "/images" in path:
                return {"posters": []}
            page = params.get("page", 1)        # le fond lit plusieurs pages : affiches différentes à chaque page
            return {"results": [title(page * 100 + i, 100 - i, f"/p{page}-{i}.jpg") for i in range(posters)] if "movie" in path else []}
        return mock.patch.object(mp, "tmdb", side_effect=call)

    def content(self, slug):
        return (self.dir / "plateformes" / f"{slug}.jpg").read_bytes()

    def test_tout_refait(self):
        with self.tmdb():
            self.assertEqual(mp.build(self.dir), 0)
        self.assertTrue(all(self.content(s) == b"neuve" for s in mp.SLUGS))
        self.assertTrue(all((self.dir / "plateformes" / f"{s}-fond.mp4").read_bytes() == b"neuve" for s in mp.SLUGS))
        self.assertTrue(all(self.walls[s] for s in mp.SLUGS))       # le fond reçoit son mur d'affiches

    def test_panne_garde_les_images_precedentes(self):
        with self.tmdb(fail_provider="8"):
            self.assertEqual(mp.build(self.dir), 3)
        self.assertEqual(self.content("netflix"), b"ancienne")
        self.assertEqual(self.content("prime-video"), b"neuve")

    def test_cle_refusee(self):
        with self.tmdb(fail_provider="119", exc=ua.TMDBAuthError):
            self.assertEqual(mp.build(self.dir), 1)
        self.assertTrue(all(self.content(s) == b"ancienne" for s in mp.SLUGS))

    def test_plateforme_retiree_effacee(self):
        """Une plateforme sortie de assets.json disparaît de la branche."""
        for name in ("ancienne.jpg", "ancienne.gif", "ancienne-fond.jpg", "ancienne-fond.mp4"):
            (self.dir / "plateformes" / name).write_bytes(b"x")
        with self.tmdb():
            self.assertEqual(mp.build(self.dir), 0)
        self.assertFalse(any((self.dir / "plateformes").glob("ancienne*")))

    def test_mur_trop_maigre_garde_l_ancienne(self):
        with self.tmdb(posters=3), mock.patch.object(mp, "wall_posters", return_value=["/a", "/b"]):
            self.assertEqual(mp.build(self.dir), 3)
        self.assertTrue(all(self.content(s) == b"ancienne" for s in mp.SLUGS))

    def test_moins_de_trois_affiches_garde_l_ancienne(self):
        with self.tmdb(posters=2):
            self.assertEqual(mp.build(self.dir), 3)
        self.assertTrue(all(self.content(s) == b"ancienne" for s in mp.SLUGS))


class DuMoment(unittest.TestCase):
    """« Du moment » : films sortis depuis un an, séries avec un épisode depuis deux mois (pas le vieux catalogue)."""

    def test_titres_recents(self):
        calls = {}

        def call(path, **params):
            calls.setdefault(path, params)   # premier appel de chaque adresse (le complément vient après)
            return {"results": []}
        day = __import__("datetime").date(2026, 10, 26)
        with mock.patch.object(mp, "tmdb", side_effect=call), mock.patch.object(mp, "today", return_value=day):
            mp.posters_for("8")
        self.assertEqual(calls["/discover/movie"]["primary_release_date.gte"], "2025-10-26")
        self.assertEqual(calls["/discover/movie"]["with_watch_providers"], "8")
        tv = calls["/discover/tv"]
        self.assertEqual(tv["air_date.gte"], "2026-08-27")
        self.assertEqual(tv["with_networks"], "213")            # séries originales Netflix
        self.assertEqual(tv["without_genres"], "10763|10764|10767")   # ni infos, ni téléréalité, ni talk-show
        self.assertNotIn("with_watch_providers", tv)

    def test_sans_chaine_series_de_la_plateforme(self):
        """Crunchyroll n'a pas de chaîne sur TMDB : séries du moment disponibles sur la plateforme."""
        seen = []

        def call(path, **params):
            seen.append((path, params.get("with_networks"), params.get("with_watch_providers")))
            return {"results": []}
        with mock.patch.object(mp, "tmdb", side_effect=call):
            mp.posters_for("283")
        self.assertIn(("/discover/tv", None, "283"), seen)

    def test_originales_completees_si_trop_peu(self):
        """Un seul film et une seule originale : les séries de la plateforme complètent."""
        def call(path, **params):
            if "/images" in path:
                return {"posters": []}
            if path == "/discover/tv" and params.get("with_watch_providers"):
                return {"results": [{"id": 9, "popularity": 1, "poster_path": "/catalogue.jpg"}]}
            if path == "/discover/tv":
                return {"results": [{"id": 1, "popularity": 5, "poster_path": "/originale.jpg"}]}
            return {"results": [{"id": 2, "popularity": 3, "poster_path": "/film.jpg"}]}
        with mock.patch.object(mp, "tmdb", side_effect=call):
            self.assertEqual(mp.posters_for("8"), ["/film.jpg", "/originale.jpg", "/catalogue.jpg"])


class Mur(unittest.TestCase):
    """Fond : les nouveautés de l'année d'abord (films sortis, séries lancées), puis les titres populaires pour
    compléter ; films et séries en alternance, sans doublon ni titre sans affiche."""

    @staticmethod
    def call(path, **params):
        recent = "primary_release_date.gte" in params or "first_air_date.gte" in params
        page, kind = params["page"], ("n" if recent else "p") + ("m" if path == "/discover/movie" else "s")
        res = [title(page * 10 + i, 1, f"/{kind}{page}-{i}.jpg") for i in range(2)] + [title(99, 1, None)]
        if not recent and path == "/discover/tv":
            res.append(title(7, 1, "/nm1-0.jpg"))   # déjà parmi les nouveautés
        return {"results": res}

    def test_nouveautes_puis_populaires(self):
        day = __import__("datetime").date(2026, 10, 26)
        with mock.patch.object(mp, "tmdb", side_effect=self.call) as t, mock.patch.object(mp, "today", return_value=day):
            got = mp.wall_posters("8")
        self.assertEqual(got[:4], ["/nm1-0.jpg", "/ns1-0.jpg", "/nm1-1.jpg", "/ns1-1.jpg"])
        self.assertEqual(len(got), len(set(got)))
        self.assertEqual(len(got), 24)                       # 12 nouveautés puis 12 populaires
        self.assertTrue(all(p.startswith("/n") for p in got[:12]))
        dates = [c.kwargs for c in t.call_args_list if "primary_release_date.gte" in c.kwargs or "first_air_date.gte" in c.kwargs]
        self.assertTrue(any(k.get("primary_release_date.gte") == "2025-10-26" for k in dates))
        self.assertTrue(any(k.get("first_air_date.gte") == "2025-10-26" for k in dates))


class Collection(unittest.TestCase):
    def test_collection_plateformes_sur_la_branche(self):
        import json
        import shutil
        src = SCRIPTS.parent / "collections" / "collections.json"
        before = json.loads(src.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "collections.json"
            shutil.copy(src, path)
            mp.point_platforms(path)
            once = path.read_bytes()
            after = json.loads(once)
            mp.point_platforms(path)
            self.assertEqual(path.read_bytes(), once)
        root = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/tuiles-vivantes"
        family = {"plateformes-streaming": "plateformes", "genres": "genres", "envies": "genres"}
        for b, a in zip(before, after):
            if a["id"] not in family:
                self.assertEqual(a, b)
                continue
            branch = f"{root}/{family[a['id']]}"
            for fb, fa in zip(b["folders"], a["folders"]):
                slug = fa["id"]
                self.assertEqual(fa["coverImageUrl"], f"{branch}/{slug}.jpg")
                self.assertEqual(fa["focusGifUrl"], f"{branch}/{slug}.gif")
                self.assertEqual(fa["heroBackdropUrl"], f"{branch}/{slug}-fond.jpg")
                self.assertEqual(fa["heroVideoUrl"], f"{branch}/{slug}-fond.mp4")
                self.assertEqual(fa["titleLogoUrl"], fb["titleLogoUrl"])
                self.assertEqual(fa["sources"], fb["sources"])


class SansTrou(unittest.TestCase):
    """Jamais de tuile trouée : une plateforme sans images de la semaine d'avant bloque la publication (code 2),
    et une panne qui n'est pas TMDB (affiche introuvable, gifski) ne touche que sa plateforme."""

    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(self.dir, ignore_errors=True))
        tmdb = mock.patch.object(mp, "tmdb", side_effect=lambda path, **p: {"posters": []} if "/images" in path
                                 else {"results": [title(p.get("page", 1) * 100 + i, 9 - i, f"/{path[10]}{p.get('page', 1)}-{i}.jpg")
                                                   for i in range(3)]})
        tmdb.start()
        self.addCleanup(tmdb.stop)
        genre = mock.patch.object(mp, "render_genre", side_effect=fake_render_genre)
        genre.start()
        self.addCleanup(genre.stop)
        for job in mp.jobs():
            if job["family"] == "genres":
                (self.dir / "genres").mkdir(exist_ok=True)
                (self.dir / "genres" / f"{job['slug']}.jpg").write_bytes(b"ancienne")

    def previous(self, slugs):
        folder = self.dir / "plateformes"
        folder.mkdir(exist_ok=True)
        for slug in slugs:
            for name in (f"{slug}.jpg", f"{slug}.gif", f"{slug}-fond.jpg", f"{slug}-fond.mp4"):
                (folder / name).write_bytes(b"ancienne")

    def test_premiere_fois_sans_images_signale(self):
        self.previous(mp.SLUGS[1:])                 # netflix n'a encore rien
        with mock.patch.object(mp, "posters_for", side_effect=lambda p: [] if p == "8" else ["/a", "/b", "/c"]),                 mock.patch.object(mp, "render", side_effect=Construction.fake_render.__get__(Construction())):
            self.assertEqual(mp.build(self.dir), 2)
        # Le reste est publié quand même : une seule tuile grise plutôt que toutes les nouvelles.
        self.assertEqual((self.dir / "plateformes" / "prime-video.jpg").read_bytes(), b"neuve")

    def test_panne_de_rendu_ne_touche_que_sa_plateforme(self):
        self.previous(mp.SLUGS)

        def render(entry, posters, wall, folder):
            if entry[0] == "netflix":
                (folder / "netflix.jpg").write_bytes(b"neuve")    # à moitié fait avant la panne
                raise RuntimeError("gifski a échoué")
            for name in (f"{entry[0]}.jpg", f"{entry[0]}.gif", f"{entry[0]}-fond.jpg", f"{entry[0]}-fond.mp4"):
                (folder / name).write_bytes(b"neuve")
        with mock.patch.object(mp, "render", side_effect=render):
            self.assertEqual(mp.build(self.dir), 3)
        folder = self.dir / "plateformes"
        self.assertEqual((folder / "netflix.jpg").read_bytes(), b"ancienne")   # jeu complet de la semaine d'avant
        self.assertEqual((folder / "prime-video.gif").read_bytes(), b"neuve")


class Usage(unittest.TestCase):
    def test_sans_argument_affiche_l_usage(self):
        import contextlib
        import io
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertEqual(mp.main([]), 2)
        self.assertIn("Usage", err.getvalue())


class Genres(unittest.TestCase):
    """Genres et « J'ai envie de… » : affiches du moment, d'après les rangées « populaires » de chaque tuile."""

    def test_filtres_de_la_rangee(self):
        src = {"mediaType": "TV", "sortBy": "popularity.desc",
               "filters": {"withGenres": "10759", "voteCountGte": 300, "withOriginalLanguage": "ja",
                           "withoutGenres": "10763", "voteAverageGte": 7.0, "withCompanies": "3"}}
        self.assertEqual(mp.source_params(src), ("tv", {"with_genres": "10759", "vote_count.gte": 300,
                                                        "with_original_language": "ja", "without_genres": "10763",
                                                        "vote_average.gte": 7.0, "with_companies": "3"}))
        self.assertEqual(mp.source_params({"mediaType": "MOVIE", "filters": {}})[0], "movie")

    def test_affiches_d_une_tuile(self):
        folder = {"sources": [
            {"mediaType": "MOVIE", "sortBy": "popularity.desc", "filters": {"withGenres": "28"}},
            {"mediaType": "TV", "sortBy": "popularity.desc", "filters": {"withGenres": "10759", "voteCountGte": 300}},
            {"mediaType": "MOVIE", "sortBy": "vote_average.desc", "filters": {"withGenres": "28"}}]}
        calls = []

        def call(path, **params):
            calls.append((path, params))
            k = "m" if path == "/discover/movie" else "s"
            return {"results": [{"id": i, "popularity": 1, "poster_path": f"/{k}{i}.jpg", "backdrop_path": f"/b{k}{i}.jpg"}
                                for i in range(3)] + [{"id": 9, "poster_path": None}]}
        with mock.patch.object(mp, "tmdb", side_effect=call):
            got = mp.folder_titles(folder)
        self.assertEqual([t["poster"] for t in got], ["/m0.jpg", "/s0.jpg", "/m1.jpg", "/s1.jpg", "/m2.jpg", "/s2.jpg"])
        self.assertEqual(got[0]["backdrop"], "/bm0.jpg")
        self.assertEqual(len(calls), 2)                                  # seulement les rangées « populaires »
        self.assertEqual(calls[0][1]["vote_count.gte"], 50)              # plancher : pas de titres inconnus
        self.assertEqual(calls[1][1]["vote_count.gte"], 300)             # filtre de la rangée gardé s'il est plus fort

    def test_sans_dessins_animes_hors_animation(self):
        """Doraemon dans « Action » : hors animation, ni animation ni séries pour enfants."""
        seen = []

        def call(path, **params):
            seen.append(params)
            return {"results": []}
        action = {"sources": [{"mediaType": "TV", "sortBy": "popularity.desc", "filters": {"withGenres": "10759"}}]}
        anime = {"sources": [{"mediaType": "TV", "sortBy": "popularity.desc", "filters": {"withGenres": "16", "withOriginalLanguage": "ja"}}]}
        with mock.patch.object(mp, "tmdb", side_effect=call):
            mp.folder_titles(action)
            mp.folder_titles(anime)
        self.assertEqual(seen[0]["without_genres"], "16|10762")
        self.assertNotIn("without_genres", seen[1])

    def test_tuiles_de_genres_et_d_envies(self):
        jobs = [j for j in mp.jobs() if j["family"] == "genres"]
        ids = [j["slug"] for j in jobs]
        self.assertIn("genre-action", ids)
        self.assertIn("envie-rire", ids)
        self.assertEqual(len(ids), 15 + 8)
        rire = next(j for j in jobs if j["slug"] == "envie-rire")
        self.assertEqual(rire["kicker"], "J'AI ENVIE DE")
        self.assertEqual(next(j for j in jobs if j["slug"] == "genre-action")["kicker"], "")


if __name__ == "__main__":
    unittest.main()
