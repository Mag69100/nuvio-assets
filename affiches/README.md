# Affiches maison

Le service qui dessine les affiches des cartes de Nuvio, à la place de Posters+. Il est hébergé sur Vercel
(offre gratuite), à part de l'addon Cloudflare, pour ne pas consommer son quota.

Pour chaque titre, il dessine :
- en bas, le logo du titre, puis la ligne « genre · ★ note · année » ;
- en haut à gauche, le rang dans les tendances du jour ;
- en haut à droite, la qualité (4K, DV, HDR).

Les affiches sont en portrait ou en paysage, au format JPEG.

## Le lien à coller dans Nuvio

Dans Nuvio : Paramètres → Disposition → Custom Poster Source, coller :

```
https://affiches-catalogue-fr.vercel.app/{type}/{shape}/{id}.jpg?imdb={imdb_id?}
```

Mesures à la mise en ligne (2026-10-20) :
- **Affiche jamais demandée :** 0,6 à 1,5 s, démarrage à froid compris.
- **Affiche déjà servie :** environ 0,3 s, depuis le cache de Vercel.
- **Revalidation par `ETag` :** une réponse 304, sans redessiner.
- **Poids :** 30 à 70 Ko par affiche.
- **Torrentio depuis Vercel :** 20 films connus en 4K sur 20 ont reçu leur badge.

Caches :
- **Nuvio** garde une affiche une semaine, puis revérifie son `ETag`.
- **Le CDN de Vercel** la garde un jour, puis la redessine en arrière-plan.

Estimation pour environ 300 personnes actives par jour : 600 000 à 900 000 requêtes et 2 à 3 h de calcul par mois,
près des limites gratuites. Il faut regarder la consommation après quelques jours.
- **Requêtes trop hautes :** allonger le `max-age` de Nuvio dans `api/affiche.js`.
- **Calcul trop haut :** allonger `Vercel-CDN-Cache-Control`.

## Variables (projet Vercel)

| Nom | Rôle |
|---|---|
| `TMDB_API_KEY` | Clé TMDB du service (secrète) |
| `QUALITE` | `off` coupe le badge qualité (si Torrentio ne répond plus depuis Vercel) |

## Tests

```sh
cd affiches && npm install && npm test
```

## Consommation

Tableau de bord Vercel → le projet → Usage. Limites gratuites par mois : 1 000 000 de requêtes CDN, 4 h de
calcul (Active CPU), 100 Go de transfert. En cas de dépassement, Vercel coupe pendant 30 jours : Nuvio montre
alors les affiches d'origine.
