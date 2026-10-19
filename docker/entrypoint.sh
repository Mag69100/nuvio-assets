#!/bin/sh
# Démarrage d'une copie Docker : les variables d'environnement du conteneur sont passées au Worker
# (--var, telles quelles : un mot de passe peut contenir des guillemets, #, = ou des espaces), puis le
# Worker écoute sur le port 8787.
set -e
APP_DIR="${APP_DIR:-/app}"
set --
for name in TMDB_API_KEY GEMINI_API_KEY GEMINI_PUBLIC ADMIN_PASSWORD INSTALLATION DEPOT; do
  eval "value=\${$name:-}"
  if [ -n "$value" ]; then set -- "$@" --var "$name:$value"; fi
done
if [ -z "${TMDB_API_KEY:-}" ]; then
  echo "TMDB_API_KEY manquante : ajoute ta clé TMDB dans docker-compose.yml (environment)." >&2
fi
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "ADMIN_PASSWORD absent : pas d'espace hébergeur, donc pas de proposition de mise à jour." >&2
fi
# Derrière Cloudflare Tunnel ou un reverse proxy en https : l'adresse publique, pour que les liens du
# site et de l'addon soient en https://ton-domaine (sinon http://, bloqué par le navigateur).
if [ -n "${ADRESSE_PUBLIQUE:-}" ]; then
  host=$(printf '%s' "$ADRESSE_PUBLIQUE" | sed -e 's#^[A-Za-z]*://##' -e 's#/.*$##')
  set -- "$@" --local-upstream "$host" --upstream-protocol https
fi
cd "$APP_DIR"
# --log-level warn : pas une ligne par requête (les adresses contiennent les réglages, parfois une clé Gemini).
exec wrangler dev --local --ip 0.0.0.0 --port 8787 --persist-to /data --show-interactive-dev-session=false --log-level warn "$@"
