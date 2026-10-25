import { describe, expect, it } from "vitest";
import { consistentRepertoire } from "../../scripts/lib/opening-repertoire";

const line = (id: string, moves: string, intro = false) => ({
  id,
  moves: moves.split(" "),
  intro,
});

describe("consistent opening repertoire", () => {
  it("prefers the longer challenge and preserves the original publication order", () => {
    const short = line("short", "d4 d5 Bf4");
    const opponent = line("opponent", "d4 Nf6 Bf4");
    const long = line("long", "d4 d5 Nf3 Nf6 e3");
    const result = consistentRepertoire([short, opponent, long], "w");
    expect(result.lines).toEqual([opponent, long]);
    expect(result.conflicts[0]).toMatchObject({
      id: "short",
      ply: 3,
      san: "Bf4",
      retainedSan: "Nf3",
      retainedLineId: "long",
    });
  });

  it("protects the introductory setup and breaks equal-length ties by course order", () => {
    const intro = line("intro", "d4", true);
    const first = line("first", "d4 d5 Nf3");
    const second = line("second", "d4 d5 Bf4");
    const unrelated = line("other", "e4 e5 Nf3 Nc6 Bb5");
    expect(
      consistentRepertoire([intro, first, second, unrelated], "w").lines,
    ).toEqual([intro, first]);
  });

  it("recognizes transpositions and does not reserve moves from rejected lines", () => {
    const long = line("long", "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4");
    const transposition = line("conflict", "e4 d5 d4 e6 Nd2");
    const alternative = line("opponent-branch", "e4 d5 Nc3");
    const result = consistentRepertoire(
      [long, transposition, alternative],
      "w",
    );
    expect(result.lines).toEqual([long, alternative]);
    expect(result.conflicts[0]).toMatchObject({
      id: "conflict",
      ply: 5,
      retainedSan: "Nc3",
      retainedLineId: "long",
    });
  });

  it("compares Black's choices without treating White alternatives as conflicts", () => {
    const first = line("first", "e4 c5 Nf3 d6 d4 cxd4");
    const opponent = line("opponent", "e4 c5 Nc3 Nc6");
    const conflict = line("conflict", "e4 c5 Nf3 Nc6");
    expect(
      consistentRepertoire([conflict, opponent, first], "b").lines,
    ).toEqual([opponent, first]);
  });
});
