import { describe, expect, it } from "vitest";
import { OPENINGS } from "../data/content";
import {
  dueOpeningLines,
  isOpeningLineUnlocked,
  nextOpeningLine,
  openingLines,
  recordOpeningAttempt,
} from "./opening-training";

describe("opening repetition schedules", () => {
  it("keeps completed Learn and Practice outcomes independently across attempts", () => {
    const learned = recordOpeningAttempt(undefined, "learn", 1, 2, 1_000);
    const practiced = recordOpeningAttempt(learned, "practice", 0, 0, 2_000);
    expect(practiced.completed).toEqual({
      learn: { mistakes: 1, hints: 2 },
      practice: { mistakes: 0, hints: 0 },
    });
    const relearned = recordOpeningAttempt(practiced, "learn", 0, 1, 3_000);
    expect(relearned.completed?.practice).toEqual({ mistakes: 0, hints: 0 });
    expect(relearned.dueAt).toBe(practiced.dueAt);
    const reviewed = recordOpeningAttempt(relearned, "review", 0, 0, 4_000);
    expect(reviewed.completed).toEqual(relearned.completed);
  });
  it("unlocks Learn challenges in order and Practice only after their Learn is complete", () => {
    const lines = openingLines(OPENINGS[0]).slice(0, 3);
    const progress = {} as Record<
      string,
      ReturnType<typeof recordOpeningAttempt>
    >;
    expect(isOpeningLineUnlocked(lines, progress, lines[0].id, "learn")).toBe(
      true,
    );
    expect(isOpeningLineUnlocked(lines, progress, lines[1].id, "learn")).toBe(
      false,
    );
    expect(nextOpeningLine(lines, progress, "practice")).toBeUndefined();
    progress[lines[0].id] = recordOpeningAttempt(
      undefined,
      "learn",
      0,
      0,
      1_000,
    );
    expect(
      isOpeningLineUnlocked(lines, progress, lines[0].id, "practice"),
    ).toBe(true);
    expect(
      isOpeningLineUnlocked(lines, progress, lines[1].id, "practice"),
    ).toBe(false);
    expect(nextOpeningLine(lines, progress, "learn")?.id).toBe(lines[1].id);
    expect(isOpeningLineUnlocked(lines, progress, lines[2].id, "learn")).toBe(
      false,
    );
    progress[lines[1].id] = recordOpeningAttempt(
      undefined,
      "learn",
      0,
      0,
      1_001,
    );
    expect(
      isOpeningLineUnlocked(lines, progress, lines[1].id, "practice"),
    ).toBe(true);
    expect(isOpeningLineUnlocked(lines, progress, lines[2].id, "learn")).toBe(
      true,
    );
  });
  it("does not bypass earlier challenges using legacy out-of-order progress", () => {
    const lines = openingLines(OPENINGS[0]).slice(0, 3);
    const progress = {
      [lines[2].id]: recordOpeningAttempt(undefined, "learn", 0, 0, 1_000),
    };
    expect(isOpeningLineUnlocked(lines, progress, lines[2].id, "learn")).toBe(
      false,
    );
    expect(nextOpeningLine(lines, progress, "learn")?.id).toBe(lines[0].id);
    expect(dueOpeningLines(lines, progress, 1_001)).toEqual([]);
  });
  it("keeps a missed line due until it is recalled without hints", () => {
    const now = 1_000;
    const learned = recordOpeningAttempt(undefined, "learn", 0, 0, now);
    const missed = recordOpeningAttempt(learned, "practice", 1, 0, now + 10);
    expect(missed.dueAt).toBe(now + 10);
    const recalled = recordOpeningAttempt(missed, "review", 0, 0, now + 20);
    expect(recalled.intervalDays).toBe(1);
    const hinted = recordOpeningAttempt(recalled, "review", 0, 1, now + 30);
    expect(hinted.cleanStreak).toBe(0);
    expect(hinted.dueAt).toBe(now + 30);
  });
  it("spaces successful recalls further apart and preserves the schedule when studying", () => {
    const first = recordOpeningAttempt(undefined, "practice", 0, 0, 1_000);
    const second = recordOpeningAttempt(first, "review", 0, 0, first.dueAt);
    expect(second.intervalDays).toBe(3);
    const study = recordOpeningAttempt(
      second,
      "learn",
      0,
      0,
      second.lastAt + 10,
    );
    expect(study.dueAt).toBe(second.dueAt);
    expect(study.cleanStreak).toBe(2);
  });
  it("reviews only learned lines that are due", () => {
    const lines = openingLines(OPENINGS[0]);
    const progress = {
      [lines[0].id]: recordOpeningAttempt(undefined, "practice", 0, 0, 1_000),
    };
    expect(
      nextOpeningLine(lines, progress, "review", undefined, 1_001),
    ).toBeUndefined();
    expect(
      dueOpeningLines(lines, progress, progress[lines[0].id].dueAt),
    ).toEqual([lines[0]]);
    expect(nextOpeningLine(lines, progress, "learn")?.id).not.toBe(lines[0].id);
  });
});
