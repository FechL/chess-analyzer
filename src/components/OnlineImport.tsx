import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import type { GameData } from "../lib/chess";
import {
  chessArchives,
  chessMonth,
  importPgnUrl,
  lichessGames,
  normalizeUsername,
  onlineError,
} from "../lib/online-games";
import type { OnlineGame } from "../lib/online-games";

export type OnlineSource = "chesscom" | "lichess" | "url";

export default function OnlineImport({
  source,
  onLoad,
}: {
  source: OnlineSource;
  onLoad: (game: GameData) => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [games, setGames] = useState<OnlineGame[]>([]);
  const [archives, setArchives] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [next, setNext] = useState<number>();
  const [limit, setLimit] = useState(20);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function run(task: (signal: AbortSignal) => Promise<void>) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      await task(controller.signal);
    } catch (e) {
      if (!controller.signal.aborted) setError(onlineError(e));
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }
  function search() {
    void run(async (signal) => {
      if (source === "url") {
        const game = await importPgnUrl(input, signal);
        if (!signal.aborted) onLoad(game);
        return;
      }
      const username = normalizeUsername(input);
      setQuery(username);
      setGames([]);
      setArchives([]);
      setNext(undefined);
      setMonth("");
      setLimit(20);
      setSearched(false);
      if (source === "chesscom") {
        const list = await chessArchives(username, signal);
        if (signal.aborted) return;
        setArchives(list);
        if (list[0]) {
          setMonth(list[0]);
          const items = await chessMonth(list[0], signal);
          if (!signal.aborted) setGames(items);
        }
      } else {
        const page = await lichessGames(username, signal);
        if (signal.aborted) return;
        setGames(page.games);
        setNext(page.next);
      }
      if (!signal.aborted) setSearched(true);
    });
  }
  const canLoadMore =
    source === "chesscom" ? games.length > limit : next !== undefined;
  return (
    <div className="online-import">
      <p className="modal-description">
        {source === "url"
          ? "Tempel tautan langsung ke satu berkas PGN dari platform lain. Situs sumber perlu mengizinkan akses browser."
          : `Ambil permainan publik yang sudah selesai dari ${source === "chesscom" ? "Chess.com" : "Lichess"}. Cukup username, tanpa login.`}
      </p>
      <form
        className="online-import-form"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label className="field-label" htmlFor="online-game-input">
          {source === "url" ? "Tautan PGN" : "Username"}
        </label>
        <div className="online-search-row">
          <input
            id="online-game-input"
            className="online-import-input"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              source === "url"
                ? "https://situs.com/permainan.pgn"
                : "Masukkan username"
            }
          />
          <button
            className="button primary"
            type="submit"
            disabled={busy || !input.trim()}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Search size={15} />
            )}
            {source === "url" ? "Impor" : "Cari"}
          </button>
        </div>
      </form>
      {archives.length > 0 && (
        <label className="online-month">
          <span>Arsip bulan</span>
          <select
            value={month}
            disabled={busy}
            onChange={(e) => {
              const url = e.target.value;
              setMonth(url);
              setGames([]);
              setLimit(20);
              setSearched(false);
              void run(async (signal) => {
                const items = await chessMonth(url, signal);
                if (!signal.aborted) {
                  setGames(items);
                  setSearched(true);
                }
              });
            }}
          >
            {archives.map((url) => {
              const [year, month] = url.split("/").slice(-2).map(Number);
              return (
                <option key={url} value={url}>
                  {new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
                    "id-ID",
                    { month: "long", year: "numeric", timeZone: "UTC" },
                  )}
                </option>
              );
            })}
          </select>
        </label>
      )}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {busy && (
        <p className="online-import-status" role="status">
          Mengambil permainan…
        </p>
      )}
      {searched && !busy && !games.length && (
        <p className="online-import-status" role="status">
          Tidak ada permainan catur standar yang selesai pada hasil ini.
          {source === "chesscom" && archives.length > 1
            ? " Coba bulan lain."
            : ""}
        </p>
      )}
      {games.length > 0 && (
        <>
          <p className="online-import-status">
            Permainan {query} · pilih untuk membuka analisis
          </p>
          <div className="online-game-list" aria-label="Daftar permainan">
            {games
              .slice(0, source === "chesscom" ? limit : games.length)
              .map((item) => (
                <button
                  key={item.id}
                  className="online-game-item"
                  disabled={busy}
                  onClick={() => onLoad(item.game)}
                >
                  <span className="online-game-players">
                    <strong>{item.game.white}</strong>
                    <span>vs {item.game.black}</span>
                  </span>
                  <span className="online-game-meta">
                    <strong>{item.game.result}</strong>
                    <span>
                      {item.speed} ·{" "}
                      {new Date(item.date).toLocaleDateString("id-ID")}
                    </span>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
          </div>
        </>
      )}
      {canLoadMore && (
        <button
          className="text-button online-load-more"
          disabled={busy}
          onClick={() => {
            if (source === "chesscom") {
              setLimit((n) => n + 20);
              return;
            }
            void run(async (signal) => {
              const page = await lichessGames(query, signal, next);
              if (signal.aborted) return;
              setGames((items) => [
                ...items,
                ...page.games.filter(
                  (game) => !items.some((old) => old.id === game.id),
                ),
              ]);
              setNext(page.next);
            });
          }}
        >
          {busy ? "Memuat…" : "Muat permainan lebih lama"}
        </button>
      )}
      <p className="online-import-note">
        Hanya catur standar. Analisis tetap dilakukan oleh Stockfish di
        perangkat Anda.
      </p>
    </div>
  );
}
