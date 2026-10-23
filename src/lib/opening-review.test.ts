import { describe, expect, it } from "vitest";
import {
  reviewCandidates,
  reviewInitialTimeMs,
  reviewModeKey,
  reviewTimeBonusMs,
  shuffleReviewLines,
} from "./opening-review";
import { recordOpeningAttempt } from "./opening-training";
import type { OpeningLine, OpeningProgress } from "./opening-training";

const lines: OpeningLine[] = [
  { id: "a", eco: "C50", name: "A", moves: ["e4", "e5", "Nf3", "Nc6"] },
  { id: "b", eco: "C50", name: "B", moves: ["e4", "e5"] },
  { id: "c", eco: "C50", name: "C", moves: ["e4", "e5", "Bc4"] },
];

describe("opening review test", () => {
  it("uses only lines learned and practiced perfectly, including after a later retry", () => {
    const learned = recordOpeningAttempt(undefined, "learn", 0, 0, 1_000);
    const perfect = recordOpeningAttempt(learned, "practice", 0, 0, 2_000);
    const retried = recordOpeningAttempt(perfect, "practice", 1, 0, 3_000);
    const imperfect = recordOpeningAttempt(learned, "practice", 1, 0, 2_000);
    const progress: OpeningProgress = {
      a: retried,
      b: imperfect,
      c: learned,
    };
    expect(retried.completed?.practice).toEqual({ mistakes: 0, hints: 0 });
    expect(reviewCandidates(lines, progress).map((line) => line.id)).toEqual([
      "a",
    ]);
  });

  it("gives one second per move initially and half a second per completed move", () => {
    expect(reviewInitialTimeMs(lines)).toBe(9_000);
    expect(reviewTimeBonusMs(lines[2])).toBe(1_500);
  });

  it("shuffles every eligible challenge exactly once and separates mode records", () => {
    const queue = shuffleReviewLines(lines);
    expect(queue).toHaveLength(lines.length);
    expect(new Set(queue)).toEqual(new Set(lines.map((line) => line.id)));
    expect(reviewModeKey({ lives: false, timer: true })).toBe("0-1");
    expect(reviewModeKey({ lives: true, timer: true })).toBe("1-1");
  });
});
