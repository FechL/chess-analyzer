import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  annotationColor,
  boardTransition,
  isAllowedArrow,
  toggleMark,
} from "./board-effects";

describe("board feedback for legal position changes", () => {
  it("animates forward and backward without depending on a PGN history", () => {
    const chess = new Chess();
    const before = chess.fen();
    chess.move("e4");
    expect(boardTransition(before, chess.fen())).toEqual({
      pieces: [{ from: "e2", to: "e4" }],
      sound: "move",
    });
    expect(boardTransition(chess.fen(), before)?.pieces).toEqual([
      { from: "e4", to: "e2" },
    ]);
  });
  it("moves both king and rook during castling and undo", () => {
    const chess = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const before = chess.fen();
    chess.move("O-O");
    expect(boardTransition(before, chess.fen())).toEqual({
      pieces: [
        { from: "e1", to: "g1" },
        { from: "h1", to: "f1" },
      ],
      sound: "castle",
    });
    expect(boardTransition(chess.fen(), before)?.pieces).toContainEqual({
      from: "f1",
      to: "h1",
    });
  });
  it("recognizes en passant as a capture", () => {
    const chess = new Chess();
    for (const move of ["e4", "a6", "e5", "d5"]) chess.move(move);
    const before = chess.fen();
    chess.move("exd6");
    expect(boardTransition(before, chess.fen())?.sound).toBe("capture");
  });
  it("recognizes promotion and check", () => {
    const chess = new Chess("7k/P7/8/8/8/8/8/K7 w - - 0 1");
    const before = chess.fen();
    chess.move("a8=Q+");
    expect(boardTransition(before, chess.fen())).toEqual({
      pieces: [{ from: "a7", to: "a8" }],
      sound: "check",
    });
  });
  it("uses the ending cue for checkmate", () => {
    const chess = new Chess();
    for (const move of ["f3", "e5", "g4"]) chess.move(move);
    const before = chess.fen();
    chess.move("Qh4#");
    expect(boardTransition(before, chess.fen())?.sound).toBe("end");
  });
  it("ignores unchanged positions and multi-move jumps", () => {
    const chess = new Chess();
    const before = chess.fen();
    expect(boardTransition(before, before)).toBeUndefined();
    chess.move("e4");
    chess.move("e5");
    expect(boardTransition(before, chess.fen())).toBeUndefined();
  });
});
describe("board annotation toggles", () => {
  it("toggles the exact mark while preserving other arrows and colors", () => {
    const mark = { from: "e2", to: "e4", color: "orange" };
    const other = { ...mark, color: "green" };
    expect(toggleMark(toggleMark([], mark), other)).toEqual([mark, other]);
    expect(toggleMark([mark, other], mark)).toEqual([other]);
    expect(toggleMark([], { ...mark, to: "e2" })).toHaveLength(1);
  });
  it("offers distinct annotation colors with modifier keys", () => {
    const keys = { shiftKey: false, ctrlKey: false, altKey: false };
    expect(
      new Set([
        annotationColor(keys),
        annotationColor({ ...keys, shiftKey: true }),
        annotationColor({ ...keys, ctrlKey: true }),
        annotationColor({ ...keys, altKey: true }),
      ]).size,
    ).toBe(4);
  });
});

describe("allowed annotation arrows", () => {
  it("allows horizontal, vertical, and knight-shaped arrows only", () => {
    for (const [from, to] of [
      ["a1", "h1"],
      ["d2", "d8"],
      ["b1", "c3"],
      ["g8", "e7"],
    ]) {
      expect(isAllowedArrow(from, to)).toBe(true);
    }
    for (const [from, to] of [
      ["a1", "a1"],
      ["a1", "b2"],
      ["a1", "c4"],
      ["b1", "d3"],
    ]) {
      expect(isAllowedArrow(from, to)).toBe(false);
    }
  });
});
