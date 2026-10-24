import { Chess } from "chess.js";

export type PuzzleReply = {
  fen: string;
  san: string;
  from: string;
  to: string;
};

export async function findPuzzleReply(
  fen: string,
  analyze: (fen: string) => Promise<{ bestmove: string }>,
): Promise<PuzzleReply | undefined> {
  const position = new Chess(fen);
  if (position.isGameOver()) return;
  const { bestmove } = await analyze(fen);
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestmove)) return;
  try {
    const move = position.move({
      from: bestmove.slice(0, 2),
      to: bestmove.slice(2, 4),
      promotion: bestmove[4],
    });
    return { fen: position.fen(), san: move.san, from: move.from, to: move.to };
  } catch {
    // Never demonstrate an engine response that is illegal in this position.
    return;
  }
}
