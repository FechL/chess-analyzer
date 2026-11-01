import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LibraryGames from "./LibraryGames";
import { emptyGame } from "../lib/chess";
const games = [
  {
    id: "one",
    date: "2026-11-02T12:00:00",
    favorite: true,
    game: {
      ...emptyGame(),
      source: "Bot",
      event: "Bot match",
      white: "Alice",
      whiteElo: "1500",
      blackElo: "600",
      black: "Nara",
      timeControl: "180+2",
    },
  },
];
const handlers = {
  onLoad: () => {},
  onDelete: () => {},
  onToggleFavorite: () => {},
};

describe("library game layouts", () => {
  it("defaults to cards and fills the header with game type and time control", () => {
    const html = renderToStaticMarkup(
      <LibraryGames games={games} {...handlers} />,
    );
    expect(html).toContain('class="library-grid"');
    expect(html).toContain('class="saved-card-source"');
    expect(html).toContain("Play a Bot");
    expect(html).toContain("3 min + 2s");
    expect(html).toContain("(1500)");
    expect(html).toContain("(600)");
    expect(html).not.toContain("saved-game-icon");
    expect(html).toContain('aria-label="Copy PGN"');
    expect(html).toContain('aria-label="Copy FEN"');
    expect(html.indexOf('aria-label="Delete Bot match"')).toBeLessThan(
      html.indexOf('aria-label="Remove from favorites"'),
    );
  });
  it("shows the same games and management actions in table view", () => {
    const html = renderToStaticMarkup(
      <LibraryGames games={games} view="table" {...handlers} />,
    );
    expect(html).toContain('<table class="library-table">');
    expect(html).toContain("Bot match");
    expect(html).toContain("Alice");
    expect(html).toContain("Nara");
    expect(html).toContain('aria-label="Copy PGN"');
    expect(html).toContain('aria-label="Copy FEN"');
    expect(html).not.toContain('aria-label="Download PGN"');
    expect(html).toContain('aria-label="Open game"');
    expect(html).toContain('aria-label="Delete Bot match"');
    expect(html).toContain('aria-label="Remove from favorites"');
    expect(html).not.toContain('class="library-grid"');
  });
});
