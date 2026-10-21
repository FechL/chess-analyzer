import { describe, expect, it } from "vitest";
import { Chess, DEFAULT_POSITION } from "chess.js";
import { findBookMove } from "./opening-book";

describe("offline opening book", () => {
  it("recognizes opening moves before engine review", () => {
    expect(findBookMove(DEFAULT_POSITION, "e2e4")).toBeDefined();
    const chess = new Chess();
    for (const san of ["e4", "e5", "Nf3"]) chess.move(san);
    expect(findBookMove(chess.fen(), "d7d6")?.name).toContain("Philidor");
  });
  it("ignores FEN counters while preserving position and turn", () => {
    expect(
      findBookMove(DEFAULT_POSITION.replace("0 1", "42 50"), "e2e4"),
    ).toEqual(findBookMove(DEFAULT_POSITION, "e2e4"));
    expect(
      findBookMove(DEFAULT_POSITION.replace(" w ", " b "), "e2e4"),
    ).toBeUndefined();
    expect(
      findBookMove(DEFAULT_POSITION.replace("KQkq", "-"), "e2e4"),
    ).toBeUndefined();
  });
  it("recognizes a transposed position and a continuation from imported FEN", () => {
    const a = new Chess();
    const b = new Chess();
    for (const san of ["d4", "d5", "Nf3", "Nf6"]) a.move(san);
    for (const san of ["Nf3", "Nf6", "d4", "d5"]) b.move(san);
    expect(findBookMove(a.fen(), "c1f4")).toBeDefined();
    expect(findBookMove(b.fen(), "c1f4")).toEqual(
      findBookMove(a.fen(), "c1f4"),
    );
  });
  it("does not mark a move as book only because its SAN is common", () => {
    const chess = new Chess("7k/8/8/8/8/8/4P3/K7 w - - 0 1");
    expect(findBookMove(chess.fen(), "e2e4")).toBeUndefined();
  });
});
