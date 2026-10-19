// Sous Node, ce que Cloudflare intègre lui-même : les .bin (notes IMDb) deviennent un ArrayBuffer
// vide, et les .json importés sans attribut deviennent un module qui exporte leur contenu.
import { readFile } from "node:fs/promises";

export async function load(url, context, next) {
  if (url.endsWith(".bin")) return { format: "module", source: "export default new ArrayBuffer(0);", shortCircuit: true };
  if (url.endsWith(".json") && !(context.importAttributes || {}).type) {
    return { format: "module", source: `export default ${await readFile(new URL(url), "utf8")};`, shortCircuit: true };
  }
  return next(url, context);
}
