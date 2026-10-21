// Sous Node, ce que Cloudflare intègre lui-même : les .bin (notes IMDb) deviennent un ArrayBuffer
// vide, les polices (.woff2) un ArrayBuffer de leurs octets, et les .json importés sans attribut deviennent
// un module qui exporte leur contenu.
import { readFile } from "node:fs/promises";

export async function load(url, context, next) {
  if (url.endsWith(".bin")) return { format: "module", source: "export default new ArrayBuffer(0);", shortCircuit: true };
  if (url.endsWith(".woff2")) {
    const b64 = (await readFile(new URL(url))).toString("base64");
    return { format: "module", source: `const b = Buffer.from("${b64}", "base64"); export default b.buffer.slice(b.byteOffset, b.byteOffset + b.length);`, shortCircuit: true };
  }
  if (url.endsWith(".json") && !(context.importAttributes || {}).type) {
    return { format: "module", source: `export default ${await readFile(new URL(url), "utf8")};`, shortCircuit: true };
  }
  return next(url, context);
}
