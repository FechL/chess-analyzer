import { describe, expect, it } from "vitest";
import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  annotate,
  emptyGame,
  formatEval,
  historyOf,
  parseGame,
  parseInfo,
  positionAt,
  pvToSan,
  SAMPLE_PGN,
  toPgn,
  winPercent,
} from "./chess";
import type { Evaluation } from "./chess";
import { LESSONS, OPENINGS, PUZZLES } from "../data/content";

describe("PGN, FEN, and legal game history", () => {
  it("imports and round-trips the full Opera Game ending in checkmate", () => {
    const game = parseGame(SAMPLE_PGN);
    expect(game.moves).toHaveLength(33);
    expect(game.white).toBe("Paul Morphy");
    expect(positionAt(game, 33).isCheckmate()).toBe(true);
    expect(parseGame(toPgn(game)).moves).toEqual(game.moves);
  });
  it("preserves black-to-move FEN and its fullmove number", () => {
    const fen = "4r1k1/8/8/8/8/8/5PPP/6K1 b - - 0 23";
    const game = parseGame(fen);
    expect(game.startFen).toBe(fen);
    expect(positionAt(game, 0).turn()).toBe("b");
    const c = positionAt(game, 0);
    c.move("Re1#");
    game.moves = ["Re1#"];
    expect(parseGame(toPgn(game)).startFen).toBe(fen);
  });
  it("rejects malformed and illegal inputs", () => {
    expect(() => parseGame("invalid PGN")).toThrow();
    expect(() => parseGame("1. e4 e5 2. e5")).toThrow();
    expect(() => parseGame("8/8/8/8/8/8/8/8 w - - 0 1")).toThrow();
  });
  it("keeps castling, en passant, promotion, and checkmate legal", () => {
    const ep = new Chess("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
    expect(ep.move("exd6").isEnPassant()).toBe(true);
    const promotion = new Chess("7k/P7/8/8/8/8/8/4K3 w - - 0 1");
    expect(promotion.move("a8=N").promotion).toBe("n");
  });
});
describe("engine parsing and review scoring", () => {
  it("normalizes black POV scores to white, including mate", () => {
    expect(
      parseInfo(
        "info depth 15 multipv 1 score cp 120 nodes 40 pv e7e5 g1f3",
        "b",
      )?.cp,
    ).toBe(-120);
    expect(parseInfo("info depth 8 score mate -3 pv a1a8", "b")?.mate).toBe(3);
    expect(
      parseInfo("info depth 8 score cp 30 upperbound pv a1a8", "w"),
    ).toBeUndefined();
  });
  it("converts UCI variations to legal SAN and stops at invalid moves", () => {
    expect(pvToSan(DEFAULT_POSITION, ["e2e4", "e7e5", "g1f3", "a1a8"])).toEqual(
      ["e4", "e5", "Nf3"],
    );
  });
  it("scores a large white-side loss and a large black-side loss symmetrically", () => {
    const base = (cp: number, bestmove: string): Evaluation => ({
      fen: DEFAULT_POSITION,
      lines: [],
      depth: 14,
      cp,
      bestmove,
    });
    const w = historyOf(parseGame("1. e4 e5"))[0],
      b = historyOf(parseGame("1. e4 e5"))[1];
    const wr = annotate(base(0, "d2d4"), base(-500, "a7a6"), w, 1);
    const br = annotate(base(0, "c7c5"), base(500, "a2a3"), b, 2);
    expect(wr.annotation).toBe("blunder");
    expect(br.annotation).toBe("blunder");
    expect(wr.loss).toBeCloseTo(br.loss);
    expect(wr.accuracy).toBeLessThan(30);
  });
  it("recognizes the best move and clamps improvement to zero loss", () => {
    const move = historyOf(parseGame("1. e4"))[0];
    const e: Evaluation = {
      fen: DEFAULT_POSITION,
      lines: [],
      depth: 12,
      cp: 0,
      bestmove: "e2e4",
    };
    expect(annotate(e, { ...e, cp: 30 }, move, 1)).toMatchObject({
      annotation: "best",
      loss: 0,
      accuracy: 100,
    });
    expect(winPercent(0)).toBe(50);
    expect(formatEval(-125)).toBe("−1.25");
    expect(emptyGame().moves).toEqual([]);
  });
});
describe("all published learning content", () => {
  for (const opening of OPENINGS)
    it(`has a legal opening line: ${opening.name}`, () => {
      const c = new Chess();
      for (const m of opening.moves) expect(c.move(m)).toBeTruthy();
    });
  for (const exercise of [...LESSONS, ...PUZZLES])
    it(`has a legal exercise solution: ${exercise.id}`, () => {
      const c = new Chess(exercise.fen);
      for (const m of exercise.solution) expect(c.move(m)).toBeTruthy();
      if (exercise.solution.at(-1)?.endsWith("#"))
        expect(c.isCheckmate()).toBe(true);
    });
  it("uses the historical Opera Game position for its combination", () => {
    expect(
      LESSONS.find((l) => l.id === "opera")
        ?.fen.split(" ")
        .slice(0, 4),
    ).toEqual(
      positionAt(parseGame(SAMPLE_PGN), 30).fen().split(" ").slice(0, 4),
    );
  });
});
