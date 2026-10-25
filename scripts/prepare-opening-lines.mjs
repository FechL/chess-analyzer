// Node.js 24+: node scripts/prepare-opening-lines.mjs <TSV directory> [cache path]
// Lichess opening names are a classification database, not a teaching repertoire.
// Only publish branches that pass the trained-side quality gate below.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Chess } from "chess.js";
import { format } from "prettier";
import { OPENINGS } from "../src/data/content.ts";
import { stockfishAudit } from "./lib/stockfish-audit.mjs";
import { consistentRepertoire } from "./lib/opening-repertoire.ts";

const directory = process.argv[2];
if (!directory) throw new Error("Provide the Lichess opening TSV directory.");
const SCREEN_NODES = 60_000;
const CONFIRM_NODES = 500_000;
const CONTINUATION_NODES = 500_000;
const MAX_LOSS_CP = 100;
const MAX_DEFICIT_CP = 150;
// A stricter publication gate than the historical tactical screen above.
const MAX_TRAINING_DEFICIT_CP = 100;
const families = {
  italian: (m) => m.startsWith("e4 e5 Nf3 Nc6 Bc4 "),
  sicilian: (m) => m.startsWith("e4 c5 "),
  "queens-gambit": (m) => m.startsWith("d4 d5 c4 "),
  london: (_, name) => /London System|Rapport-Jobava System/i.test(name),
  "ruy-lopez": (m) => m.startsWith("e4 e5 Nf3 Nc6 Bb5 "),
  "caro-kann": (m) => m.startsWith("e4 c6 "),
  french: (m) => m.startsWith("e4 e6 "),
  "kings-indian": (_, name) => name.startsWith("King's Indian Defense"),
  scandinavian: (m) => m.startsWith("e4 d5 "),
  scotch: (m) => m.startsWith("e4 e5 Nf3 Nc6 d4 "),
  petrov: (m) => m.startsWith("e4 e5 Nf3 Nf6 "),
  english: (m) => m.startsWith("c4 "),
};
// Teach the main structures before historical sidelines, rather than sorting
// short traps ahead of the main line just because their name has fewer moves.
const priorities = {
  italian: [
    /Giuoco Pianissimo/,
    /Giuoco Piano/,
    /Two Knights Defense/,
    /Evans Gambit/,
  ],
  sicilian: [
    /Najdorf/,
    /Dragon/,
    /Classical/,
    /Sveshnikov/,
    /Kan Variation/,
    /Taimanov/,
    /Alapin/,
    /Closed/,
  ],
  "queens-gambit": [
    /Declined.*Orthodox/,
    /Declined.*Exchange/,
    /Accepted/,
    /Slav Defense/,
    /Semi-Slav/,
    /Tarrasch/,
  ],
  london: [/(?:^|: )London System$/, /Accelerated/, /Jobava/, /Indian/],
  "ruy-lopez": [/Closed/, /Berlin Defense/, /Exchange/, /Open/, /Marshall/],
  "caro-kann": [
    /Classical/,
    /Advance/,
    /Exchange/,
    /Panov/,
    /Karpov/,
    /Two Knights/,
    /Fantasy/,
  ],
  french: [
    /Advance/,
    /Exchange/,
    /Tarrasch/,
    /Winawer/,
    /Classical/,
    /Rubinstein/,
  ],
  "kings-indian": [
    /Normal/,
    /Orthodox/,
    /Classical/,
    /Fianchetto/,
    /Sämisch/,
    /Averbakh/,
    /Four Pawns/,
    /Petrosian/,
  ],
  scandinavian: [/Main Line/, /Mieses/, /Modern/, /Icelandic/],
  scotch: [/Classical/, /Schmidt/, /Mieses/, /Scotch Gambit/, /Göring/],
  petrov: [/Classical/, /Nimzowitsch/, /Modern Attack/, /Three Knights/],
  english: [/Four Knights/, /Symmetrical/, /King's English/, /Hedgehog/],
};
const idFor = (moves) =>
  createHash("sha256").update(moves.join(" ")).digest("hex").slice(0, 12);
const keyFor = (fen) => fen.split(" ").slice(0, 4).join(" ");
const aliasesFor = (family, moves, name) => {
  const path = moves.join(" ");
  if (family === "caro-kann" && path.startsWith("e4 c6 d4 d5 f3 "))
    return ["Caro-Kann Defense: Fantasy Variation"];
  if (family === "london" && /Jobava/.test(name))
    return ["Jobava London", "Jobava London System"];
  if (family === "scotch" && path.startsWith("e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 "))
    return ["Scotch Game: Schmidt Variation"];
  return [];
};
const isPrefix = (a, b) =>
  a.length < b.length && a.every((move, index) => b[index] === move);
const raw = Object.fromEntries(OPENINGS.map(({ id }) => [id, []]));
const inputHashes = {};
for (const letter of "abcde") {
  const text = await readFile(resolve(directory, `${letter}.tsv`), "utf8");
  inputHashes[`${letter}.tsv`] = createHash("sha256")
    .update(text)
    .digest("hex");
  for (const row of text.trim().split("\n").slice(1)) {
    const [eco, name, pgn] = row.split("\t");
    const chess = new Chess();
    chess.loadPgn(pgn);
    const moves = chess.history();
    if (moves.length < 5) continue;
    for (const [family, matches] of Object.entries(families)) {
      if (matches(moves.join(" ") + " ", name))
        raw[family].push({ id: idFor(moves), eco, name, moves });
    }
  }
}
const sourceCommit = JSON.parse(
  await readFile(resolve(directory, "commit.json"), "utf8"),
).sha;
const londonSupplement = await readFile(
  new URL("../src/data/london-training-lines.json", import.meta.url),
  "utf8",
).catch((error) => {
  if (error.code === "ENOENT") return "[]";
  throw error;
});
const supplementalLines = { london: JSON.parse(londonSupplement) };
const engine = await stockfishAudit(
  process.argv[3] || "/tmp/kuda-opening-audit-cache.json",
);
const edgeCache = new Map();
const courses = {};
const report = {
  version: 3,
  repertoirePolicy:
    "One learner response per position; intro first, then longest line; existing order breaks ties.",
  sourceCommit,
  sourceHashes: inputHashes,
  supplementalSources: {
    "src/data/london-training-lines.json": createHash("sha256")
      .update(londonSupplement)
      .digest("hex"),
  },
  engine: `${engine.name} (one thread, 64 MiB hash)`,
  screenNodes: SCREEN_NODES,
  confirmationNodes: CONFIRM_NODES,
  continuationNodes: CONTINUATION_NODES,
  maxLossCp: MAX_LOSS_CP,
  maxDeficitCp: MAX_DEFICIT_CP,
  maxTrainingDeficitCp: MAX_TRAINING_DEFICIT_CP,
  families: {},
};
let processed = 0;
let lastLog = Date.now();
async function checkEdge(move) {
  const key = `${keyFor(move.before)}|${move.lan}`;
  if (edgeCache.has(key)) return edgeCache.get(key);
  let before = await engine.analyze(move.before, SCREEN_NODES);
  let after = await engine.analyze(move.after, SCREEN_NODES);
  let loss = Math.max(0, before.cp + after.cp);
  let score = -after.cp;
  // Re-search borderline or bad moves with a larger budget; a shallow score
  // swing must not reject a sound sacrifice or an ordinary developing move.
  if (loss > 60 || score < -100) {
    before = await engine.analyze(move.before, CONFIRM_NODES);
    after = await engine.analyze(move.after, CONFIRM_NODES);
    loss = Math.max(0, before.cp + after.cp);
    score = -after.cp;
  }
  const result = {
    lossCp: loss,
    scoreCp: score,
    best: before.best,
    depth: after.depth,
    nodes: Math.min(before.nodes, after.nodes),
    accepted:
      loss <= MAX_LOSS_CP && score >= -MAX_DEFICIT_CP && !(after.mate > 0),
  };
  edgeCache.set(key, result);
  return result;
}
try {
  for (const opening of OPENINGS) {
    const { id: family, side } = opening;
    const unique = [
      ...new Map(raw[family].map((line) => [line.id, line])).values(),
    ];
    const leaves = unique.filter(
      (line) => !unique.some((other) => isPrefix(line.moves, other.moves)),
    );
    const intro = {
      id: `${family}-intro`,
      eco: opening.eco,
      name: "Jalur pengantar",
      moves: opening.moves,
      intro: true,
    };
    const candidates = [
      intro,
      ...leaves.filter(
        (line) => line.moves.join(" ") !== intro.moves.join(" "),
      ),
      ...(supplementalLines[family] || []),
    ];
    const summary = {
      input: candidates.length,
      accepted: 0,
      continuations: 0,
      duplicates: 0,
      prefixes: 0,
      rejected: [],
    };
    report.families[family] = summary;
    const accepted = [];
    for (const candidate of candidates) {
      const chess = new Chess();
      const moves = [];
      const checks = [];
      let rejected;
      for (const san of candidate.moves) {
        const move = chess.move(san);
        moves.push(move.san);
        if (chess.isGameOver()) {
          rejected = {
            reason: "terminal-position",
            ply: moves.length,
            san: move.san,
          };
          break;
        }
        if (move.color !== side) continue;
        const check = await checkEdge(move);
        checks.push(check);
        if (!check.accepted) {
          rejected = {
            reason: "unsafe-training-move",
            ply: moves.length,
            san: move.san,
            ...check,
          };
          break;
        }
      }
      let continuation;
      // If the source stops on an opponent move, calculate the player's reply.
      // Keep its provenance separate: this added move is engine analysis, not ECO.
      if (!rejected && chess.turn() === side) {
        const analysis = await engine.analyze(chess.fen(), CONTINUATION_NODES);
        const best = analysis.best;
        const move = chess.move({
          from: best.slice(0, 2),
          to: best.slice(2, 4),
          promotion: best[4],
        });
        moves.push(move.san);
        if (chess.isGameOver())
          rejected = {
            reason: "terminal-position",
            ply: moves.length,
            san: move.san,
          };
        else {
          const check = await checkEdge(move);
          checks.push(check);
          if (!check.accepted)
            rejected = {
              reason: "unsafe-continuation",
              ply: moves.length,
              san: move.san,
              ...check,
            };
          else
            continuation = {
              engine: "Stockfish 19 Full",
              depth: analysis.depth,
              nodes: analysis.nodes,
            };
        }
      }
      if (rejected) {
        summary.rejected.push({
          id: candidate.id,
          name: candidate.name,
          moves: candidate.moves,
          ...rejected,
        });
        if (candidate.intro)
          throw new Error(
            `Intro failed quality gate: ${family} ${JSON.stringify(rejected)}`,
          );
      } else {
        accepted.push({
          id: candidate.intro && !continuation ? candidate.id : idFor(moves),
          eco: candidate.eco,
          name: candidate.name,
          moves,
          aliases: [
            ...new Set([
              ...aliasesFor(family, moves, candidate.name),
              ...(candidate.aliases || []),
            ]),
          ],
          ...(candidate.intro ? { intro: true } : {}),
          source: {
            bookPly: candidate.moves.length,
            ...candidate.source,
            ...(candidate.intro ? { curated: true } : {}),
            ...(continuation ? { continuation } : {}),
          },
          quality: {
            checkedMoves: checks.length,
            maxLossCp: Math.max(...checks.map((check) => check.lossCp)),
            minScoreCp: Math.min(...checks.map((check) => check.scoreCp)),
          },
          _finalKey: keyFor(chess.fen()),
        });
      }
      processed++;
      if (Date.now() - lastLog > 15_000) {
        console.log(
          `Audited ${processed} branches · ${family} · ${engine.searches} position searches`,
        );
        lastLog = Date.now();
      }
    }
    // Prefer an introduction, then shorter canonical move orders over duplicate
    // transpositions. Compare actual positions, not only the variation's name.
    accepted.sort(
      (a, b) =>
        Number(!!b.intro) - Number(!!a.intro) ||
        a.moves.length - b.moves.length ||
        a.name.localeCompare(b.name),
    );
    const seen = new Set();
    const distinct = accepted.filter((line) => {
      if (seen.has(line._finalKey)) {
        summary.duplicates++;
        return false;
      }
      seen.add(line._finalKey);
      return true;
    });
    const branches = distinct.filter((line) => {
      if (
        !line.intro &&
        distinct.some((other) => isPrefix(line.moves, other.moves))
      ) {
        summary.prefixes++;
        return false;
      }
      return true;
    });
    const priority = (line) => {
      if (line.intro) return -1;
      const index = priorities[family].findIndex((pattern) =>
        [line.name, ...line.aliases].some((name) => pattern.test(name)),
      );
      return index < 0 ? priorities[family].length : index;
    };
    branches.sort(
      (a, b) =>
        Number(!!a.source.training) - Number(!!b.source.training) ||
        priority(a) - priority(b) ||
        a.moves.length - b.moves.length ||
        a.name.localeCompare(b.name),
    );
    summary.deficits = branches
      .filter((line) => line.quality.minScoreCp < -MAX_TRAINING_DEFICIT_CP)
      .map((line) => ({
        id: line.id,
        name: line.name,
        moves: line.moves,
        reason: "learner-deficit",
        minScoreCp: line.quality.minScoreCp,
        maxDeficitCp: MAX_TRAINING_DEFICIT_CP,
      }));
    const repertoire = consistentRepertoire(
      branches.filter(
        (line) => line.quality.minScoreCp >= -MAX_TRAINING_DEFICIT_CP,
      ),
      side,
    );
    summary.conflicts = repertoire.conflicts;
    courses[family] = repertoire.lines.map(({ _finalKey, ...line }) => line);
    summary.accepted = repertoire.lines.length;
    summary.continuations = repertoire.lines.filter(
      (line) => line.source.continuation,
    ).length;
    console.log(
      `${family}: ${summary.input} audited → ${summary.accepted} published; ${summary.rejected.length} rejected; ${summary.duplicates} transpositions; ${summary.prefixes} prefixes; ${summary.conflicts.length} conflicting lines removed`,
    );
  }
  const manifest = { ...report };
  delete manifest.families;
  manifest.sources = {
    openings: `https://github.com/lichess-org/chess-openings/tree/${sourceCommit}`,
    engine: "https://github.com/official-stockfish/Stockfish",
    methodology: "docs/OPENING_AUDIT.md",
  };
  manifest.families = Object.fromEntries(
    Object.entries(report.families).map(
      ([family, { rejected, conflicts, deficits, ...summary }]) => [
        family,
        {
          ...summary,
          rejected: rejected.length,
          conflicts: conflicts.length,
          deficits: deficits.length,
        },
      ],
    ),
  );
  await writeFile(
    new URL("../src/data/opening-lines.json", import.meta.url),
    JSON.stringify(courses) + "\n",
  );
  await writeFile(
    new URL("../src/data/opening-line-sources.json", import.meta.url),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    new URL("../docs/opening-audit-rejections.json", import.meta.url),
    await format(JSON.stringify(report), { parser: "json" }),
  );
  console.log(
    `Published ${Object.values(courses).flat().length} checked challenges across ${OPENINGS.length} openings.`,
  );
} finally {
  await engine.close();
}
