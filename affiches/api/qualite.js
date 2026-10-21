/**
 * /qualite/{movie|series}/{tt…|tt…:saison:1}.json (réécrit vers /api/qualite par vercel.json) : la qualité
 * d'une vidéo (et la VF de ses sources) lue chez Torrentio, gardée un jour par le cache de Vercel. Les affiches la demandent ici :
 * une seule lecture sert à toutes les instances du service.
 */
import { lireTorrentio } from "../lib/qualite.js";

const VIDEO = { movie: /^tt\d{1,10}$/, series: /^tt\d{1,10}:\d{1,3}:1$/ };

export function makeQualite({ fetchImpl = fetch } = {}) {
  return async function GET(request) {
    const q = new URL(request.url).searchParams;
    const type = q.get("type"), video = q.get("video") || "";
    if (!VIDEO[type] || !VIDEO[type].test(video)) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    const qualite = await lireTorrentio(`${type}/${video}`, fetchImpl);
    // Torrentio en panne ou qui refuse : { erreur: true } gardé 30 min (le CDN de Vercel ne garde jamais une 503 :
    // chaque affiche redemanderait Torrentio, et Vercel risquerait d'être bloqué).
    if (!qualite) {
      return new Response(JSON.stringify({ erreur: true }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800", "Vercel-CDN-Cache-Control": "max-age=1800" },
      });
    }
    return new Response(JSON.stringify(qualite), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400", "Vercel-CDN-Cache-Control": "max-age=86400, stale-if-error=86400" },
    });
  };
}

export const GET = makeQualite();
