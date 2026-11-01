import { describe, expect, it } from "vitest";
import { emptyGame } from "./chess";
import {
  recentGameOutcome,
  recentGameScores,
  recentTimeControl,
} from "./recent-game";

describe("recent-game presentation", () => {
  const game = { ...emptyGame(), white: "Alice", black: "Bob", result: "1-0" };
  it("shows wins and losses from the saved player's side", () => {
    expect(recentGameOutcome(game, "alice")).toBe("win");
    expect(recentGameOutcome(game, "BOB")).toBe("loss");
    expect(recentGameOutcome({ ...game, result: "0-1" }, "bob")).toBe("win");
    expect(recentGameOutcome({ ...game, result: "1/2-1/2" }, "bob")).toBe(
      "draw",
    );
    expect(recentGameOutcome(game, "other")).toBeUndefined();
    expect(
      recentGameOutcome({ ...game, result: "*" }, "alice"),
    ).toBeUndefined();
  });
  it("aligns separate result scores with White and Black", () => {
    expect(recentGameScores("1-0")).toEqual(["1", "0"]);
    expect(recentGameScores("0-1")).toEqual(["0", "1"]);
    expect(recentGameScores("1/2-1/2")).toEqual(["½", "½"]);
  });
  it("displays the actual time control and increment", () => {
    expect(recentTimeControl("600")).toBe("10 min");
    expect(recentTimeControl("180+2")).toBe("3 min + 2s");
    expect(recentTimeControl("30")).toBe("30s");
    expect(recentTimeControl("1/86400")).toBe("1d");
    expect(recentTimeControl(undefined, "rapid")).toBe("rapid");
  });
});
