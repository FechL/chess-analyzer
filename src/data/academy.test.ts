import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { LESSONS, PUZZLES } from "./content";
import { ACADEMY_LESSONS, ACADEMY_MODULES, ACADEMY_ENGLISH } from "./academy";

describe("academy curriculum", () => {
  it("preserves existing lesson IDs and provides seven populated learning paths", () => {
    expect(LESSONS).toHaveLength(40);
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(
      LESSONS.length,
    );
    for (const id of [
      "center",
      "development",
      "castling",
      "fork",
      "pin",
      "backrank",
      "promotion",
      "en-passant",
      "opera",
    ])
      expect(LESSONS.some((lesson) => lesson.id === id)).toBe(true);
    for (const module of ACADEMY_MODULES)
      expect(
        LESSONS.filter((lesson) => lesson.category === module.category).length,
      ).toBeGreaterThan(0);
  });
  it("starts with both pawn lessons and places the rook immediately after the knight", () => {
    expect(LESSONS.slice(0, 2).map((lesson) => lesson.id)).toEqual([
      "pawn-first-step",
      "pawn-capture",
    ]);
    const knightIndex = LESSONS.findIndex(
      (lesson) => lesson.id === "knight-jumps",
    );
    expect(LESSONS[knightIndex + 1].id).toBe("rook-routes");
  });
  it.each(LESSONS)(
    "has a legal, canonical training line ending with the learner: $id",
    (lesson) => {
      const chess = new Chess(lesson.fen);
      const side = chess.turn();
      const opponent = side === "w" ? "b" : "w";
      const king = chess.findPiece({ color: opponent, type: "k" })[0];
      expect(chess.isAttacked(king, side)).toBe(false);
      for (const san of lesson.solution) {
        const move = chess.move(san);
        expect(move.san).toBe(san);
      }
      expect(chess.turn()).not.toBe(side);
      if (lesson.solution.at(-1)?.endsWith("#"))
        expect(chess.isCheckmate()).toBe(true);
    },
  );
  it("avoids stalemate through the taught rook underpromotion", () => {
    const lesson = LESSONS.find((lesson) => lesson.id === "avoid-stalemate")!;
    const queen = new Chess(lesson.fen);
    queen.move("c8=Q");
    expect(queen.isStalemate()).toBe(true);
    const rook = new Chess(lesson.fen);
    rook.move("c8=R");
    expect(rook.isGameOver()).toBe(false);
  });
  it("keeps both languages complete for every new lesson", () => {
    for (const lesson of ACADEMY_LESSONS) {
      expect(lesson.theory.length).toBeGreaterThanOrEqual(3);
      for (const text of [
        lesson.title,
        lesson.description,
        lesson.hint,
        lesson.explanation,
        ...lesson.theory,
      ])
        expect(ACADEMY_ENGLISH[text]?.length).toBeGreaterThan(0);
    }
  });
  it("does not change legacy sample puzzles when lessons are reordered", () => {
    expect(PUZZLES.find((p) => p.id === "p-backrank")?.solution).toEqual([
      "Re8#",
    ]);
    expect(PUZZLES.find((p) => p.id === "p-fork")?.solution).toEqual(["Nc7+"]);
    expect(PUZZLES.find((p) => p.id === "p-opera")?.solution).toEqual([
      "Qb8+",
      "Nxb8",
      "Rd8#",
    ]);
  });
});
