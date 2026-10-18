# nuvio-assets

Images des tuiles de collections Nuvio, générées automatiquement par GitHub Actions
(`scripts/make_assets.py`) à chaque modification du script ou de `assets.json`.

- `genres/`, `seasons/` : cartes 1280x720 avec le titre écrit sur l'image.
- `gifs/` : animations jouées au survol d'une tuile (reflet lumineux, ou logo qui « respire »).
- `assets.json` : la liste des images à produire (identifiant, titre, image TMDB).

Police : Bebas Neue (licence SIL OFL, voir `fonts/OFL.txt`). Images de films : TMDB.

## Addon « Catalogue FR » (mis à jour chaque nuit)

`scripts/update_addon.py` (workflow « Mettre à jour l'addon ») construit dans `addon/` un addon Stremio statique, lu par Nuvio :
- les catalogues des tuiles, définis dans `catalogs.json` (invisibles sur l'accueil, utilisés par les collections) ;
- les rangées d'accueil : À la une, Tendances du jour · Séries, Au cinéma, En ce moment ;
- la tuile « En ce moment » : saison choisie selon la date (Halloween, Noël, Saint-Valentin, Pâques, été, sinon « À l'affiche »),
  avec ses images `seasons/current*.jpg`, `gifs/seasons/current.gif`, `titles/seasons/current.png`.

Adresse à installer dans Nuvio : `https://raw.githubusercontent.com/xnzx07/nuvio-assets/main/addon/manifest.json`

Nécessite le secret `TMDB_API_KEY`. On peut forcer une saison depuis l'onglet Actions (« Run workflow »).

## Collections Nuvio

`collections/collections.json` : les 5 collections (Plateformes, Fêtes & saisons, Genres, Sagas, Studios).
À importer dans Nuvio via Collections → Importer → URL :
`https://raw.githubusercontent.com/xnzx07/nuvio-assets/main/collections/collections.json`

## Addon en direct (Cloudflare Workers)

`worker/index.js` + `wrangler.toml` : l'addon répond en direct depuis TMDB (pagination sans limite,
contenu toujours à jour). Il lit les mêmes définitions que l'ancien addon statique (`catalogs.json`).
Déployé automatiquement par Cloudflare (Workers Builds) à chaque modification du dépôt.
Secret à définir côté Cloudflare : `TMDB_API_KEY`.
Adresse à installer dans Nuvio : `https://nuvio-assets.xnzxflix.workers.dev/manifest.json`

Film pas encore regardable : la date envoyée à Nuvio (`released`, celle du grand carrousel) est sa date de
sortie numérique (ou une estimation : sortie en salle + 45 jours), et le résumé commence par « 📅 Dispo le… ».
Ce rappel ne s'affiche que si « Infos » est désactivé dans l'enrichissement TMDB de Nuvio.

Recherche : deux catalogues `recherche-films` et `recherche-series` (« Films », « Séries »), titres en français,
du plus connu au moins connu, sans les fiches sans affiche ni vote. La recherche (`worker/search.js`) classe
tous les résultats ensemble (ressemblance du titre français, original ou anglais + notoriété) et comprend les sigles
(« got »), les fautes de frappe (vocabulaire des titres connus `data/search-words.json`, refait chaque nuit par
`scripts/build_search_words.py`), les mots en trop (« film barbie », « the boys saison 4 »), l'année (« dune 2021 »),
les numéros de suite (« harry potter 3 »), les acteurs et réalisateurs (« nolan ») et les studios et plateformes
(« pixar », « netflix »). Avec le secret facultatif `GEMINI_API_KEY`, l'IA (`worker/ai.js`) prend le relais pour les
descriptions (« le film où un mec revit la même journée ») et les requêtes sans résultat proche : Gemini propose des titres,
chacun vérifié dans TMDB, réponse gardée 30 jours en cache. Détail d'une recherche : `/debug/search/<movie|series>/<requête>`. Fiches (`/meta/<type>/<id>.json`) : résumé,
casting, saisons et épisodes en français. TMDB Discover Plus n'est plus nécessaire (`config/recherche-fr-tmdb.json`
reste pour les anciennes installations). Après le résumé : y aura-t-il une suite (film suivant de la saga, série
terminée ou annulée d'après TMDB ; saison suivante commandée ou non d'après l'article Wikipédia anglais, lu par Gemini,
diagnostic `/debug/renewal/<id TMDB>`), scène après le générique, œuvre adaptée, temps pour tout
voir (série ou saga), et avec `GEMINI_API_KEY` « pour qui », « à savoir » et le rappel de l'œuvre précédente (gardés 6 mois).
Épisodes : ⭐ sur les 3 mieux notés de chaque saison, « (remplissage) » sur les anime (animefillerlist.com). Séries en
cours : « 📺 Nouvel épisode jeudi… » en tête du résumé. La recherche IA comprend aussi les répliques (« je suis ton
père ») et les mélanges (« entre Amélie et Fight Club »).

Notes : vraies notes IMDb, d'après les fichiers publics d'IMDb (`data/imdb-ratings.bin`, refait chaque lundi par
`scripts/build_imdb_ratings.py`, workflow « Notes IMDb »), intégrées à l'addon (aucun appel réseau).

## Le site (même Worker, thème « salle de cinéma »)

- `/` : **le hall**, l'entrée du site, où l'on choisit sa salle (`worker/hall.js`).
- `/guide` : **salle 1**, le guide de A à Z pour installer Nuvio et toute la configuration (`worker/guide.js`). `/guide#apercu` ouvre directement l'aperçu de l'accueil final.
- `/configure` (ou `/<config>/configure`) : **salle 2**, la page de personnalisation de l'addon (`worker/page.js`).
- `/lien#u=…` : la page ouverte par les QR codes du guide, pour copier un lien ou le contenu d'un fichier sur le téléphone (`worker/lien.js`).
- `/tv` : adresse courte pour Downloader, télécharge l'APK de Nuvio TV.
- `/trailer/<type>/<id>.json` : bande-annonce YouTube d'un titre, pour l'aperçu.
- La mise en scène commune (rideau, secrets, salles, décors de fête) est dans `worker/stage.js`.
  Le décor de fête suit la rangée « Spécial » ; pour en prévisualiser un : `?saison=noel`, `saint-valentin`, `paques`, `ete` ou `halloween`.
