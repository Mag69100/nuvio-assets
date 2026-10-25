// Essai : Torrentio, TMDB et AniList répondent-ils aux serveurs de Hugging Face ?
import { createServer } from "node:http";
const essai = async (nom, url) => {
  const t = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "CatalogueFR/1.0" } });
    const corps = await r.text();
    return { nom, statut: r.status, ms: Date.now() - t, debut: corps.slice(0, 80) };
  } catch (e) { return { nom, erreur: e.message, ms: Date.now() - t }; }
};
createServer(async (req, res) => {
  const resultats = await Promise.all([
    essai("torrentio film", "https://torrentio.strem.fun/language=french/stream/movie/tt0137523.json"),
    essai("torrentio série", "https://torrentio.strem.fun/language=french/stream/series/tt0903747:5:1.json"),
    essai("tmdb", "https://api.themoviedb.org/3/configuration"),
    essai("anilist", "https://graphql.anilist.co"),
    essai("ip", "https://api.ipify.org"),
  ]);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ cpus: (await import("node:os")).cpus().length, resultats }, null, 1));
}).listen(7860, "0.0.0.0");
