"""Tests de scripts/build_fenetres_vod.py (fenêtres salle → numérique des distributeurs), sans réseau."""
import datetime as dt
import io
import json
import shutil
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS))

import build_fenetres_vod as fv  # noqa: E402

UNIVERSAL, SONY, COLUMBIA, VERTICAL, NETFLIX = "Q168383", "Q40266137", "Q186941", "Q18395323", "Q907311"


def decl(dist, qualif=(), formats=(), pays=("Q30",), plateforme=False):
    return {"dist": dist, "qualif_pays": set(qualif), "formats": set(formats), "pays": set(pays), "plateforme": plateforme}


class Reponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def http_error(code):
    return urllib.error.HTTPError("https://example.org", code, "x", {}, io.BytesIO(b""))


class Fenetre(unittest.TestCase):
    def test_dates_americaines_sans_avant_premiere(self):
        # The Weight : Sundance (type 1) en janvier, salle le 18 sept., numérique le 20 oct.
        rd = [{"iso_3166_1": "US", "release_dates": [
            {"type": 1, "release_date": "2026-01-26T00:00:00.000Z"},
            {"type": 3, "release_date": "2026-09-18T00:00:00.000Z"},
            {"type": 4, "release_date": "2026-10-20T00:00:00.000Z"}]},
            {"iso_3166_1": "FR", "release_dates": [{"type": 3, "release_date": "2026-08-01T00:00:00.000Z"}]}]
        self.assertEqual(fv.dates_us(rd), ("2026-09-18", "2026-10-20"))
        self.assertEqual(fv.fenetre(*fv.dates_us(rd)), 32)

    def test_premiere_salle_et_premier_numerique(self):
        rd = [{"iso_3166_1": "US", "release_dates": [
            {"type": 2, "release_date": "2026-03-10T00:00:00.000Z"}, {"type": 3, "release_date": "2026-03-01T00:00:00.000Z"},
            {"type": 4, "release_date": "2026-05-01T00:00:00.000Z"}, {"type": 4, "release_date": "2026-04-01T00:00:00.000Z"}]}]
        self.assertEqual(fv.dates_us(rd), ("2026-03-01", "2026-04-01"))
        self.assertEqual(fv.dates_us([]), (None, None))

    def test_valeurs_aberrantes_ecartees(self):
        self.assertIsNone(fv.fenetre("2026-03-01", "2026-02-01"))      # numérique avant la salle
        self.assertIsNone(fv.fenetre("2025-01-01", "2025-08-01"))      # plus de 200 jours : ressortie
        self.assertIsNone(fv.fenetre("2026-03-01", "2026-03-01"))      # sortie simultanée, date connue d'avance
        self.assertIsNone(fv.fenetre("2026-03-01", None))
        self.assertEqual(fv.fenetre("2026-03-01", "2026-03-18"), 17)
        self.assertEqual(fv.fenetre("2026-03-01", "2026-09-17"), 200)

    def test_mediane_arrondie(self):
        self.assertEqual(fv.mediane([17, 31]), 24)
        self.assertEqual(fv.mediane([17, 18]), 18)       # 17,5 → 18
        self.assertEqual(fv.mediane([45, 10, 32]), 32)


class Distributeur(unittest.TestCase):
    def test_declaration_pour_les_etats_unis_d_abord(self):
        # Michael : Lionsgate (américain, sans qualificatif) et Universal (qualifié États-Unis).
        choix = fv.choisir_distributeur([decl("Q17076072"), decl(UNIVERSAL, qualif=["Q30"])])
        self.assertEqual(choix, UNIVERSAL)

    def test_distributeur_etranger_ecarte(self):
        self.assertIsNone(fv.choisir_distributeur([decl("Q1097348", qualif=["Q28"], pays=["Q28"])]))
        self.assertIsNone(fv.choisir_distributeur([decl("Q1544011", pays=["Q142"])]))

    def test_plateformes_et_video_ecartees(self):
        self.assertIsNone(fv.choisir_distributeur([decl(NETFLIX)]))
        self.assertIsNone(fv.choisir_distributeur([decl("Q99999999", plateforme=True)]))
        self.assertIsNone(fv.choisir_distributeur([decl(UNIVERSAL, formats=["Q723685"])]))
        self.assertEqual(fv.choisir_distributeur([decl(UNIVERSAL, formats=[fv.EN_SALLE])]), UNIVERSAL)

    def test_marques_regroupees(self):
        self.assertEqual(fv.choisir_distributeur([decl(COLUMBIA)]), SONY)

    def test_sans_pays_connu_en_dernier(self):
        self.assertEqual(fv.choisir_distributeur([decl("Q7339672", pays=())]), "Q7339672")
        self.assertEqual(fv.choisir_distributeur([decl("Q7339672", pays=()), decl(VERTICAL)]), VERTICAL)

    def test_a_egalite_un_distributeur_connu(self):
        self.assertEqual(fv.choisir_distributeur([decl("Q5"), decl(VERTICAL)]), VERTICAL)
        self.assertEqual(fv.choisir_distributeur([decl("Q900"), decl("Q50")]), "Q50")

    def test_societe_de_production_tmdb_en_secours(self):
        self.assertEqual(fv.distributeur_tmdb([{"id": 1}, {"id": 41077}]), "Q16248298")   # A24
        self.assertIsNone(fv.distributeur_tmdb([{"id": 1}]))

    def test_lecture_de_la_reponse_wikidata(self):
        u = lambda q: {"value": f"http://www.wikidata.org/entity/{q}"}  # noqa: E731
        lignes = [
            {"imdb": {"value": "tt1"}, "st": {"value": "s1"}, "dist": u(UNIVERSAL), "pays": u("Q30"), "nom": {"value": "Universal Pictures"}},
            {"imdb": {"value": "tt1"}, "st": {"value": "s2"}, "dist": u("Q1097348"), "qpays": u("Q28"), "pays": u("Q28")},
            {"imdb": {"value": "tt2"}, "st": {"value": "s3"}, "dist": u(NETFLIX), "nature": u("Q59152282")},
        ]
        films, noms = fv.declarations_wikidata(lignes)
        self.assertEqual(noms[UNIVERSAL], "Universal Pictures")
        self.assertEqual(fv.choisir_distributeur(films["tt1"]), UNIVERSAL)
        self.assertIsNone(fv.choisir_distributeur(films["tt2"]))


class Fenetres(unittest.TestCase):
    def test_mesure_ou_defaut(self):
        f = fv.calculer_fenetres({UNIVERSAL: [17, 18, 31, 20], VERTICAL: [30, 34], "Q5": [10, 11, 12, 13], "Q6": [40]},
                                 {"Q5": "Petit Distributeur"})
        self.assertEqual(f[UNIVERSAL], {"nom": "Universal", "jours": 19, "films": 4, "source": "mesure"})
        # Vertical : 2 films mesurés seulement, sa fenêtre par défaut.
        self.assertEqual(f[VERTICAL], {"nom": "Vertical", "jours": 30, "films": 2, "source": "defaut"})
        self.assertEqual(f["Q5"]["nom"], "Petit Distributeur")
        self.assertNotIn("Q6", f)                 # 1 film, pas de valeur par défaut : la médiane générale
        self.assertEqual(f["Q1323594"]["source"], "defaut")   # Disney, rien mesuré

    def test_fenetres_plus_longues(self):
        self.assertEqual(fv.plus_longues([10] * 18 + [100, 120, 150], 90), 120)
        self.assertIsNone(fv.plus_longues([10] * 40 + [100, 120, 150], 90))      # moins d'un film sur dix
        self.assertIsNone(fv.plus_longues([10, 100, 120], 90))                    # moins de 3 films
        self.assertEqual(fv.plus_longues([10, 20, 30], -5), 20)                   # pas encore en salle : toutes

    def test_estimation(self):
        mesures = {SONY: [20, 30, 32, 40, 45, 60]}
        toutes = [10, 20, 30, 32, 40, 45, 60]
        f = fv.calculer_fenetres(mesures, {})
        jour = dt.date(2026, 10, 22)
        # Pas encore en salle, ou depuis peu : la médiane du distributeur (36 jours).
        self.assertEqual(fv.estimer("2026-11-06", SONY, f, mesures, toutes, jour), {"date": "2026-12-12", "distributeur": SONY, "jours": 36})
        self.assertEqual(fv.estimer("2026-10-12", SONY, f, mesures, toutes, jour)["jours"], 36)
        # Resident Evil : 34 jours en salle sans date, la fenêtre est plus longue que 34 jours (40, 45, 60 : 45).
        self.assertEqual(fv.estimer("2026-09-18", SONY, f, mesures, toutes, jour), {"date": "2026-11-02", "distributeur": SONY, "jours": 45})
        # Plus longtemps que presque toutes les fenêtres connues : pas d'estimation.
        self.assertIsNone(fv.estimer("2026-08-01", SONY, f, mesures, toutes, jour))
        # Fenêtre par défaut (Vertical, 30 jours) tant qu'elle tient, puis les fenêtres plus longues de tous les films.
        self.assertEqual(fv.estimer("2026-10-12", VERTICAL, f, mesures, toutes, jour)["jours"], 30)
        self.assertEqual(fv.estimer("2026-09-20", VERTICAL, f, mesures, toutes, jour), {"date": "2026-11-04", "distributeur": VERTICAL, "jours": 45})
        # Sans distributeur connu (ou sans fenêtre) : rien avant la salle (l'addon prend la médiane générale, 32 jours) ;
        # ensuite, les fenêtres plus longues que le temps passé en salle, de tous les films.
        self.assertIsNone(fv.estimer("2026-10-30", None, f, mesures, toutes, jour))
        self.assertIsNone(fv.estimer("2026-10-30", "Q6", f, mesures, toutes, jour))
        self.assertEqual(fv.estimer("2026-10-12", None, f, mesures, toutes, jour), {"date": "2026-11-17", "jours": 36})
        self.assertEqual(fv.estimer("2026-09-18", "Q6", f, mesures, toutes, jour), {"date": "2026-11-02", "jours": 45})


class GardeFous(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        for p in (mock.patch.object(fv, "OUT", self.tmp / "estimations-vod.json"), mock.patch.object(fv, "KEY", "k"),
                  mock.patch.object(fv, "TODAY", dt.date(2026, 10, 22)), mock.patch.object(fv.time, "sleep")):
            p.start()
            self.addCleanup(p.stop)

    def nouveau(self, mesures=500, films=20):
        return {"mesures": mesures, "films": {f"tt{i}": {} for i in range(films)},
                "fenetres": {UNIVERSAL: {"source": "mesure"}}}

    def test_verifier(self):
        fv.verifier(self.nouveau(), None)
        fv.verifier(self.nouveau(400), {"mesures": 500})
        for n, ancien in ((self.nouveau(100), None), (self.nouveau(200), {"mesures": 500}), (self.nouveau(films=3), None)):
            with self.assertRaises(fv.SourceError):
                fv.verifier(n, ancien)
        with self.assertRaises(fv.SourceError):
            fv.verifier({**self.nouveau(), "fenetres": {VERTICAL: {"source": "defaut"}}}, None)

    def test_panne_ne_touche_pas_au_fichier(self):
        fv.OUT.write_text('{"ancien": 1}', encoding="utf-8")
        with mock.patch.object(fv, "decouvrir", side_effect=fv.SourceError("panne")):
            with self.assertRaises(fv.SourceError):
                fv.main()
        self.assertEqual(fv.OUT.read_text(encoding="utf-8"), '{"ancien": 1}')

    def test_lectures_tmdb(self):
        with mock.patch.object(fv.urllib.request, "urlopen", side_effect=[http_error(503), Reponse(b'{"a": 1}')]):
            self.assertEqual(fv.tmdb("/x"), {"a": 1})
        with mock.patch.object(fv.urllib.request, "urlopen", side_effect=http_error(404)):
            self.assertEqual(fv.tmdb("/movie/1"), {})
        with mock.patch.object(fv.urllib.request, "urlopen", side_effect=http_error(401)) as op:
            with self.assertRaises(fv.SourceError):
                fv.tmdb("/x")
        self.assertEqual(op.call_count, 1)
        with mock.patch.object(fv.urllib.request, "urlopen", side_effect=urllib.error.URLError("hors ligne")) as op:
            with self.assertRaises(fv.SourceError):
                fv.tmdb("/x")
        self.assertEqual(op.call_count, 5)

    def test_nuit_complete(self):
        """Apprentissage, distributeurs et estimations, réseau simulé : le fichier écrit."""
        def film(i, salle, numerique, langue="en", societes=()):
            return {"id": i, "imdb": f"tt{i}", "titre": str(i), "langue": langue, "salle": salle, "numerique": numerique,
                    "societes": [{"id": s} for s in societes]}
        appris = [film(i, "2026-01-10", "2026-02-11") for i in range(1, 161)]          # 32 jours
        appris += [film(i, "2026-02-01", "2026-02-19") for i in range(161, 201)]       # Universal : 18 jours
        appris += [film(500, "2026-09-01", "2026-09-20")]                              # trop récent : pas appris
        estimes = [film(1000 + i, "2026-10-02", None) for i in range(12)]              # Warner (Digger…)
        estimes += [film(2000, "2026-10-02", None, societes=[88606])]                  # Vertical, d'après TMDB
        estimes += [film(2001, "2026-10-02", None)]                                    # inconnu : pas écrit
        estimes += [film(2002, "2026-10-02", None, langue="fr")]                       # en français : pas estimé
        estimes += [film(2003, "2026-10-02", "2026-10-20")]                            # date connue : pas estimé
        wd = {f"tt{i}": UNIVERSAL for i in range(161, 201)} | {f"tt{1000 + i}": "Q8016302" for i in range(12)}

        def decouvrir(debut, fin, votes, pages=500):
            return [{"id": f["id"], "original_language": f["langue"]} for f in (estimes if votes == 0 else appris)]
        with mock.patch.object(fv, "decouvrir", side_effect=decouvrir), \
                mock.patch.object(fv, "lire_tous", side_effect=lambda ids: [f for f in appris + estimes if f["id"] in ids]), \
                mock.patch.object(fv, "distributeurs_wikidata", return_value=(wd, {})), mock.patch("builtins.print"):
            fv.main()
        d = json.loads(fv.OUT.read_text(encoding="utf-8"))
        self.assertEqual(d["maj"], "2026-10-22")
        self.assertEqual(d["mesures"], 200)
        self.assertEqual(d["mediane"], 32)
        self.assertEqual(d["fenetres"][UNIVERSAL], {"nom": "Universal", "jours": 18, "films": 40, "source": "mesure"})
        self.assertEqual(d["films"]["tt1000"], {"date": "2026-11-16", "distributeur": "Q8016302", "jours": 45})
        self.assertEqual(d["films"]["tt2000"], {"date": "2026-11-01", "distributeur": VERTICAL, "jours": 30})
        for absent in ("tt2001", "tt2002", "tt2003"):
            self.assertNotIn(absent, d["films"])


if __name__ == "__main__":
    unittest.main()
