import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { readStorage, writeStorage } from "../lib/chess";
import type { GameData } from "../lib/chess";
import type { SavedGame } from "../App";
import { gameForUsername, onlineError } from "../lib/online-games";
import { loadPlayerGames, savedPlayer } from "../lib/player-games";
import type { PlayerGameFeed, SavedPlayer } from "../lib/player-games";
import { useI18n } from "../lib/i18n";
import Title from "./Title";

function restorePlayers(): SavedPlayer[] {
  const saved = readStorage<SavedPlayer[] | undefined>(
    "kuda-home-players",
    undefined,
  );
  if (Array.isArray(saved)) return saved;
  return (["chesscom", "lichess"] as const).flatMap((source) => {
    try {
      const username = readStorage<string>(
        `kuda-import-username-${source}`,
        "",
      );
      return username.trim() ? [savedPlayer(source, username)] : [];
    } catch {
      return [];
    }
  });
}

export default function HomeGames({
  saved,
  onLoad,
}: {
  saved: SavedGame[];
  onLoad: (game: GameData) => void;
}) {
  const { t } = useI18n();
  const [players, setPlayers] = useState(restorePlayers);
  const [selectedId, setSelectedId] = useState(() =>
    readStorage("kuda-home-player", ""),
  );
  const selected =
    players.find((player) => player.id === selectedId) || players[0];
  const [adding, setAdding] = useState(!players.length);
  const [source, setSource] = useState<SavedPlayer["source"]>("chesscom");
  const [username, setUsername] = useState("");
  const [formError, setFormError] = useState("");
  const [feed, setFeed] = useState<PlayerGameFeed>();
  const [limit, setLimit] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [libraryPage, setLibraryPage] = useState(1);
  const request = useRef<AbortController | undefined>(undefined);
  const pages = Math.max(1, Math.ceil(saved.length / 5));
  const page = Math.min(libraryPage, pages);

  useEffect(() => {
    writeStorage("kuda-home-players", players);
  }, [players]);
  useEffect(() => {
    writeStorage("kuda-home-player", selected?.id || "");
  }, [selected?.id]);
  useEffect(() => {
    setFeed(undefined);
    setLimit(10);
    setError("");
    if (selected) void fetchGames(true);
    else setBusy(false);
    return () => request.current?.abort();
  }, [selected?.id]);

  async function fetchGames(reset: boolean) {
    if (!selected) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const target = reset ? 10 : limit + 10;
    setBusy(true);
    setError("");
    try {
      const next = await loadPlayerGames(
        selected,
        controller.signal,
        reset ? undefined : feed,
        target,
      );
      if (!controller.signal.aborted) {
        setFeed(next);
        setLimit(target);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(onlineError(error));
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }
  const platform = (player: SavedPlayer) =>
    player.source === "chesscom" ? "Chess.com" : "Lichess";
  const date = (value: string | number) =>
    new Date(value).toLocaleDateString(t("id-ID"), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="home-game-panels">
      <section
        className="home-games-panel"
        aria-label={t("Permainan pemain tersimpan")}
      >
        <div className="home-games-heading">
          <Title as="h2">{t("Permainan terbaru")}</Title>
          <div>
            <button
              className="text-button"
              onClick={() => setAdding((value) => !value)}
              aria-expanded={adding}
            >
              <Plus size={14} />
              {t("Tambah pemain")}
            </button>
            <button
              className="text-button"
              aria-label={t("Muat ulang permainan")}
              title={t("Muat ulang permainan")}
              disabled={!selected || busy}
              onClick={() => void fetchGames(true)}
            >
              <RotateCcw size={15} className={busy ? "spin" : ""} />
              {t("Muat ulang")}
            </button>
          </div>
        </div>
        {adding && (
          <form
            className="home-player-form"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const player = savedPlayer(source, username);
                setPlayers((current) =>
                  current.some((item) => item.id === player.id)
                    ? current
                    : [...current, player],
                );
                setSelectedId(player.id);
                setUsername("");
                setFormError("");
                setAdding(false);
              } catch (error) {
                setFormError(onlineError(error));
              }
            }}
          >
            <select
              aria-label={t("Platform pemain")}
              value={source}
              onChange={(event) =>
                setSource(event.target.value as SavedPlayer["source"])
              }
            >
              <option value="chesscom">Chess.com</option>
              <option value="lichess">Lichess</option>
            </select>
            <input
              aria-label={t("Username")}
              placeholder={t("Username")}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              spellCheck={false}
              required
            />
            <button
              className="button primary"
              type="submit"
              disabled={!username.trim()}
            >
              {t("Simpan")}
            </button>
            {formError && (
              <p className="error-message" role="alert">
                {t(formError)}
              </p>
            )}
          </form>
        )}
        {selected && (
          <div className="home-player-selector">
            <select
              aria-label={t("Pemain tersimpan")}
              value={selected.id}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {platform(player)} · {player.username}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              aria-label={t("Hapus pemain tersimpan")}
              title={t("Hapus pemain tersimpan")}
              onClick={() => {
                setPlayers((current) =>
                  current.filter((player) => player.id !== selected.id),
                );
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
        <div className="home-game-list" aria-busy={busy}>
          {feed?.games.slice(0, limit).map((item) => (
            <button
              key={item.id}
              className="home-game-row"
              onClick={() =>
                selected &&
                onLoad(gameForUsername(item.game, selected.username))
              }
            >
              <span>
                <strong>
                  {item.game.white} <span>vs</span> {item.game.black}
                </strong>
                <small>
                  {item.speed} · {date(item.date)}
                </small>
              </span>
              <b>{item.game.result}</b>
              <ArrowRight size={14} />
            </button>
          ))}
          {!feed?.games.length && (
            <p className="home-games-empty">
              {t(
                busy
                  ? "Memuat…"
                  : selected
                    ? "Belum ada permainan untuk ditampilkan."
                    : "Tambahkan pemain Chess.com atau Lichess untuk melihat permainan terbarunya.",
              )}
            </p>
          )}
        </div>
        {error && (
          <p className="error-message" role="alert">
            {t(error)}
          </p>
        )}
        {selected &&
          (busy ||
            (feed && (feed.games.length > limit || !feed.exhausted))) && (
            <div className="home-games-footer">
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void fetchGames(false)}
              >
                {busy && <LoaderCircle size={14} className="spin" />}
                {t(busy ? "Memuat…" : "Muat lebih banyak permainan")}
              </button>
            </div>
          )}
      </section>

      <section className="home-games-panel" aria-label={t("Koleksi permainan")}>
        <div className="home-games-heading">
          <Title as="h2">{t("Koleksi permainan")}</Title>
          <span>{saved.length}</span>
        </div>
        <div className="home-game-list">
          {saved.slice((page - 1) * 5, page * 5).map((item) => (
            <button
              key={item.id}
              className="home-game-row"
              onClick={() => onLoad({ ...item.game, source: "Koleksi" })}
            >
              <span>
                <strong>{item.game.event}</strong>
                <small>
                  {item.game.white} vs {item.game.black}
                </small>
                <small>{date(item.date)}</small>
              </span>
              <b>{item.game.result}</b>
              <ArrowRight size={14} />
            </button>
          ))}
          {!saved.length && (
            <p className="home-games-empty">
              {t("Belum ada permainan tersimpan.")}
            </p>
          )}
        </div>
        {pages > 1 && (
          <nav
            className="home-library-pagination"
            aria-label={t("Halaman koleksi")}
          >
            {Array.from({ length: pages }, (_, index) => index + 1).map(
              (number) => (
                <button
                  key={number}
                  className={`icon-button${page === number ? " active" : ""}`}
                  aria-label={`${t("Halaman")} ${number}`}
                  aria-current={page === number ? "page" : undefined}
                  onClick={() => setLibraryPage(number)}
                >
                  {number}
                </button>
              ),
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
