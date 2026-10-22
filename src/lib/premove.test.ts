import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  appendPremove,
  executePremove,
  MAX_PREMOVES,
  premoveTargets,
  projectPremoves,
} from "./premove";
import type { Premove } from "./premove";

describe("premove queue", () => {
  it("projects five dependent moves without changing the real position or notation", () => {
    const chess = new Chess();
    chess.move("e4");
    const fen = chess.fen();
    let queue: Premove[] = [];
    for (const [from, to] of [
      ["g1", "f3"],
      ["f3", "g5"],
      ["g5", "f3"],
      ["f3", "g1"],
      ["g1", "f3"],
    ]) {
      queue = appendPremove(fen, queue, "w", from, to)!;
    }
    expect(queue).toHaveLength(MAX_PREMOVES);
    expect(appendPremove(fen, queue, "w", "f3", "g5")).toBeUndefined();
    expect(projectPremoves(fen, queue, "w").get("f3")).toEqual({
      type: "n",
      color: "w",
    });
    expect(chess.fen()).toBe(fen);
    expect(chess.history()).toEqual(["e4"]);
  });

  it("runs one queued move per human turn, never two consecutive human moves", () => {
    const chess = new Chess();
    chess.move("e4");
    let queue = appendPremove(chess.fen(), [], "w", "g1", "f3")!;
    queue = appendPremove(chess.fen(), queue, "w", "f3", "g5")!;
    expect(executePremove(chess, queue[0], "w")).toBe(false);
    chess.move("e5");
    expect(executePremove(chess, queue[0], "w")).toBe(true);
    expect(executePremove(chess, queue[1], "w")).toBe(false);
    chess.move("Nc6");
    expect(executePremove(chess, queue[1], "w")).toBe(true);
    expect(chess.history()).toEqual(["e4", "e5", "Nf3", "Nc6", "Ng5"]);
  });

  it("permits conditional pawn captures but rejects them at execution if no capture appeared", () => {
    const chess = new Chess();
    chess.move("e4");
    const move = appendPremove(chess.fen(), [], "w", "e4", "d5")![0];
    const expected = new Chess(chess.fen());
    expected.move("d5");
    expect(executePremove(expected, move, "w")).toBe(true);
    chess.move("a6");
    const before = chess.fen();
    expect(executePremove(chess, move, "w")).toBe(false);
    expect(chess.fen()).toBe(before);
  });

  it("supports preparing a recapture on a square currently occupied by a friendly piece", () => {
    const chess = new Chess("4k3/8/8/2p5/3P4/5N2/8/4K3 b - - 0 1");
    const move = appendPremove(chess.fen(), [], "w", "f3", "d4")![0];
    chess.move("cxd4");
    expect(executePremove(chess, move, "w")).toBe(true);
    expect(chess.get("d4")).toEqual({ type: "n", color: "w" });
  });

  it("rejects a premove that leaves the king in check and preserves the position", () => {
    const chess = new Chess("4k3/8/8/8/8/8/P7/4K2r w - - 0 1");
    const move = appendPremove(chess.fen(), [], "w", "a2", "a3")![0];
    const fen = chess.fen();
    expect(executePremove(chess, move, "w")).toBe(false);
    expect(chess.fen()).toBe(fen);
  });

  it("projects and executes king-side castling with the rook", () => {
    const chess = new Chess("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1");
    const queue = appendPremove(chess.fen(), [], "w", "e1", "g1")!;
    const preview = projectPremoves(chess.fen(), queue, "w");
    expect(preview.get("g1")?.type).toBe("k");
    expect(preview.get("f1")?.type).toBe("r");
    expect(chess.get("h1")?.type).toBe("r");
    chess.move("Ra7");
    expect(executePremove(chess, queue[0], "w")).toBe(true);
    expect(chess.get("f1")?.type).toBe("r");
  });

  it("supports black queen-side castling and the flipped side", () => {
    const chess = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const queue = appendPremove(chess.fen(), [], "b", "e8", "c8")!;
    const preview = projectPremoves(chess.fen(), queue, "b");
    expect(preview.get("c8")?.type).toBe("k");
    expect(preview.get("d8")?.type).toBe("r");
    chess.move("Ra2");
    expect(executePremove(chess, queue[0], "b")).toBe(true);
  });

  it("preserves a chosen underpromotion in the preview and the real move", () => {
    const chess = new Chess("7k/P7/8/8/8/8/8/4K3 b - - 0 1");
    const queue = appendPremove(chess.fen(), [], "w", "a7", "a8", "n")!;
    expect(projectPremoves(chess.fen(), queue, "w").get("a8")?.type).toBe("n");
    chess.move("Kh7");
    expect(executePremove(chess, queue[0], "w")).toBe(true);
    expect(chess.get("a8")?.type).toBe("n");
  });

  it("ignores wrong colors and blocked or malformed moves, and never projects a captured king", () => {
    const chess = new Chess();
    expect(appendPremove(chess.fen(), [], "w", "e7", "e5")).toBeUndefined();
    expect(appendPremove(chess.fen(), [], "w", "a1", "a5")).toBeUndefined();
    expect(appendPremove(chess.fen(), [], "w", "?", "e4")).toBeUndefined();
    const kings = new Chess("4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1");
    expect(premoveTargets(kings, "e2", "w")).not.toContain("e8");
  });
});
