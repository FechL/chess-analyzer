import { Chess, type Color } from "chess.js";

type Line = { id: string; moves: string[]; intro?: boolean };

/** Keep one learner response per position, preserving alternative opponent moves. */
export function consistentRepertoire<T extends Line>(lines: T[], side: Color) {
  const choices = new Map<
    string,
    { lan: string; san: string; lineId: string }
  >();
  const kept = new Set<string>();
  const conflicts: {
    id: string;
    reason: "repertoire-conflict";
    ply: number;
    position: string;
    san: string;
    retainedSan: string;
    retainedLineId: string;
  }[] = [];
  // Protect the course's defining setup. Otherwise prefer the longer lesson;
  // existing curriculum order breaks ties without changing surviving IDs.
  const ranked = [...lines].sort(
    (a, b) =>
      Number(!!b.intro) - Number(!!a.intro) || b.moves.length - a.moves.length,
  );
  for (const line of ranked) {
    const board = new Chess();
    const pending = new Map<
      string,
      { lan: string; san: string; lineId: string }
    >();
    let conflict = false;
    for (const [index, san] of line.moves.entries()) {
      const position = board.fen().split(" ").slice(0, 4).join(" ");
      const move = board.move(san);
      if (move.color !== side) continue;
      const previous = choices.get(position) || pending.get(position);
      if (previous && previous.lan !== move.lan) {
        conflicts.push({
          id: line.id,
          reason: "repertoire-conflict",
          ply: index + 1,
          position,
          san: move.san,
          retainedSan: previous.san,
          retainedLineId: previous.lineId,
        });
        conflict = true;
        break;
      }
      if (!previous)
        pending.set(position, {
          lan: move.lan,
          san: move.san,
          lineId: line.id,
        });
    }
    // A rejected line must not reserve any other responses along its path.
    if (!conflict) {
      kept.add(line.id);
      for (const [position, choice] of pending) choices.set(position, choice);
    }
  }
  return { lines: lines.filter((line) => kept.has(line.id)), conflicts };
}
