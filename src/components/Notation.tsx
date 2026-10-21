import { pieceAsset, useAppearance } from "../lib/preferences";
import { useI18n } from "../lib/i18n";

const INDONESIAN: Record<string, string> = {
  K: "R",
  Q: "M",
  R: "B",
  B: "G",
  N: "K",
};

export function NotationMove({
  san,
  color,
}: {
  san: string;
  color: "w" | "b";
}) {
  const { notationStyle, pieceTheme } = useAppearance();
  const { language } = useI18n();
  const piece = /^[KQRBN]/.test(san)
    ? san[0]
    : san.startsWith("O-O")
      ? "K"
      : "P";
  const letters =
    language === "id"
      ? san.replace(
          /^[KQRBN]|(?<==)[KQRBN]/g,
          (value) => INDONESIAN[value] || value,
        )
      : san;
  const imageOnly = notationStyle === "pieces";
  const visibleSan = imageOnly && /^[KQRBN]/.test(san) ? san.slice(1) : letters;
  const promotion = imageOnly ? san.match(/=([KQRBN])([+#]?)$/) : null;
  return (
    <span className="notation-san" aria-label={letters}>
      {notationStyle !== "letters" && (
        <img
          className="notation-piece"
          src={pieceAsset(color, piece, pieceTheme)}
          alt=""
        />
      )}
      {promotion ? (
        <>
          {visibleSan.split("=")[0]}=
          <img
            className="notation-piece"
            src={pieceAsset(color, promotion[1], pieceTheme)}
            alt=""
          />
          {promotion[2]}
        </>
      ) : (
        visibleSan
      )}
    </span>
  );
}

export function NotationLine({
  moves,
  turn,
}: {
  moves: string[];
  turn: "w" | "b";
}) {
  return (
    <span className="notation-line">
      {moves.map((san, i) => (
        <NotationMove
          key={i}
          san={san}
          color={(i + (turn === "b" ? 1 : 0)) % 2 ? "b" : "w"}
        />
      ))}
    </span>
  );
}
