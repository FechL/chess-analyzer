import { describe, expect, it } from "vitest";
import { emptyGame } from "./chess";
import { gameForUsername } from "./online-games";

describe("searched player's board perspective", () => {
  const game = { ...emptyGame(), white: "Alice", black: "Bob" };

  it("opens from Black's side for the searched Black player", () => {
    expect(gameForUsername(game, " bOB ").perspective).toBe("b");
    expect(game).not.toHaveProperty("perspective");
  });

  it("opens from White's side for the searched White player", () => {
    expect(
      gameForUsername({ ...game, perspective: "b" }, "ALICE").perspective,
    ).toBe("w");
  });

  it("defaults to White for an absent or unmatched username", () => {
    expect(gameForUsername(game, "").perspective).toBe("w");
    expect(gameForUsername(game, "Other").perspective).toBe("w");
  });
});
