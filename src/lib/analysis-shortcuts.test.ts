import { describe, expect, it } from "vitest";
import { getAnalysisShortcut } from "./analysis-shortcuts";

const event = (key: string, overrides = {}) => ({
  key,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
  ...overrides,
});

describe("analysis keyboard shortcuts", () => {
  it("uses R for main-line return and Shift+arrows for the first/last position", () => {
    expect(getAnalysisShortcut(event("r"))).toMatchObject({ action: "return" });
    expect(
      getAnalysisShortcut(event("ArrowLeft", { shiftKey: true })),
    ).toMatchObject({
      action: "start",
    });
    expect(
      getAnalysisShortcut(event("ArrowRight", { shiftKey: true })),
    ).toMatchObject({ action: "end" });
    expect(getAnalysisShortcut(event("ArrowLeft"))).toBeUndefined();
    expect(getAnalysisShortcut(event("ArrowRight"))).toBeUndefined();
  });
  it("resolves the three unmodified toggles, including Caps Lock", () => {
    expect(getAnalysisShortcut(event("a"))).toMatchObject({
      setting: "showArrows",
    });
    expect(getAnalysisShortcut(event("C"))).toMatchObject({
      setting: "showPieceAnnotation",
    });
    expect(getAnalysisShortcut(event("e"))).toMatchObject({
      setting: "liveEngine",
    });
  });

  it("requires Shift for new game, import, and save", () => {
    for (const [key, action] of [
      ["N", "new"],
      ["I", "import"],
      ["S", "save"],
    ]) {
      expect(getAnalysisShortcut(event(key, { shiftKey: true }))).toMatchObject(
        { action },
      );
      expect(getAnalysisShortcut(event(key.toLowerCase()))).toBeUndefined();
    }
    expect(getAnalysisShortcut(event("A", { shiftKey: true }))).toBeUndefined();
  });

  it("preserves browser shortcuts, composition, and already handled input without repeatedly toggling held keys", () => {
    for (const flag of [
      "ctrlKey",
      "metaKey",
      "altKey",
      "repeat",
      "isComposing",
      "defaultPrevented",
    ]) {
      expect(getAnalysisShortcut(event("a", { [flag]: true }))).toBeUndefined();
      expect(
        getAnalysisShortcut(event("S", { shiftKey: true, [flag]: true })),
      ).toBeUndefined();
    }
    expect(getAnalysisShortcut(event("f"))).toBeUndefined();
  });
});
