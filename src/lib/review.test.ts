import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { annotate } from "./chess";
import type { Evaluation } from "./chess";
import { mergeReview, retainReview, reviewSegments } from "./review";
const evaluation = (fen: string, cp: number, bestmove = ""): Evaluation => ({
  fen,
  cp,
  bestmove,
  lines: [],
  depth: 12,
});
const game = () => {
  const chess = new Chess();
  const items = [];
  for (const [i, san] of ["e4", "e5", "Nf3", "Nc6", "Bc4"].entries()) {
    const move = chess.move(san);
    items.push(
      annotate(
        evaluation(move.before, i * 10),
        evaluation(move.after, (i + 1) * 10),
        move,
        i + 1,
      ),
    );
  }
  return { chess, items };
};
describe("incremental move review", () => {
  it("adds ratings in ply order and replaces a rating rather than duplicating it", () => {
    const { items } = game();
    let reviews = mergeReview([items[3]], items[1]);
    reviews = mergeReview(reviews, { ...items[1], accuracy: 88 });
    expect(reviews.map((r) => r.ply)).toEqual([2, 4]);
    expect(reviews[0].accuracy).toBe(88);
  });
  it("retains ratings only for the matching history when a player branches", () => {
    const { items } = game();
    const branch = new Chess();
    branch.move("e4");
    branch.move("c5");
    expect(
      retainReview(items, branch.history({ verbose: true })).map((r) => r.ply),
    ).toEqual([1]);
  });
  it("plots a partially reviewed game at its actual plies without bridging missing positions", () => {
    const { items } = game();
    const { values, segments } = reviewSegments([items[4], items[0]]);
    expect(segments.map((s) => s.map((point) => point.ply))).toEqual([
      [0, 1],
      [4, 5],
    ]);
    expect(values.has(2)).toBe(false);
    expect(values.get(5)).toBe(50);
  });
  it("gives the completed evaluation precedence at a shared boundary", () => {
    const { items } = game();
    const { values } = reviewSegments([
      items[0],
      { ...items[1], before: { ...items[1].before, cp: 999 } },
    ]);
    expect(values.get(1)).toBe(items[0].after.cp);
  });
});
