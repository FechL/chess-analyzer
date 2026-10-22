import { Chess } from "chess.js";
import type { Move } from "chess.js";

export type BoardTransition = {
  pieces: { from: string; to: string }[];
  sound: "move" | "capture" | "castle" | "check" | "end";
};

// Recognize a single legal step in either direction; imports and jumps stay still.
export function boardTransition(
  before: string,
  after: string,
): BoardTransition | undefined {
  if (before === after) return;
  const previous = new Chess(before);
  const next = new Chess(after);
  const signature = (chess: Chess) =>
    chess.fen().split(" ").slice(0, 4).join(" ");
  const findMove = (chess: Chess, target: Chess): Move | undefined => {
    for (const move of chess.moves({ verbose: true })) {
      chess.move(move);
      const matches = signature(chess) === signature(target);
      chess.undo();
      if (matches) return move;
    }
  };
  let move = findMove(previous, next);
  let reverse = false;
  if (!move) {
    move = findMove(next, previous);
    reverse = true;
  }
  if (!move) return;
  const pieces: BoardTransition["pieces"] = [{ from: move.from, to: move.to }];
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    const rank = move.from[1];
    pieces.push({
      from: `${move.isKingsideCastle() ? "h" : "a"}${rank}`,
      to: `${move.isKingsideCastle() ? "f" : "d"}${rank}`,
    });
  }
  return {
    pieces: reverse
      ? pieces.map(({ from, to }) => ({ from: to, to: from }))
      : pieces,
    sound:
      !reverse && next.isGameOver()
        ? "end"
        : !reverse && next.isCheck()
          ? "check"
          : move.isKingsideCastle() || move.isQueensideCastle()
            ? "castle"
            : move.isCapture() || move.isEnPassant()
              ? "capture"
              : "move",
  };
}

export type Mark = { from: string; to: string; color: string };
export function isAllowedArrow(from: string, to: string): boolean {
  if (from.length !== 2 || to.length !== 2) return false;
  const dx = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const dy = Math.abs(Number(from[1]) - Number(to[1]));
  return (
    (dx === 0 && dy > 0) ||
    (dy === 0 && dx > 0) ||
    (dx === dy && dx > 0) ||
    (dx === 1 && dy === 2) ||
    (dx === 2 && dy === 1)
  );
}
export function toggleMark(marks: Mark[], mark: Mark): Mark[] {
  const same = (item: Mark) =>
    item.from === mark.from && item.to === mark.to && item.color === mark.color;
  return marks.some(same)
    ? marks.filter((item) => !same(item))
    : [...marks, mark];
}

export function annotationColor(keys: {
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}) {
  return keys.ctrlKey
    ? "#e45c59"
    : keys.altKey
      ? "#4596e8"
      : keys.shiftKey
        ? "#5ca66b"
        : "#efa62c";
}
