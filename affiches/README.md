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
https://<projet>.vercel.app/{type}/{shape}/{id}.jpg?imdb={imdb_id?}
```

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
