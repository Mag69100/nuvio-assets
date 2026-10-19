# Copie auto-hébergée du Catalogue FR (voir README, « Héberger ta propre copie »).
# Le Worker tourne tel quel avec wrangler dev : le runtime workerd de Cloudflare, en local.
# Cache et choix de l'hébergeur gardés dans le volume /data.
FROM node:22-bookworm-slim

RUN npm install -g wrangler@4.151.1 && npm cache clean --force

WORKDIR /app
COPY wrangler.toml catalogs.json ./
COPY worker ./worker
COPY data/imdb-ratings.bin ./data/imdb-ratings.bin
COPY docker/entrypoint.sh ./docker/entrypoint.sh
# Le Worker tourne avec l'utilisateur « node » (voir entrypoint.sh) : il écrit son état de travail dans /app.
RUN chmod +x docker/entrypoint.sh && chown node:node /app

ENV INSTALLATION=docker \
    WRANGLER_SEND_METRICS=false \
    APP_DIR=/app
EXPOSE 8787
VOLUME /data
ENTRYPOINT ["/app/docker/entrypoint.sh"]
