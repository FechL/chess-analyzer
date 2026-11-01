import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomeGames from "./HomeGames";
import { emptyGame } from "../lib/chess";

describe("Home library preview", () => {
  it("renders five saved games and numbered pages for the remaining games", () => {
    const saved = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
      date: "2026-10-26T00:00:00Z",
      game: { ...emptyGame(), event: `Saved match ${index + 1}` },
    }));
    const html = renderToStaticMarkup(
      <HomeGames saved={saved} onLoad={() => {}} />,
    );
    expect(html.match(/class="home-game-row"/g)).toHaveLength(5);
    expect(html).toContain("Saved match 5");
    expect(html).not.toContain("Saved match 6");
    expect(html).toContain('aria-label="Page 3"');
    expect(html).toContain('aria-current="page"');
  });

  it("shows an empty library without unnecessary pagination", () => {
    const html = renderToStaticMarkup(
      <HomeGames saved={[]} onLoad={() => {}} />,
    );
    expect(html).toContain("No saved games yet.");
    expect(html).not.toContain('aria-label="Library pages"');
  });
});
