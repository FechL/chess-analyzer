import Title from "./Title";
import { NotationMove } from "./Notation";
import { pieceAsset } from "../lib/preferences";
import type { Appearance } from "../lib/preferences";
import { useI18n } from "../lib/i18n";

export default function SettingsBoardPreview({
  boardTheme,
  pieceTheme,
}: {
  boardTheme: "sage" | "walnut" | "slate";
  pieceTheme: Appearance["pieceTheme"];
}) {
  const { t } = useI18n();
  const pieces = ["bB", "bQ", "bP", null, null, null, "wN", "wK", "wR"];
  return (
    <div className="settings-preview">
      <div role="img" aria-label={t("Pratinjau papan 3×3")}>
        <div className="chessboard-wrap settings-preview-frame">
          <div
            className={`chessboard settings-preview-board board-${boardTheme}`}
            aria-hidden="true"
          >
            {pieces.map((piece, index) => (
              <div
                key={index}
                className={`square ${index % 2 ? "dark-square" : "light-square"}`}
              >
                {piece && (
                  <img
                    src={pieceAsset(piece[0], piece[1], pieceTheme)}
                    alt=""
                    draggable={false}
                  />
                )}
                {index % 3 === 0 && (
                  <span className="coordinate rank">
                    {8 - Math.floor(index / 3)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <section
        className="settings-notation-preview"
        aria-label={t("Notasi permainan")}
      >
        <div className="notation-heading">
          <Title>{t("Notasi permainan")}</Title>
        </div>
        <div className="settings-notation-moves">
          {[
            ["e4", "e5"],
            ["Nf3", "Nc6"],
            ["Bc4", "Bc5"],
            ["O-O", "Nf6"],
          ].map((moves, row) => (
            <div className="move-row" key={row}>
              <span className="move-number">{row + 1}.</span>
              {moves.map((san, column) => (
                <span
                  className={`move-cell${row === 3 && column === 1 ? " current" : ""}`}
                  key={column}
                >
                  <NotationMove san={san} color={column === 0 ? "w" : "b"} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
