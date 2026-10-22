import { Chess } from "chess.js";
import type { Color, PieceSymbol, Square } from "chess.js";

export const MAX_PREMOVES = 5;
export type Premove = {
  from: Square;
  to: Square;
  piece: PieceSymbol;
  promotion?: string;
};
const square = (x: number, y: number) =>
  (String.fromCharCode(97 + x) + (y + 1)) as Square;
const validSquare = (value: string): value is Square =>
  /^[a-h][1-8]$/.test(value);

// Future intent: allow conditional captures and ignore check until execution.
export function premoveTargets(
  chess: Chess,
  from: string,
  color: Color,
): Square[] {
  if (!validSquare(from)) return [];
  const piece = chess.get(from);
  if (!piece || piece.color !== color) return [];
  const x = from.charCodeAt(0) - 97,
    y = Number(from[1]) - 1;
  const targets: Square[] = [];
  const add = (a: number, b: number) => {
    if (a < 0 || a > 7 || b < 0 || b > 7) return;
    const to = square(a, b);
    if (chess.get(to)?.type !== "k") targets.push(to);
  };
  if (piece.type === "p") {
    const d = color === "w" ? 1 : -1;
    if (y + d >= 0 && y + d <= 7 && !chess.get(square(x, y + d))) {
      add(x, y + d);
      if (y === (color === "w" ? 1 : 6) && !chess.get(square(x, y + d * 2)))
        add(x, y + d * 2);
    }
    add(x - 1, y + d);
    add(x + 1, y + d);
  } else if (piece.type === "n") {
    for (const [a, b] of [
      [1, 2],
      [2, 1],
      [-1, 2],
      [-2, 1],
      [1, -2],
      [2, -1],
      [-1, -2],
      [-2, -1],
    ])
      add(x + a, y + b);
  } else if (piece.type === "k") {
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) if (a || b) add(x + a, y + b);
    const rank = color === "w" ? "1" : "8";
    const rights = chess.fen().split(" ")[2];
    if (from === "e" + rank) {
      for (const [right, rook, path, to] of [
        [color === "w" ? "K" : "k", "h", "fg", "g"],
        [color === "w" ? "Q" : "q", "a", "bcd", "c"],
      ]) {
        const r = chess.get((rook + rank) as Square);
        if (
          rights.includes(right) &&
          r?.color === color &&
          r.type === "r" &&
          [...path].every((file) => !chess.get((file + rank) as Square))
        )
          targets.push((to + rank) as Square);
      }
    }
  } else {
    const directions =
      piece.type === "b"
        ? [
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
          ]
        : piece.type === "r"
          ? [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]
          : [
              [1, 1],
              [-1, 1],
              [1, -1],
              [-1, -1],
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ];
    for (const [a, b] of directions) {
      for (let step = 1; step <= 7; step++) {
        const nx = x + a * step,
          ny = y + b * step;
        if (nx < 0 || nx > 7 || ny < 0 || ny > 7) break;
        add(nx, ny);
        if (chess.get(square(nx, ny))) break;
      }
    }
  }
  return targets;
}

// A visual projection only; never submit this position to the engine or history.
export function projectPremoves(
  fen: string,
  moves: Premove[],
  color: Color,
): Chess {
  const preview = new Chess(fen);
  for (const move of moves) {
    const piece = preview.get(move.from);
    if (
      piece?.color !== color ||
      piece.type !== move.piece ||
      !premoveTargets(preview, move.from, color).includes(move.to)
    )
      break;
    preview.remove(move.from);
    preview.remove(move.to);
    preview.put(
      { color, type: (move.promotion as PieceSymbol) || piece.type },
      move.to,
    );
    if (
      piece.type === "k" &&
      Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) === 2
    ) {
      const rank = move.from[1];
      const kingSide = move.to[0] === "g";
      const rook = preview.remove(((kingSide ? "h" : "a") + rank) as Square);
      if (rook) preview.put(rook, ((kingSide ? "f" : "d") + rank) as Square);
    }
  }
  return preview;
}

export function appendPremove(
  fen: string,
  moves: Premove[],
  color: Color,
  from: string,
  to: string,
  promotion = "q",
): Premove[] | undefined {
  if (moves.length >= MAX_PREMOVES || !validSquare(from) || !validSquare(to))
    return;
  const preview = projectPremoves(fen, moves, color);
  const piece = preview.get(from);
  if (
    piece?.color !== color ||
    !premoveTargets(preview, from, color).includes(to)
  )
    return;
  const promotes = piece.type === "p" && to[1] === (color === "w" ? "8" : "1");
  if (promotes && !["q", "r", "b", "n"].includes(promotion)) return;
  return [
    ...moves,
    { from, to, piece: piece.type, ...(promotes ? { promotion } : {}) },
  ];
}

export function executePremove(
  chess: Chess,
  move: Premove,
  color: Color,
): boolean {
  const piece = chess.get(move.from);
  if (
    chess.turn() !== color ||
    chess.isGameOver() ||
    piece?.color !== color ||
    piece.type !== move.piece
  )
    return false;
  try {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    return true;
  } catch {
    return false;
  }
}
