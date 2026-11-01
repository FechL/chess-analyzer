import { describe, expect, it } from "vitest";
import { emptyGame } from "./chess";
import { mainlineReturnPly } from "./variation-navigation";

describe("return to original notation", () => {
  const game = {
    ...emptyGame(),
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"],
    variations: [
      { id: "root", forkPly: 2, moves: ["e4", "e5", "Bc4"] },
      {
        id: "child",
        parentId: "root",
        forkPly: 3,
        moves: ["e4", "e5", "Bc4", "Bc5"],
      },
    ],
  };
  it("returns to the fork rather than the end of the game", () => {
    expect(mainlineReturnPly(game, game.variations[0])).toBe(2);
  });
  it("finds the main-line fork through nested variations", () => {
    expect(mainlineReturnPly(game, game.variations[1])).toBe(2);
  });
  it("supports a variation from the initial position", () => {
    expect(
      mainlineReturnPly(game, { id: "start", forkPly: 0, moves: ["d4"] }),
    ).toBe(0);
  });
});
