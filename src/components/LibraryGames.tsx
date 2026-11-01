import { useEffect, useState } from "react";
import { ArrowRight, Copy, Star, Trash2 } from "lucide-react";
import type { SavedGame } from "../App";
import { positionAt, toPgn } from "../lib/chess";
import type { GameData } from "../lib/chess";
import { useI18n } from "../lib/i18n";
import { libraryGameKind } from "../lib/library-filter";
import { recentTimeControl } from "../lib/recent-game";
import Title from "./Title";
import { copyText } from "../lib/clipboard";

const sourceLabels = {
  bot: "Lawan bot",
  free: "Analisis bebas",
  chesscom: "Chess.com",
  lichess: "Lichess",
  pgn: "PGN",
  fen: "FEN",
  collection: "Koleksi",
};

export default function LibraryGames({
  games,
  view = "cards",
  onLoad,
  onDelete,
  onToggleFavorite,
}: {
  games: SavedGame[];
  view?: "cards" | "table";
  onLoad: (game: GameData) => void;
  onDelete: (game: SavedGame) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const { t } = useI18n();
  const date = (item: SavedGame) =>
    new Date(item.date).toLocaleDateString(t("id-ID"), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const source = (item: SavedGame) => t(sourceLabels[libraryGameKind(item)]);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  const copyGame = async (item: SavedGame, kind: "FEN" | "PGN") => {
    try {
      await copyText(
        kind === "FEN"
          ? positionAt(item.game, item.game.moves.length).fen()
          : toPgn(item.game),
      );
      setFeedback(kind === "FEN" ? "FEN disalin" : "PGN disalin");
    } catch {
      setFeedback("Gagal menyalin ke clipboard");
    }
  };
  const copyActions = (item: SavedGame) =>
    (["FEN", "PGN"] as const).map((kind) => (
      <button
        key={kind}
        className="text-button library-copy-action"
        aria-label={t(kind === "FEN" ? "Salin FEN" : "Salin PGN")}
        title={t(kind === "FEN" ? "Salin FEN" : "Salin PGN")}
        onClick={() => void copyGame(item, kind)}
      >
        <Copy size={13} aria-hidden="true" />
        {kind}
      </button>
    ));
  const copyFeedback = feedback && (
    <div
      className="toast keyboard-toggle-toast"
      role="status"
      aria-live="polite"
    >
      {t(feedback)}
    </div>
  );
  const manage = (item: SavedGame) => (
    <>
      <button
        className="icon-button"
        aria-label={t(`Hapus ${item.game.event}`)}
        onClick={() => onDelete(item)}
      >
        <Trash2 size={15} />
      </button>
      <button
        className={`icon-button saved-game-favorite${item.favorite ? " active" : ""}`}
        aria-label={t(
          item.favorite ? "Hapus dari favorit" : "Tambah ke favorit",
        )}
        title={t(item.favorite ? "Hapus dari favorit" : "Tambah ke favorit")}
        aria-pressed={!!item.favorite}
        onClick={() => onToggleFavorite(item.id)}
      >
        <Star size={16} fill={item.favorite ? "currentColor" : "none"} />
      </button>
    </>
  );

  if (view === "table")
    return (
      <div className="library-table-wrap">
        <table className="library-table">
          <thead>
            <tr>
              <th>{t("Permainan")}</th>
              <th>{t("Pemain")}</th>
              <th>{t("Tanggal disimpan")}</th>
              <th>{t("Sumber permainan")}</th>
              <th>{t("Hasil")}</th>
              <th>{t("Aksi")}</th>
            </tr>
          </thead>
          <tbody>
            {games.map((item) => (
              <tr key={item.id}>
                <td>
                  <button
                    className="text-button library-table-title"
                    onClick={() => onLoad(item.game)}
                  >
                    {t(item.game.event)}
                  </button>
                  <small>
                    {item.game.moves.length}
                    {t(" ply")}
                  </small>
                </td>
                <td>
                  <span className="library-table-player">
                    <span
                      className="home-recent-side side-w"
                      aria-label={t("Putih")}
                    />
                    {item.game.white}
                    {item.game.whiteElo && ` (${item.game.whiteElo})`}
                  </span>
                  <span className="library-table-player">
                    <span
                      className="home-recent-side side-b"
                      aria-label={t("Hitam")}
                    />
                    {item.game.black}
                    {item.game.blackElo && ` (${item.game.blackElo})`}
                  </span>
                </td>
                <td>{date(item)}</td>
                <td>
                  {source(item)}
                  {item.game.timeControl && (
                    <small>{recentTimeControl(item.game.timeControl)}</small>
                  )}
                </td>
                <td>{item.game.result}</td>
                <td>
                  <div className="library-table-actions">
                    {copyActions(item)}
                    <button
                      className="icon-button"
                      onClick={() => onLoad(item.game)}
                      aria-label={t("Buka permainan")}
                      title={t("Buka permainan")}
                    >
                      <ArrowRight size={15} />
                    </button>
                    {manage(item)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {copyFeedback}
      </div>
    );

  return (
    <div className="library-grid">
      {games.map((item) => (
        <article className="saved-game-card" key={item.id}>
          <div className="saved-card-top">
            <span className="small-label saved-card-date">{date(item)}</span>
            <span className="subtle-pill">{item.game.result}</span>
            {manage(item)}
          </div>
          <div className="saved-card-title-row">
            <Title as="h3">{t(item.game.event)}</Title>
            <span className="saved-card-source">
              {source(item)}
              {item.game.timeControl &&
                ` · ${recentTimeControl(item.game.timeControl)}`}
            </span>
          </div>
          <p>
            {item.game.white}
            {Number(item.game.whiteElo) > 0 && (
              <small className="saved-player-rating">
                {" "}
                ({item.game.whiteElo})
              </small>
            )}{" "}
            <span>{t("vs")}</span> {item.game.black}
            {Number(item.game.blackElo) > 0 && (
              <small className="saved-player-rating">
                {" "}
                ({item.game.blackElo})
              </small>
            )}
          </p>
          <div className="saved-card-bottom">
            <span>
              {item.game.moves.length}
              {t(" ply")}
            </span>
            {copyActions(item)}
            <button
              className="button secondary"
              onClick={() => onLoad(item.game)}
            >
              {t("Buka ")}
              <ArrowRight size={14} />
            </button>
          </div>
        </article>
      ))}
      {copyFeedback}
    </div>
  );
}
