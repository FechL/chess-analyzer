import { describe, expect, it } from "vitest";
import { emptyGame, parseGame } from "./chess";
import { formatMoveDuration, moveDurations } from "./move-time";

describe("thinking time per move", () => {
  it("uses each player's own clock and includes the increment", () => {
    const game = parseGame(
      '[TimeControl "300+2"]\n\n1. e4 {[%clk 0:04:59]} e5 {[%clk 0:04:58]} 2. Nf3 {[%clk 0:03:59]} Nc6 {[%clk 0:04:20]} *',
    );
    expect(moveDurations(game)).toEqual([3, 4, 62, 40]);
    expect(formatMoveDuration(62)).toBe("1m 2s");
    expect(formatMoveDuration(38)).toBe("38s");
  });
  it("keeps clocks aligned when a PGN move has no clock annotation", () => {
    const game = parseGame(
      '[TimeControl "300+2"]\n\n1. e4 e5 {[%clk 0:04:58]} 2. Nf3 {[%clk 0:04:30]} *',
    );
    expect(game.moveTimes).toEqual(["", "0:04:58", "0:04:30"]);
    expect(moveDurations(game)).toEqual([undefined, 4, undefined]);
  });
  it("does not invent the first duration without a known starting clock", () => {
    const game = {
      ...emptyGame(),
      moves: ["e4", "e5", "Nf3"],
      moveTimes: ["0:05:00", "0:04:00", "0:04:22"],
    };
    expect(moveDurations(game)).toEqual([undefined, undefined, 38]);
  });
});
