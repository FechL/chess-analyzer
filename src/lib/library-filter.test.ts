import { describe, expect, it } from "vitest";
import { emptyGame } from "./chess";
import { filterLibrary, libraryGameKind } from "./library-filter";
import type { LibraryFilter } from "./library-filter";
import type { SavedGame } from "../App";

const filter: LibraryFilter = {
  search: "",
  favorites: false,
  kind: "all",
  from: "",
  until: "",
};
const item = (id: string, source: string, favorite = false): SavedGame => ({
  id,
  date: "2026-11-02T12:00:00",
  game: { ...emptyGame(), source, white: "Alice", black: "Bob" },
  favorite,
});
const items = [
  item("online", "Chess.com", true),
  item("lichess", "Lichess"),
  item("bot", "Bot", true),
  item("free", "Kustom"),
  item("pgn", "PGN"),
];

describe("library filters", () => {
  it("combines favorites, type, and case-insensitive player search", () => {
    expect(
      filterLibrary(items, {
        ...filter,
        kind: "live",
        favorites: true,
        search: "alice",
      }).map((item) => item.id),
    ).toEqual(["online"]);
    expect(
      filterLibrary(items, { ...filter, kind: "live" }).map((item) => item.id),
    ).toEqual(["online", "lichess"]);
    expect(
      filterLibrary(items, { ...filter, kind: "bot" }).map((item) => item.id),
    ).toEqual(["bot"]);
    expect(
      filterLibrary(items, { ...filter, kind: "free" }).map((item) => item.id),
    ).toEqual(["free"]);
    expect(filterLibrary(items, { ...filter, search: "unknown" })).toEqual([]);
  });
  it("filters by inclusive local saved dates", () => {
    expect(
      filterLibrary(items, {
        ...filter,
        from: "2026-11-02",
        until: "2026-11-02",
      }),
    ).toHaveLength(5);
    expect(filterLibrary(items, { ...filter, from: "2026-11-03" })).toEqual([]);
    expect(filterLibrary(items, { ...filter, until: "2026-11-01" })).toEqual(
      [],
    );
  });
  it("recognizes older bot games that were saved with a PGN source", () => {
    expect(
      libraryGameKind({
        ...items[4],
        game: { ...items[4].game, event: "Latihan vs Nara" },
      }),
    ).toBe("bot");
  });
  it("keeps nonfavorite legacy games visible and does not mutate saved data", () => {
    const legacy = { ...items[0], favorite: undefined };
    expect(filterLibrary([legacy], filter)).toEqual([legacy]);
    expect(filterLibrary([legacy], { ...filter, favorites: true })).toEqual([]);
    expect(legacy.favorite).toBeUndefined();
  });
});
