#!/usr/bin/env bash
# Met le serveur des affiches à jour depuis GitHub (main) : seulement si affiches/ ou serveur/ ont changé ; tests du
# service avant de redémarrer (un test raté : on reste sur la version d'avant). Lancé par affiches-maj.timer.
set -euo pipefail
ICI=/opt/affiches/depot
# Le dépôt appartient au compte « affiches » : git refuse d'y travailler sous un autre compte.
g() { sudo -u affiches git -C "$ICI" "$@"; }
dans() { sudo -u affiches bash -c "cd '$ICI/affiches' && $1"; }
avant=$(g rev-parse HEAD)
g fetch --quiet --depth 1 origin main
apres=$(g rev-parse FETCH_HEAD)
[ "$avant" = "$apres" ] && exit 0
g reset --quiet --hard "$apres"
if g diff --quiet "$avant" "$apres" -- affiches serveur; then exit 0; fi
if ! g diff --quiet "$avant" "$apres" -- affiches/package-lock.json; then dans "npm ci --omit=dev --no-audit --no-fund"; fi
if ! dans "env -u RELAIS_KEY node --test" >/tmp/affiches-tests.txt 2>&1; then
  echo "tests ratés : retour à $avant" >&2
  g reset --quiet --hard "$avant"
  dans "npm ci --omit=dev --no-audit --no-fund" >/dev/null 2>&1 || true
  exit 1
fi
# Le service et sa mise à jour changent aussi parfois.
install -m 644 "$ICI/serveur/affiches.service" "$ICI/serveur/affiches-maj.service" "$ICI/serveur/affiches-maj.timer" /etc/systemd/system/
install -m 755 "$ICI/serveur/mettre-a-jour.sh" /usr/local/bin/affiches-mettre-a-jour
systemctl daemon-reload
systemctl restart affiches.service
echo "à jour : $apres"
