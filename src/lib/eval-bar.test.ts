import { describe, expect, it } from "vitest";
import { whiteEvaluationPercent } from "./eval-bar";
describe("evaluation bar", () => {
  it("fills completely for mate scores, including checkmate", () => {
    for (const mate of [1, 2, 3, 20]) {
      expect(whiteEvaluationPercent(0, mate)).toBe(100);
      expect(whiteEvaluationPercent(0, -mate)).toBe(0);
    }
    expect(whiteEvaluationPercent(10000, 0)).toBe(100);
    expect(whiteEvaluationPercent(-10000, 0)).toBe(0);
  });
  it("keeps ordinary scores continuous, neutral at zero, and symmetric", () => {
    expect(whiteEvaluationPercent(0)).toBe(50);
    expect(
      whiteEvaluationPercent(145) + whiteEvaluationPercent(-145),
    ).toBeCloseTo(100);
    expect(whiteEvaluationPercent(500)).toBeGreaterThan(
      whiteEvaluationPercent(100),
    );
  });
});
