import { describe, expect, it } from "vitest";
import { emptyGame, parseGame, toPgn } from "./chess";
import { formatAnalysisClock, formatMoveDuration, moveDurations } from "./move-time";

describe("analysis player clocks", () => {
  it("hides fractions when at least one second remains", () => {
    expect(formatAnalysisClock("0:04:58.75")).toBe("0:04:58");
    expect(formatAnalysisClock("0:00:01.999")).toBe("0:00:01");
  });
  it("shows one decimal after a comma only below one second", () => {
    expect(formatAnalysisClock("0:00:00.765")).toBe("0:00:00,7");
    expect(formatAnalysisClock("0:00:00.999")).toBe("0:00:00,9");
    expect(formatAnalysisClock("0:00:00.04")).toBe("0:00:00,0");
    expect(formatAnalysisClock("0:00:00")).toBe("0:00:00");
  });
});

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

describe("saved game timing", () => {
  it("keeps both clocks and durations through PGN export and re-import", () => {
    const game = {
      ...parseGame("1. e4 e5 2. Nf3 *"),
      timeControl: "300+2",
      moveTimes: ["0:04:58.75", "0:05:00.5", "0:04:45"],
      moveDurations: [3.25, 1.5, 15.75],
    };
    const fromLibrary = JSON.parse(JSON.stringify(game));
    const restored = parseGame(toPgn(fromLibrary));
    expect(restored.moveTimes).toEqual(game.moveTimes);
    expect(restored.moveDurations).toEqual(game.moveDurations);
    expect(moveDurations(restored)).toEqual(game.moveDurations);
  });
  it("keeps thinking time for Unlimited games without inventing clocks", () => {
    const game = {
      ...parseGame("1. e4 e5 *"),
      timeControl: "-",
      moveDurations: [62.5, 0.45],
    };
    const restored = parseGame(toPgn(game));
    expect(restored.moveTimes).toBeUndefined();
    expect(moveDurations(restored)).toEqual([62.5, 0.45]);
  });
  it("uses explicit elapsed time when available and clock differences for other moves", () => {
    const game = parseGame(
      '[TimeControl "300+2"]\n\n1. e4 {[%clk 0:04:59] [%emt 0:00:03.25]} e5 {[%clk 0:04:58]} *',
    );
    expect(moveDurations(game)).toEqual([3.25, 4]);
  });
});
