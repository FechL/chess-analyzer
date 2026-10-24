import { Chess } from "chess.js";
import { describe, expect, it, vi } from "vitest";
import { findPuzzleReply } from "./puzzle-reply";

describe("puzzle mistake demonstration", () => {
  it("asks for the reply to the mistaken position and keeps the exercise position intact", async () => {
    const exercise = new Chess();
    const original = exercise.fen();
    const mistaken = new Chess(original);
    mistaken.move("f3");
    const analyze = vi.fn(async () => ({ bestmove: "e7e5" }));
    const reply = await findPuzzleReply(mistaken.fen(), analyze);
    expect(analyze).toHaveBeenCalledWith(mistaken.fen());
    expect(reply).toMatchObject({ san: "e5", from: "e7", to: "e5" });
    const expected = new Chess();
    expected.move("f3");
    expected.move("e5");
    expect(reply?.fen).toBe(expected.fen());
    expect(exercise.fen()).toBe(original);
    expect(exercise.history()).toEqual([]);
  });

  it("demonstrates a mating reply with checkmate notation", async () => {
    const position = new Chess();
    ["f3", "e5", "g4"].forEach((move) => position.move(move));
    const reply = await findPuzzleReply(position.fen(), async () => ({
      bestmove: "d8h4",
    }));
    expect(reply?.san).toBe("Qh4#");
    expect(new Chess(reply!.fen).isCheckmate()).toBe(true);
  });

  it("does not invent a reply when the position has ended or the engine response is invalid", async () => {
    const position = new Chess();
    ["f3", "e5", "g4", "Qh4#"].forEach((move) => position.move(move));
    const analyze = vi.fn(async () => ({ bestmove: "a2a3" }));
    expect(await findPuzzleReply(position.fen(), analyze)).toBeUndefined();
    expect(analyze).not.toHaveBeenCalled();
    expect(await findPuzzleReply(new Chess().fen(), analyze)).toBeDefined();
    expect(
      await findPuzzleReply(new Chess().fen(), async () => ({
        bestmove: "e7e5",
      })),
    ).toBeUndefined();
    expect(
      await findPuzzleReply(new Chess().fen(), async () => ({
        bestmove: "(none)",
      })),
    ).toBeUndefined();
  });

  it("reports engine failures so the exercise can restore the original position", async () => {
    await expect(
      findPuzzleReply(new Chess().fen(), async () => {
        throw new Error("engine unavailable");
      }),
    ).rejects.toThrow("engine unavailable");
  });
});
