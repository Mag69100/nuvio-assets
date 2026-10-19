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
(« pixar », « netflix »). Avec une clé Gemini (voir « Clé Gemini » plus bas), l'IA (`worker/ai.js`) prend le relais pour les
descriptions (« le film où un mec revit la même journée ») et les requêtes sans résultat proche : Gemini propose des titres,
chacun vérifié dans TMDB, réponse gardée 30 jours en cache. Détail d'une recherche : `/debug/search/<movie|series>/<requête>`. Fiches (`/meta/<type>/<id>.json`) : résumé,
casting, saisons et épisodes en français. TMDB Discover Plus n'est plus nécessaire (`config/recherche-fr-tmdb.json`
reste pour les anciennes installations). Après le résumé : y aura-t-il une suite (film suivant de la saga, série
terminée ou annulée d'après TMDB ; saison suivante commandée ou non d'après l'article Wikipédia anglais, lu par Gemini,
diagnostic `/debug/renewal/<id TMDB>`), scène après le générique, œuvre adaptée, temps pour tout
voir (série ou saga), et avec une clé Gemini « pour qui », « à savoir » et le rappel de l'œuvre précédente (gardés 6 mois).

Clé Gemini : chaque utilisateur colle la sienne (gratuite, Google AI Studio) dans la salle 2 ; elle est rangée dans son
lien d'installation et l'IA tourne avec son quota. Le secret `GEMINI_API_KEY` de l'instance ne sert qu'aux pages
`/debug`, et à tous les liens sans clé seulement si la variable `GEMINI_PUBLIC` vaut `on`. Sans clé, l'addon relit
les réponses de l'IA déjà en cache (écrites pour un autre utilisateur) sans jamais appeler Gemini.

Diagnostics `/debug/…` : réservés à l'hébergeur, à ouvrir depuis son propre lien d'addon, celui qui contient la clé
Gemini de l'instance (`/<config>/debug/search/movie/dune`) ; sinon, refus (ils dépensent la clé de l'instance).

Tests : `node --import ./tests/support/register.mjs --test "tests/*.test.js"` (Node 22 ou plus, aucun paquet à
installer ; `tests/support` fait charger à Node le fichier des notes IMDb et les JSON comme le fait Cloudflare).
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

## Héberger ta propre copie

Le lien principal est partagé par tout le monde : ses quotas gratuits peuvent saturer. Ta propre copie tourne avec tes
clés et ton quota (ou ton serveur), et c'est le même code. Elle lit toujours les images, catalogues et données
communes sur ce dépôt GitHub, donc elle profite des mises à jour de données de chaque nuit.

Ce qu'il te faut : une clé TMDB (gratuite, themoviedb.org → Paramètres → API, clé v3) et un mot de passe
d'hébergeur de ton choix (`ADMIN_PASSWORD`). Facultatif : une clé Gemini (aistudio.google.com/apikey).

### Sur Cloudflare (gratuit, sans serveur)

1. Sur GitHub, **Fork** de ce dépôt.
2. Sur dash.cloudflare.com : Workers & Pages → Créer → Importer un dépôt → choisis ton fork, laisse les réglages.
3. Dans ton Worker → Paramètres → Variables et secrets : ajoute les secrets `TMDB_API_KEY` et `ADMIN_PASSWORD`
   (et `GEMINI_API_KEY` si tu veux). Facultatif : la variable `DEPOT` = `ton-pseudo/nuvio-assets`, pour que le
   bouton « Mettre à jour » t'emmène sur ton fork. `GEMINI_PUBLIC` = `on` partage ta clé Gemini avec tous les
   liens de ta copie. Ces variables restent à chaque mise à jour (`keep_vars` dans `wrangler.toml`).
4. Ton site est sur `https://nuvio-assets.<ton-sous-domaine>.workers.dev`, ton addon sur `…/manifest.json`.

### Avec Docker (serveur, NAS, Raspberry Pi 64 bits)

1. Copie `docker-compose.yml` de ce dépôt, mets ta clé TMDB et ton mot de passe dedans.
2. `docker compose up -d`
3. Le site : `http://<adresse-du-serveur>:8787`, l'addon : `http://<adresse-du-serveur>:8787/manifest.json`
   (Nuvio TV accepte le http sur le réseau de la maison).
4. De l'extérieur (téléphone en 4G…) : le plus simple est Cloudflare Tunnel (gratuit, https, aucun port à ouvrir
   sur la box) vers `http://localhost:8787`. Un reverse proxy que tu as déjà marche aussi (nginx :
   `proxy_set_header Host $host;`). Dans les deux cas, mets ton adresse dans `ADRESSE_PUBLIQUE`
   (`https://catalogue.ton-domaine.fr`) : sans elle, les liens du site et de l'addon resteraient en `http://`.

Le conteneur fait tourner le Worker avec `wrangler dev` (le runtime workerd de Cloudflare) ; le cache et tes choix
sont gardés dans `./donnees`. Les clés passent en arguments du Worker : visibles par qui a accès au serveur, comme
partout sur une machine à soi. L'image est construite par le workflow « Image Docker » à chaque changement de
l'addon : `ghcr.io/xnzx07/nuvio-assets:latest` et `:<version>` (pour le propriétaire du dépôt, une seule fois après la première image :
GitHub → Packages → nuvio-assets → Package settings → Change visibility → Public, sinon personne ne peut la
télécharger).

### Mises à jour : c'est toi qui décides

Ta copie compare sa version à celle de ce dépôt (lue sur GitHub) et ne te propose que les vrais paliers (5.23 → 5.24),
jamais chaque correction. Rien ne change sans ton accord.

- **Sur le site** : salle 2 → Espace hébergeur, connecte-toi avec ton mot de passe. Tu y vois la nouvelle version,
  ses nouveautés, et deux boutons : « Mettre à jour » (Cloudflare : « Sync fork » sur ton fork, puis Cloudflare
  redéploie seul ; Docker : `docker compose pull && docker compose up -d`) et « Plus tard » (plus rien jusqu'au
  palier suivant). Le hall affiche aussi un bandeau quand tu es connecté.
- **Dans Nuvio** : coche « Alertes de mise à jour dans Nuvio » dans l'espace hébergeur et réinstalle ton lien. Une
  rangée « Mise à jour » apparaît en tête de l'accueil, seulement quand une nouvelle version est sortie. Si tu as
  déjà réorganisé tes rangées, elle arrive en bas la première fois : remonte-la une fois. Après « Plus tard », la
  carte peut rester jusqu'au prochain redémarrage de Nuvio. Les liens que tu donnes aux autres n'ont jamais cette
  rangée.

Sécurité de l'espace hébergeur : le cookie de connexion et le jeton du lien avec alertes sont signés avec ton mot
de passe et ta clé TMDB (impossible de retrouver le mot de passe à partir du lien) ; 10 essais ratés en un quart
d'heure depuis une même adresse bloquent les suivants ; les demandes venues d'un autre site sont refusées.

Une copie se reconnaît à son adresse (tout autre hôte que celui de l'instance principale) : son addon a son propre identifiant
(`com.xnzx07.catalogue-fr.perso`), on peut donc installer les deux dans Nuvio. Le code de l'espace hébergeur est
dans `worker/hote.js`. « Plus tard » est gardé dans `./donnees` sur Docker ; sur Cloudflare, dans le cache de ta
copie (ou dans un KV `ETAT` si tu en déclares un dans le `wrangler.toml` de ton fork) : au pire, si le cache est
vidé, la proposition revient.
