import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  BOT_LEVELS,
  botPermissions,
  capturedBy,
  chooseBotMove,
  DEFAULT_BOT_OPTIONS,
  newBotSession,
  restoreBotSession,
  threatenedSquares,
  timeControlLabel,
} from "./bot-game";

describe("persistent bot sessions", () => {
  it("restores the complete game and both clocks in a paused state", () => {
    const chess = new Chess();
    for (const move of ["e4", "e5", "Nf3", "Nc6"]) chess.move(move);
    const saved = {
      ...newBotSession(),
      pgn: chess.pgn(),
      started: true,
      human: "b" as const,
      side: "b" as const,
      control: { seconds: 180, increment: 2 },
      clocks: { w: 173.4, b: 169.2 },
    };
    const restored = restoreBotSession(saved);
    expect(restored.pgn).toBe(saved.pgn);
    expect(restored.clocks).toEqual(saved.clocks);
    expect(restored.human).toBe("b");
    expect(restored.control).toEqual(saved.control);
    expect(restored.paused).toBe(true);
  });
  it("falls back safely for corrupted sessions and invalid clocks", () => {
    expect(restoreBotSession(null).started).toBe(false);
    expect(
      restoreBotSession({ ...newBotSession(), pgn: "invalid" }).started,
    ).toBe(false);
    expect(
      restoreBotSession({ ...newBotSession(), clocks: { w: -1, b: 300 } })
        .clocks.w,
    ).toBe(300);
  });
  it("defaults all assistance switches off independently of analysis settings", () => {
    expect(DEFAULT_BOT_OPTIONS).toMatchObject({
      liveEngine: false,
      showArrows: false,
      showCategories: false,
      showThreats: false,
    });
  });
});
describe("bot assistance permissions", () => {
  it.each([
    ["none", { hint: false, undo: false, engine: false }],
    ["assisted", { hint: true, undo: true, engine: false }],
    ["full", { hint: true, undo: true, engine: true }],
  ] as const)("enforces permissions for %s mode", (mode, expected) => {
    expect(botPermissions(mode)).toEqual(expected);
  });
  it("preserves the mode on restore and migrates older sessions to assisted", () => {
    expect(restoreBotSession({ ...newBotSession(), mode: "none" }).mode).toBe(
      "none",
    );
    expect(restoreBotSession({ ...newBotSession(), mode: "full" }).mode).toBe(
      "full",
    );
    expect(
      restoreBotSession({ ...newBotSession(), mode: undefined }).mode,
    ).toBe("assisted");
  });
});
describe("training bot levels", () => {
  it("uses beginner move choices for Nara instead of always returning Stockfish's best move", () => {
    const chess = new Chess();
    expect(BOT_LEVELS[0].elo).toBe(600);
    const chosen = chooseBotMove(chess, "e2e4", 0, () => 0);
    expect(chosen).not.toBe("e2e4");
    expect(
      chess
        .moves({ verbose: true })
        .some((move) => move.from + move.to === chosen),
    ).toBe(true);
  });
  it("preserves the strongest preset's legal engine choice and never mutates the position", () => {
    const chess = new Chess();
    const fen = chess.fen();
    expect(chooseBotMove(chess, "e2e4", 3, () => 0.9)).toBe("e2e4");
    expect(chess.fen()).toBe(fen);
  });
});
describe("bot assistance and material", () => {
  it("includes empty attacked squares for the opposite color", () => {
    const chess = new Chess();
    expect(threatenedSquares(chess, "w")).toContain("e6");
    expect(threatenedSquares(chess, "b")).toContain("e3");
    expect(threatenedSquares(chess, "w")).not.toContain("e4");
  });
  it("tracks captured pieces for each player, including en passant", () => {
    const chess = new Chess();
    for (const move of ["e4", "a6", "e5", "d5", "exd6"]) chess.move(move);
    expect(capturedBy(chess, "w")).toEqual(["p"]);
    expect(capturedBy(chess, "b")).toEqual([]);
  });
  it("formats simple controls and controls with increments", () => {
    expect(timeControlLabel({ seconds: 180, increment: 0 })).toBe("3m");
    expect(timeControlLabel({ seconds: 180, increment: 2 })).toBe("3+2");
  });
});
