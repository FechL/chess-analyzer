import type { SavedGame } from "../App";

export type LibraryKind =
  | "all"
  | "live"
  | "bot"
  | "free"
  | "chesscom"
  | "lichess"
  | "pgn"
  | "fen"
  | "collection";
export type LibraryFilter = {
  search: string;
  favorites: boolean;
  kind: LibraryKind;
  from: string;
  until: string;
};

export function libraryGameKind(
  item: SavedGame,
): Exclude<LibraryKind, "all" | "live"> {
  const source = item.game.source?.toLowerCase();
  // Older bot games were saved as PGNs without an explicit bot source.
  if (source === "bot" || /^Latihan vs /i.test(item.game.event)) return "bot";
  if (source === "chess.com") return "chesscom";
  if (source === "lichess") return "lichess";
  if (source === "bebas" || source === "kustom") return "free";
  if (source === "fen") return "fen";
  if (source === "koleksi") return "collection";
  return "pgn";
}

export function filterLibrary(items: SavedGame[], filter: LibraryFilter) {
  const search = filter.search.trim().toLowerCase();
  return items.filter((item) => {
    const game = item.game;
    if (
      !`${game.event} ${game.white} ${game.black}`
        .toLowerCase()
        .includes(search)
    )
      return false;
    if (filter.favorites && !item.favorite) return false;
    const kind = libraryGameKind(item);
    if (
      filter.kind === "live"
        ? !["chesscom", "lichess"].includes(kind)
        : filter.kind !== "all" && filter.kind !== kind
    )
      return false;
    if (filter.from || filter.until) {
      const date = new Date(item.date);
      if (!Number.isFinite(date.getTime())) return false;
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (filter.from && day < filter.from) return false;
      if (filter.until && day > filter.until) return false;
    }
    return true;
  });
}
