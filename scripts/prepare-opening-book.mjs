// Run with a directory containing a.tsv through e.tsv from lichess-org/chess-openings.
// Data is CC0; no network requests are made by this script or the application.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Chess } from "chess.js";
const directory = process.argv[2];
if (!directory)
  throw new Error(
    "Usage: node scripts/prepare-opening-book.mjs <tsv-directory>",
  );
const lines = [];
for (const letter of "abcde") {
  const text = await readFile(resolve(directory, `${letter}.tsv`), "utf8");
  for (const row of text.trim().split("\n").slice(1)) {
    const [eco, name, pgn] = row.split("\t");
    const chess = new Chess();
    chess.loadPgn(pgn);
    lines.push({ eco, name, moves: chess.history({ verbose: true }) });
  }
}
lines.sort(
  (a, b) =>
    a.moves.length - b.moves.length ||
    a.eco.localeCompare(b.eco) ||
    a.name.localeCompare(b.name),
);
const hashKey = (key) => {
  let hash = 14695981039346656037n;
  for (let i = 0; i < key.length; i++)
    hash = BigInt.asUintN(
      64,
      (hash ^ BigInt(key.charCodeAt(i))) * 1099511628211n,
    );
  return hash.toString(16).padStart(16, "0");
};
const seen = new Map();
const names = [];
const edges = {};
for (const { eco, name, moves } of lines) {
  const index = names.length;
  names.push([eco, name]);
  for (const move of moves) {
    const key = `${move.before.split(" ").slice(0, 4).join(" ")}|${move.from}${move.to}${move.promotion ?? ""}`;
    const hash = hashKey(key);
    if (seen.has(hash) && seen.get(hash) !== key)
      throw new Error("Opening key collision");
    seen.set(hash, key);
    edges[hash] ??= index;
  }
}
await writeFile(
  new URL("../src/data/opening-book.json", import.meta.url),
  JSON.stringify({ names, edges }) + "\n",
);
console.log(
  `${names.length} named lines; ${Object.keys(edges).length} book moves.`,
);
