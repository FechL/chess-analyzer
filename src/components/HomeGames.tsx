import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  X,
  LoaderCircle,
  UserPlus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { readStorage, writeStorage } from "../lib/chess";
import type { GameData } from "../lib/chess";
import type { SavedGame } from "../App";
import {
  gameForUsername,
  onlineError,
  verifiedPlayerUsername,
} from "../lib/online-games";
import {
  loadPlayerGames,
  matchesGameDate,
  savedPlayer,
} from "../lib/player-games";
import type {
  GameDateFilter,
  PlayerGameFeed,
  SavedPlayer,
} from "../lib/player-games";
import { useI18n } from "../lib/i18n";
import Title from "./Title";
import RecentGameRow from "./RecentGameRow";
import { gameAccuracyKey, readGameAccuracies } from "../lib/game-accuracy";
import {
  DashboardPopover,
  DashboardPopoverTrigger,
  DashboardPopoverContent,
} from "./block/dashboard-shell";

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
  const [accuracies] = useState(readGameAccuracies);
  const [players, setPlayers] = useState(restorePlayers);
  const [selectedId, setSelectedId] = useState(() =>
    readStorage("kuda-home-player", ""),
  );
  const selected =
    players.find((player) => player.id === selectedId) || players[0];
  const [adding, setAdding] = useState(!players.length);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [source, setSource] = useState<SavedPlayer["source"]>("chesscom");
  const [username, setUsername] = useState("");
  const [formError, setFormError] = useState("");
  const [checkingPlayer, setCheckingPlayer] = useState(false);
  const profileRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => profileRequest.current?.abort(), []);
  const [feeds, setFeeds] = useState<Record<string, PlayerGameFeed>>(() =>
    readStorage("kuda-home-game-feeds", {}),
  );
  const [filter, setFilter] = useState<GameDateFilter>({});
  const [recentPage, setRecentPage] = useState(1);
  const keyFor = (filter: GameDateFilter) =>
    `${selected?.id || ""}:${filter.year || "*"}-${filter.month || "*"}-${filter.day || "*"}`;
  const cacheKey = keyFor(filter);
  const feed = feeds[cacheKey];
  const fallbackFeed = feeds[keyFor({})];
  const allGames = (feed?.games || fallbackFeed?.games || []).filter((game) =>
    matchesGameDate(game.date, filter),
  );
  const visibleLimit = (feed || fallbackFeed)?.visibleLimit ?? 100;
  const games = allGames.slice(0, visibleLimit);
  const recentPages = Math.max(1, Math.ceil(games.length / 10));
  const currentRecentPage = Math.min(recentPage, recentPages);
  const hasMore =
    allGames.length > visibleLimit || !(feed || fallbackFeed)?.exhausted;
  const currentYear = new Date().getUTCFullYear();
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
    writeStorage("kuda-home-game-feeds", feeds);
  }, [feeds]);
  useEffect(() => {
    request.current?.abort();
    setRecentPage(1);
    setBusy(false);
    setError("");
    return () => request.current?.abort();
  }, [cacheKey]);

  async function fetchGames(reset: boolean) {
    if (!selected) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const target = reset ? 100 : games.length + 100;
    setBusy(true);
    setError("");
    try {
      const next = await loadPlayerGames(
        selected,
        controller.signal,
        reset ? undefined : feed,
        target,
        filter,
      );
      if (!controller.signal.aborted) {
        setFeeds((current) => ({
          ...current,
          [cacheKey]: { ...next, visibleLimit: target },
        }));
        setRecentPage(
          reset
            ? 1
            : Math.max(
                1,
                Math.min(recentPages + 1, Math.ceil(next.games.length / 10)),
              ),
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(onlineError(error));
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }
  const platform = (player: SavedPlayer) =>
    player.source === "chesscom" ? "Chess.com" : "Lichess";
  const date = (value: string | number, utc = false) =>
    new Date(value).toLocaleDateString(t("id-ID"), {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(utc ? { timeZone: "UTC" } : {}),
    });

  const cancelAddPlayer = () => {
    profileRequest.current?.abort();
    setCheckingPlayer(false);
    setUsername("");
    setFormError("");
    setAdding(false);
  };

  const addPlayerButton = (
    <button
      className="icon-button"
      onClick={() => {
        if (adding) cancelAddPlayer();
        else setAdding(true);
      }}
      aria-expanded={adding}
      aria-label={t("Tambah pemain")}
      title={t("Tambah pemain")}
    >
      <UserPlus size={17} />
    </button>
  );

  return (
    <div className="home-game-panels">
      <section
        className="home-games-panel home-recent-games"
        aria-label={t("Permainan pemain tersimpan")}
      >
        <div className="home-games-heading">
          <Title as="h2">{t("Permainan terbaru")}</Title>
          <div>
            <button
              className="text-button"
              aria-label={t("Muat ulang permainan")}
              title={t("Muat ulang permainan")}
              disabled={!selected || busy}
              onClick={() => void fetchGames(true)}
            >
              {t("Muat ulang")}
              <RotateCcw size={12} className={busy ? "spin" : ""} />
            </button>
          </div>
        </div>
        {adding && (
          <form
            className="home-player-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (checkingPlayer) return;
              profileRequest.current?.abort();
              const controller = new AbortController();
              profileRequest.current = controller;
              setCheckingPlayer(true);
              setFormError("");
              try {
                const verified = await verifiedPlayerUsername(
                  source,
                  username,
                  controller.signal,
                );
                if (controller.signal.aborted) return;
                const player = savedPlayer(source, verified);
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
                if (!controller.signal.aborted)
                  setFormError(onlineError(error));
              } finally {
                if (!controller.signal.aborted) setCheckingPlayer(false);
              }
            }}
          >
            <select
              aria-label={t("Platform pemain")}
              value={source}
              disabled={checkingPlayer}
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
              disabled={checkingPlayer}
              onChange={(event) => setUsername(event.target.value)}
              spellCheck={false}
              required
            />
            <button
              className="button primary home-player-save"
              type="submit"
              disabled={!username.trim() || checkingPlayer}
              aria-label={t(checkingPlayer ? "Memeriksa pemain…" : "Simpan")}
              title={t(checkingPlayer ? "Memeriksa pemain…" : "Simpan")}
            >
              {checkingPlayer ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Check size={16} />
              )}
            </button>
            <button
              className="icon-button home-player-cancel"
              type="button"
              aria-label={t("Batal")}
              title={t("Batal")}
              onClick={cancelAddPlayer}
            >
              <X size={16} />
            </button>
            {formError && (
              <p className="error-message" role="alert">
                {t(formError)}
              </p>
            )}
          </form>
        )}
        {!adding && selected && (
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
                setFeeds((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(
                      ([key]) => !key.startsWith(`${selected.id}:`),
                    ),
                  ),
                );
              }}
            >
              <Trash2 size={14} />
            </button>
            <DashboardPopover
              open={calendarOpen}
              onOpenChange={setCalendarOpen}
            >
              <DashboardPopoverTrigger asChild>
                <button
                  className={`icon-button${filter.year ? " active" : ""}`}
                  aria-label={t("Filter tanggal")}
                  title={t("Filter tanggal")}
                >
                  <CalendarDays size={15} />
                </button>
              </DashboardPopoverTrigger>
              <DashboardPopoverContent
                className="home-calendar-popover"
                align="end"
                side="bottom"
                aria-label={t("Filter tanggal")}
              >
                <Title as="strong">{t("Filter tanggal")}</Title>
                <div className="home-game-date-filters">
                  <label>
                    {t("Tahun")}
                    <select
                      aria-label={t("Tahun permainan")}
                      value={filter.year || ""}
                      onChange={(event) =>
                        setFilter({
                          year: Number(event.target.value) || undefined,
                        })
                      }
                    >
                      <option value="">{t("Semua tahun")}</option>
                      {Array.from(
                        { length: currentYear - 1899 },
                        (_, n) => currentYear - n,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("Bulan")}
                    <select
                      aria-label={t("Bulan permainan")}
                      disabled={!filter.year}
                      value={filter.month || ""}
                      onChange={(event) =>
                        setFilter({
                          year: filter.year,
                          month: Number(event.target.value) || undefined,
                        })
                      }
                    >
                      <option value="">{t("Semua bulan")}</option>
                      {Array.from({ length: 12 }, (_, n) => n + 1).map((n) => (
                        <option key={n} value={n}>
                          {new Date(
                            Date.UTC(2020, n - 1, 1),
                          ).toLocaleDateString(t("id-ID"), {
                            month: "long",
                            timeZone: "UTC",
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("Hari")}
                    <select
                      aria-label={t("Hari permainan")}
                      disabled={!filter.year || !filter.month}
                      value={filter.day || ""}
                      onChange={(event) =>
                        setFilter({
                          ...filter,
                          day: Number(event.target.value) || undefined,
                        })
                      }
                    >
                      <option value="">{t("Semua tanggal")}</option>
                      {Array.from(
                        {
                          length:
                            filter.year && filter.month
                              ? new Date(
                                  Date.UTC(filter.year, filter.month, 0),
                                ).getUTCDate()
                              : 31,
                        },
                        (_, n) => n + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  className="button primary full home-calendar-apply"
                  disabled={!selected || busy}
                  onClick={() => {
                    setCalendarOpen(false);
                    void fetchGames(true);
                  }}
                >
                  {t("Terapkan")}
                </button>
              </DashboardPopoverContent>
            </DashboardPopover>
            {addPlayerButton}
          </div>
        )}
        {!adding && !selected && (
          <div className="home-player-selector">{addPlayerButton}</div>
        )}

        <div className="home-game-list" aria-busy={busy}>
          {games
            .slice((currentRecentPage - 1) * 10, currentRecentPage * 10)
            .map((item) => (
              <RecentGameRow
                key={item.id}
                item={item}
                accuracy={accuracies[gameAccuracyKey(item.game)]}
                username={selected?.username || ""}
                dateLabel={date(item.date, true)}
                onOpen={() =>
                  selected &&
                  onLoad(gameForUsername(item.game, selected.username))
                }
              />
            ))}
          {!games.length && (
            <p className="home-games-empty">
              {t(
                busy
                  ? "Memuat…"
                  : selected
                    ? feed || fallbackFeed
                      ? "Tidak ada permainan yang cocok dengan filter."
                      : "Tekan Reload untuk memuat permainan sesuai filter."
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
        {(selected || recentPages > 1) && (
          <nav
            className="home-library-pagination"
            aria-label={t("Halaman permainan terbaru")}
          >
            {Array.from({ length: recentPages }, (_, n) => n + 1).map(
              (number) => (
                <button
                  key={number}
                  className={`icon-button${currentRecentPage === number ? " active" : ""}`}
                  aria-label={`${t("Halaman")} ${number}`}
                  aria-current={
                    currentRecentPage === number ? "page" : undefined
                  }
                  disabled={busy}
                  onClick={() => setRecentPage(number)}
                >
                  {number}
                </button>
              ),
            )}
            <button
              className="text-button"
              disabled={!selected || busy || !hasMore || !games.length}
              onClick={() => void fetchGames(false)}
            >
              {busy && <LoaderCircle size={14} className="spin" />}
              {t("Muat lebih banyak")}
            </button>
          </nav>
        )}
      </section>

      <section className="home-games-panel home-library-games" aria-label={t("Koleksi permainan")}>
        <div className="home-games-heading">
          <Title as="h2">{t("Koleksi permainan")}</Title>
          <div>
            <a className="text-button" href="#library">
              {t("Buka koleksi")}
              <ArrowRight size={14} />
            </a>
          </div>
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
        {pages > 1 ? (
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
        ) : <div className="home-library-pagination" aria-hidden="true" />}
      </section>
    </div>
  );
}
