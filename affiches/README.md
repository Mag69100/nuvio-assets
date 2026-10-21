# Affiches maison

Le service qui dessine les affiches des cartes de Nuvio, à la place de Posters+. Il est hébergé sur Vercel
(offre gratuite), à part de l'addon Cloudflare, pour ne pas consommer son quota.

Pour chaque titre, il dessine :
- en bas, le logo du titre, puis la ligne « genre · ★ note · année » ;
- en haut à gauche, le rang dans les tendances du jour ;
- en haut à droite, la qualité (4K, DV, HDR).

Les affiches sont en portrait ou en paysage, au format JPEG.

Les autres réglages se choisissent dans la régie (salle 2) et s'écrivent dans le lien (`s=1.…`, voir
`lib/lien-affiches.js`). Parmi eux, ces options, éteintes par défaut (sans elles, le dessin ne change pas) :
- **Langue** (`3g1`) : VF, MULTI (VF et VO), VOSTFR ou VO, sous la qualité, d'après les noms des sources lues chez
  Torrentio (le même relais `/qualite/` que la qualité). Sans sources, pas de badge.
- **Fin** et **Avancement** d'une série (`3h1`, `3i1`, réglages du statut) : « TERMINÉE » ou « ANNULÉE » (statut TMDB)
  quand rien de plus fort n'est à dire (ordre dans `lib/statut.js`) ; une barre fine des épisodes sortis de la saison
  en cours, cachée si elle est complète ou inconnue.
- **Rang dans la saga** (`3j1`) : « SAGA · 3/5 », la place du film parmi ceux de sa collection TMDB déjà sortis
  (`lib/saga.js`, un appel `/collection/` par saga, gardé une semaine).
- **Habillage de la saison** (`3k1`) : cadre et ornements d'Halloween, de Noël, de la Saint-Valentin, de Pâques ou
  d'été (`lib/habillage.js`) sur les films de la rangée « Spécial … » de l'addon, lue sur son `/saison.json`
  (`lib/saison.js`, gardée 3 h). Nuvio ne dit pas de quelle rangée vient une affiche : ces films sont habillés
  partout où ils apparaissent.

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
- **Le CDN de Vercel** la garde sept jours, puis la redessine en arrière-plan ; si le service tombe en panne, il
  ressert l'ancienne un jour de plus.
- **Chaque mise en ligne vide le cache du CDN** (il dépend du déploiement) : toutes les affiches sont redessinées
  ensuite. Mieux vaut grouper les mises en ligne.
- **Un lien bricolé** (paramètre en trop, lettres dans le désordre) est redirigé vers sa forme normale, sans
  dessiner une copie de plus (redirection gardée sept jours).
- **Dessin impossible** (logo cassé, SVG illisible) : redirection vers l'affiche d'origine chez TMDB, gardée une heure.
- **Une affiche classée** (« N° ») est revérifiée chaque jour par l'appli ; une affiche avec un statut, aussi à
  minuit à Paris.
- **Rien à dessiner** (style « Nue », ou titre sans logo ni rang ni 4K) : redirection vers l'image TMDB d'origine.
- **La qualité** passe par le relais `/qualite/…` du service, gardé un jour par le CDN : une seule lecture
  de Torrentio sert à toutes les instances.
- **Options au choix** : « TERMINÉE » garde le cache normal ; la barre d'avancement expire au lendemain du prochain
  épisode ; avec l'habillage de la saison, les films expirent au prochain changement de fête (pas chaque jour : un
  film sorti de la rangée en cours de fête garde son habillage une semaine au plus).

Estimation pour environ 300 personnes actives par jour :
- **Requêtes :** 600 000 à 900 000 par mois.
- **Calcul :** environ 0,1 à 0,2 s par affiche dessinée. Une affiche sans statut ni N° est redessinée au plus
  une fois par semaine ; une affiche avec, une ou deux fois par jour. Avec des redessins tous les 3 jours, on
  comptait 1,5 à 3 h par mois.

On est près des limites gratuites : il faut regarder Usage → Active CPU dans les 48 h.
- **Requêtes trop hautes :** allonger le `max-age` de Nuvio dans `api/affiche.js`.
- **Calcul trop haut :** allonger encore `Vercel-CDN-Cache-Control`, ou baisser `RENDUS_HEURE`.

Garde-fou : au-delà de 60 dessins par minute ou de 600 par heure sur une instance (`lib/disjoncteur.js`), le
service ne dessine plus et renvoie l'affiche d'origine de TMDB, gardée 10 minutes. C'est compté par instance :
une limite de débit dans le pare-feu de Vercel (Firewall → Rules) le complète.

## Variables (projet Vercel)

| Nom | Rôle |
|---|---|
| `TMDB_API_KEY` | Clé TMDB du service (secrète) |
| `QUALITE` | `off` coupe le badge qualité (si Torrentio ne répond plus depuis Vercel) |
| `RELAIS_KEY` | Clé des relais `/qualite`, `/notes` et `/vf.json` (secrète) : une adresse pas encore au CDN n'est lue chez Torrentio ou MDBList que pour le service et l'addon, qui envoient l'en-tête `X-Relais-Cle`. La même valeur doit être un secret de l'addon (`RELAIS_KEY`), mis en ligne avant |
| `RENDUS_MINUTE`, `RENDUS_HEURE` | Dessins au plus par instance, par minute (60) et par heure (600) |

## Tests

```sh
cd affiches && npm install && npm test
```

Vercel les lance aussi avant chaque mise en ligne (`buildCommand` de `vercel.json`) : un test qui échoue bloque la
mise en ligne, et l'ancienne version reste en service.

## Consommation

Tableau de bord Vercel → le projet → Usage. Limites gratuites par mois : 1 000 000 de requêtes CDN, 4 h de
calcul (Active CPU), 100 Go de transfert. En cas de dépassement, Vercel coupe pendant 30 jours : Nuvio montre
alors les affiches d'origine.
