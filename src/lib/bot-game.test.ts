import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  BOT_LEVELS,
  botPermissions,
  capturedBy,
  chooseBotMove,
  DEFAULT_BOT_OPTIONS,
  elapseBotTime,
  finishBotTurn,
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

describe("bot move timing", () => {
  it("records each player's elapsed time and clock including increment", () => {
    const chess = new Chess();
    let session = {
      ...newBotSession(),
      started: true,
      control: { seconds: 300, increment: 2 },
    };
    session = elapseBotTime(session, "w", 3.25);
    chess.move("e4");
    session = finishBotTurn(session, chess, "w");
    expect(session.clocks).toEqual({ w: 298.75, b: 300 });
    expect(session.moveTimes).toEqual(["0:04:58.75"]);
    expect(session.moveDurations).toEqual([3.25]);
    session = elapseBotTime(session, "b", 1.5);
    chess.move("e5");
    session = finishBotTurn(session, chess, "b");
    expect(session.moveDurations).toEqual([3.25, 1.5]);
    expect(session.moveTimes).toEqual(["0:04:58.75", "0:05:00.5"]);
    const restored = restoreBotSession(JSON.parse(JSON.stringify(session)));
    expect(restored.moveDurations).toEqual(session.moveDurations);
    expect(restored.moveTimes).toEqual(session.moveTimes);
  });
  it("records elapsed time without running out of time in Unlimited", () => {
    const chess = new Chess();
    let session = {
      ...newBotSession(),
      started: true,
      control: { seconds: 0, increment: 0 },
      clocks: { w: 0, b: 0 },
    };
    session = elapseBotTime(session, "w", 90);
    chess.move("e4");
    session = finishBotTurn(session, chess, "w");
    expect(session.clocks).toEqual({ w: 0, b: 0 });
    expect(session.moveTimes).toEqual([""]);
    expect(session.moveDurations).toEqual([90]);
    expect(restoreBotSession(session).control.seconds).toBe(0);
    expect(timeControlLabel(session.control)).toBe("Unlimited");
  });
  it("keeps the historical board selected when the bot moves in No assistance", () => {
    const chess = new Chess();
    chess.move("e4");
    const session = {
      ...newBotSession(),
      started: true,
      mode: "none" as const,
      pgn: chess.pgn(),
      viewPly: 0,
      turnElapsed: 0.5,
    };
    chess.move("e5");
    const next = finishBotTurn(session, chess, "b");
    expect(next.viewPly).toBe(0);
    expect(next.paused).toBe(false);
    expect(restoreBotSession(next).paused).toBe(false);
  });
  it("excludes paused time from thinking time and clocks", () => {
    const session = {
      ...newBotSession(),
      started: true,
      paused: true,
      turnElapsed: 3,
    };
    expect(elapseBotTime(session, "w", 25)).toEqual(session);
  });
});

describe("clock expiry while completing a move", () => {
  it("does not rescue an expired clock with increment", () => {
    const chess = new Chess();
    chess.move("e4");
    const before = {
      ...newBotSession(),
      started: true,
      control: { seconds: 300, increment: 2 },
      clocks: { w: 0.03, b: 300 },
    };
    const expired = finishBotTurn(elapseBotTime(before, "w", 0.05), chess, "w");
    expect(expired.outcome).toBe("timeout-w");
    expect(expired.clocks.w).toBe(0);
    expect(expired.pgn).toBe(before.pgn);
    expect(expired.moveDurations).toEqual([]);
  });
});
