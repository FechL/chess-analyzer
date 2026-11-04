import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomeGames from "./HomeGames";
import { emptyGame, parseGame } from "../lib/chess";
import { gameAccuracyKey } from "../lib/game-accuracy";

describe("Home library preview", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("places previously reviewed accuracy to the left of the result scores", () => {
    const game = parseGame('[White "alice"]\n[Black "bob"]\n\n1. e4 e5 1-0');
    const storage: Record<string, unknown> = {
      "kuda-home-players": [
        { id: "lichess:alice", username: "alice", source: "lichess" },
      ],
      "kuda-home-game-feeds": {
        "lichess:alice:*-*-*": {
          games: [{ id: "match", game, date: 0, speed: "blitz" }],
          exhausted: true,
        },
      },
      "kuda-game-accuracies": {
        [gameAccuracyKey(game)]: { white: "95.0", black: "87.5" },
      },
    };
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key in storage ? JSON.stringify(storage[key]) : null,
    });
    const html = renderToStaticMarkup(
      <HomeGames saved={[]} onLoad={() => {}} />,
    );
    expect(html).toContain("95.0%");
    expect(html).toContain("87.5%");
    expect(html.indexOf('class="home-recent-accuracy"')).toBeLessThan(
      html.indexOf('class="home-recent-score"'),
    );
  });

  it("limits initial recent-game navigation to page ten even when a monthly response contains more games", () => {
    const player = {
      id: "lichess:alice",
      username: "alice",
      source: "lichess",
    };
    const storage = {
      "kuda-home-players": [player],
      "kuda-home-player": player.id,
      "kuda-home-game-feeds": {
        "lichess:alice:*-*-*": {
          games: Array.from({ length: 120 }, (_, index) => ({
            id: String(index),
            game: emptyGame(),
            date: 0,
            speed: "blitz",
          })),
          initialized: true,
          archives: [],
          archiveIndex: 0,
          exhausted: true,
          visibleLimit: 100,
        },
      },
    };
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key in storage
          ? JSON.stringify(storage[key as keyof typeof storage])
          : null,
    });
    const html = renderToStaticMarkup(
      <HomeGames saved={[]} onLoad={() => {}} />,
    );
    expect(html.match(/class="home-game-row"/g)).toHaveLength(10);
    expect(html).toContain('aria-label="Page 10"');
    expect(html).not.toContain('aria-label="Page 11"');
    expect(html).toContain("Load More");
    expect(html).not.toMatch(/disabled=""[^>]*>Load More/);
  });
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
