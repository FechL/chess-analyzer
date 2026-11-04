import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Settings } from "../App";
import { LESSONS } from "../data/content";
import { AcademyPage, AcademyStudy } from "./Learn";

const settings = { boardTheme: "sage", enableShortcuts: false } as Settings;

describe("Academy lesson workspace", () => {
  it("renders an independent lesson page with board controls, sidebar and catalog back action", () => {
    const html = renderToStaticMarkup(
      <AcademyStudy
        lesson={LESSONS[0]}
        settings={settings}
        onBack={() => {}}
        onOpenLesson={() => {}}
        onAnalyze={() => {}}
      />,
    );
    expect(html).toContain("academy-study-page");
    expect(html).toContain("board-section");
    expect(html).toContain("board-controls");
    expect(html).toContain("academy-study-sidebar");
    expect(html).toContain("academy-study-footer");
    expect(html).toContain('aria-label="Back to Academy"');
    expect(html).toContain('role="tabpanel"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("<kbd");
    expect(html).toContain('id="academy-menu-tab"');
    expect(html).not.toContain("Learn the moves and follow the arrows on the board.");
    expect(html.indexOf("study-theory")).toBeLessThan(html.indexOf("academy-step-coach"));
    expect(html).toContain('class="board-arrow"');
    expect(html).not.toContain("Lesson Notation");
    expect(html).not.toContain('id="academy-overview-tab"');
    expect(html).toMatch(/Ideas to take away\./i);
    expect(html).toContain("study-theory");
    expect(html).toContain("Repeat Lesson");
    expect(html).not.toContain("You&#x27;ve completed this lesson.");
    expect(html).not.toContain(">Practice<");
    expect(html).not.toContain("Show answer");
  });

  it("keeps every lesson accessible from the catalog without embedding a lesson dialog", () => {
    const html = renderToStaticMarkup(
      <AcademyPage settings={settings} onOpenLesson={() => {}} />,
    );
    expect(html.match(/class="lesson-card"/g)).toHaveLength(LESSONS.length);
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("chessboard-wrap");
    expect(html).not.toContain("academy-feature");
    expect(html).not.toContain("academy-references");
    expect(html).not.toContain('class="segmented wrap"');
  });
});
