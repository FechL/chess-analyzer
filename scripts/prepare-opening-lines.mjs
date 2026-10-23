// Usage: node scripts/prepare-opening-lines.mjs <directory with a.tsv ... e.tsv>
// Source: https://github.com/lichess-org/chess-openings (CC0).
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Chess } from "chess.js";

const directory = process.argv[2];
if (!directory) throw new Error("Provide the Lichess opening TSV directory.");
const families = {
  italian: (m) => m.startsWith("e4 e5 Nf3 Nc6 Bc4 "),
  sicilian: (m) => m.startsWith("e4 c5 "),
  "queens-gambit": (m) => m.startsWith("d4 d5 c4 "),
  london: (_, name) => /London System/i.test(name),
  "ruy-lopez": (m) => m.startsWith("e4 e5 Nf3 Nc6 Bb5 "),
  "caro-kann": (m) => m.startsWith("e4 c6 "),
  french: (m) => m.startsWith("e4 e6 "),
  "kings-indian": (_, name) => name.startsWith("King's Indian Defense"),
  scandinavian: (m) => m.startsWith("e4 d5 "),
  scotch: (m) => m.startsWith("e4 e5 Nf3 Nc6 d4 "),
  petrov: (m) => m.startsWith("e4 e5 Nf3 Nf6 "),
  english: (m) => m.startsWith("c4 "),
};
const courses = Object.fromEntries(Object.keys(families).map((id) => [id, []]));
for (const letter of "abcde") {
  const text = await readFile(resolve(directory, `${letter}.tsv`), "utf8");
  for (const row of text.trim().split("\n").slice(1)) {
    const [eco, name, pgn] = row.split("\t");
    const sans = pgn
      .replace(/\d+\.(\.\.)?/g, "")
      .trim()
      .split(/\s+/);
    if (sans.length < 6) continue;
    const matches = Object.entries(families).filter(([, match]) =>
      match(sans.join(" ") + " ", name),
    );
    if (!matches.length) continue;
    const chess = new Chess();
    chess.loadPgn(pgn);
    const moves = chess.history();
    const id = createHash("sha256")
      .update(moves.join(" "))
      .digest("hex")
      .slice(0, 12);
    for (const [family] of matches)
      courses[family].push({ id, eco, name, moves });
  }
}
for (const family of Object.keys(courses)) {
  const unique = [
    ...new Map(courses[family].map((line) => [line.id, line])).values(),
  ];
  // Train complete branches instead of repeating every prefix as another line.
  courses[family] = unique
    .filter(
      (line) =>
        !unique.some(
          (other) =>
            other.moves.length > line.moves.length &&
            line.moves.every((move, index) => other.moves[index] === move),
        ),
    )
    .sort(
      (a, b) => a.moves.length - b.moves.length || a.name.localeCompare(b.name),
    );
}
await writeFile(
  new URL("../src/data/opening-lines.json", import.meta.url),
  JSON.stringify(courses) + "\n",
);
console.log(
  Object.entries(courses)
    .map(([id, lines]) => `${id}: ${lines.length} variations`)
    .join("\n"),
);
