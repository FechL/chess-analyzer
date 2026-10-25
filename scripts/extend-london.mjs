// Expand audited London positions into explicitly engine-authored practice lines.
// STOCKFISH_PATH=/path/to/stockfish node scripts/extend-london.mjs [cache-path]
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Chess } from "chess.js";
import { format } from "prettier";
import { stockfishAudit } from "./lib/stockfish-audit.mjs";

const catalog = JSON.parse(
  await readFile(
    new URL("../src/data/opening-lines.json", import.meta.url),
    "utf8",
  ),
);
const manifest = JSON.parse(
  await readFile(
    new URL("../src/data/opening-line-sources.json", import.meta.url),
    "utf8",
  ),
);
const original = catalog.london.filter((line) => !line.source.training);
const engine = await stockfishAudit(
  process.argv[2] || "/tmp/kuda-opening-audit-cache.json",
);
const prefixOf = (a, b) =>
  a.length <= b.length && a.every((move, index) => move === b[index]);
const keyFor = (fen) => fen.split(" ").slice(0, 4).join(" ");
const idFor = (moves) =>
  createHash("sha256").update(moves.join(" ")).digest("hex").slice(0, 12);
const prefixes = new Set();
const finalPositions = new Set(
  original.map((line) => {
    const chess = new Chess();
    line.moves.forEach((move) => chess.move(move));
    return keyFor(chess.fen());
  }),
);
const additions = [];
try {
  for (const seed of original) {
    // Fork at the opponent's previous decision, rather than appending an
    // automatic last move or creating another copy of an existing challenge.
    const prefix = seed.moves.slice(0, -2);
    if (
      prefix.length < 5 ||
      !prefix.includes("Bf4") ||
      prefixes.has(prefix.join(" "))
    )
      continue;
    prefixes.add(prefix.join(" "));
    const position = new Chess();
    prefix.forEach((move) => position.move(move));
    if (position.turn() !== "b")
      throw new Error("London branches must begin with Black's choice");
    const options = await engine.variations(position.fen(), 6, 3_000_000);
    for (const option of options) {
      if (option.pv.length < 6) continue;
      const chess = new Chess(position.fen());
      const continuation = [];
      for (const uci of option.pv.slice(0, 6)) {
        const move = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        });
        continuation.push(move.san);
      }
      const moves = [...prefix, ...continuation];
      if (
        chess.isGameOver() ||
        original.some(
          (line) =>
            !line.intro &&
            (prefixOf(line.moves, moves) || prefixOf(moves, line.moves)),
        )
      )
        continue;
      if (finalPositions.has(keyFor(chess.fen()))) continue;
      finalPositions.add(keyFor(chess.fen()));
      const parentName = seed.intro
        ? "London System: Classical Setup"
        : seed.name;
      additions.push({
        id: idFor(moves),
        eco: seed.eco,
        name: `${parentName} · ${Math.ceil((prefix.length + 1) / 2)}...${continuation[0]} ${continuation[1]}`,
        moves,
        aliases: [
          ...(seed.aliases || []),
          seed.eco === "A48"
            ? "London vs King's Indian Setup"
            : "London Training",
        ],
        source: {
          bookPly: prefix.length,
          curated: true,
          training: true,
          seedLineId: seed.id,
          references: [
            seed.intro
              ? "https://www.chess.com/openings/London-System"
              : manifest.sources.openings,
          ],
          continuation: {
            engine: "Stockfish 19 Full",
            depth: option.depth,
            nodes: option.nodes,
            plies: continuation.length,
            multiPv: 6,
          },
        },
      });
    }
    console.log(
      `${seed.name}: ${additions.length} distinct candidate branches so far`,
    );
  }
  await writeFile(
    new URL("../src/data/london-training-lines.json", import.meta.url),
    await format(JSON.stringify(additions), { parser: "json" }),
  );
  console.log(
    `Prepared ${additions.length} London candidates. Run prepare-opening-lines.mjs to apply the quality gate before publishing.`,
  );
} finally {
  await engine.close();
}
