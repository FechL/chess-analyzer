import { useId, useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import type { CSSProperties } from "react";

type Props = {
  fen: string;
  flipped?: boolean;
  onMove?: (from: string, to: string, promotion?: string) => boolean | void;
  disabled?: boolean;
  lastMove?: { from: string; to: string };
  arrow?: string;
  selectedSquare?: string;
  theme?: "sage" | "walnut" | "slate";
  compact?: boolean;
};
const NAMES: Record<string, string> = {
  p: "pion",
  n: "kuda",
  b: "gajah",
  r: "benteng",
  q: "menteri",
  k: "raja",
};
export default function Board({
  fen,
  flipped = false,
  onMove,
  disabled,
  lastMove,
  arrow,
  selectedSquare,
  theme = "sage",
  compact,
}: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [selection, setSelection] = useState<{ square: string; fen: string }>();
  const [promotion, setPromotion] = useState<{ from: string; to: string }>();
  const selected =
    selectedSquare ?? (selection?.fen === fen ? selection.square : undefined);
  const legal = selected
    ? chess.moves({ square: selected as Square, verbose: true })
    : [];
  const files = flipped ? "hgfedcba" : "abcdefgh";
  const ranks = flipped ? "12345678" : "87654321";
  const id = useId().replace(/:/g, "");
  const attempt = (from: string, to: string) => {
    const moves = chess
      .moves({ square: from as Square, verbose: true })
      .filter((m) => m.to === to);
    if (!moves.length) return false;
    if (moves.some((m) => m.isPromotion())) {
      setPromotion({ from, to });
      return true;
    }
    const result = onMove?.(from, to);
    if (result !== false) setSelection(undefined);
    return result !== false;
  };
  const choose = (square: string) => {
    if (disabled || !onMove || promotion) return;
    if (selected && attempt(selected, square)) return;
    const p = chess.get(square as Square);
    setSelection(p?.color === chess.turn() ? { square, fen } : undefined);
  };
  const point = (square: string) => ({
    x: files.indexOf(square[0]) * 100 + 50,
    y: ranks.indexOf(square[1]) * 100 + 50,
  });
  const start =
    arrow && arrow.length >= 4 ? point(arrow.slice(0, 2)) : undefined;
  const end = arrow && arrow.length >= 4 ? point(arrow.slice(2, 4)) : undefined;
  return (
    <div className={`chessboard-wrap ${compact ? "compact" : ""}`}>
      <div
        className={`chessboard board-${theme}`}
        role="group"
        aria-label="Papan catur interaktif"
      >
        {[...ranks].flatMap((rank, row) =>
          [...files].map((file, col) => {
            const square = file + rank;
            const p = chess.get(square as Square);
            const dark = (file.charCodeAt(0) - 97 + Number(rank)) % 2 === 1;
            const isLegal = legal.some((m) => m.to === square);
            const check =
              p?.type === "k" && p.color === chess.turn() && chess.isCheck();
            return (
              <button
                key={square}
                type="button"
                className={`square ${dark ? "dark-square" : "light-square"} ${selected === square ? "selected" : ""} ${lastMove && [lastMove.from, lastMove.to].includes(square) ? "last-move" : ""} ${check ? "in-check" : ""}`}
                aria-label={`${square}${p ? ` ${p.color === "w" ? "putih" : "hitam"} ${NAMES[p.type]}` : ""}`}
                data-square={square}
                onClick={() => choose(square)}
                onDragOver={(e) => {
                  if (!disabled) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!disabled)
                    attempt(e.dataTransfer.getData("text/plain"), square);
                }}
              >
                {col === 0 && <span className="coordinate rank">{rank}</span>}
                {row === 7 && <span className="coordinate file">{file}</span>}
                {p && (
                  <img
                    src={`/pieces/${p.color}${p.type.toUpperCase()}.svg`}
                    alt=""
                    draggable={
                      !disabled && !!onMove && p.color === chess.turn()
                    }
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", square);
                      setSelection({ square, fen });
                    }}
                  />
                )}
                {isLegal && (
                  <span className={p ? "legal-capture" : "legal-dot"} />
                )}
              </button>
            );
          }),
        )}
        {start && end && (
          <svg className="board-arrow" viewBox="0 0 800 800" aria-hidden="true">
            <defs>
              <marker
                id={`arrow${id}`}
                markerWidth="3"
                markerHeight="3"
                refX="1.7"
                refY="1.5"
                orient="auto"
              >
                <path d="M0,0 L3,1.5 L0,3 Z" fill="currentColor" />
              </marker>
            </defs>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x - (end.x - start.x) * 0.1}
              y2={end.y - (end.y - start.y) * 0.1}
              stroke="currentColor"
              strokeWidth="14"
              strokeLinecap="round"
              markerEnd={`url(#arrow${id})`}
            />
          </svg>
        )}
        {promotion && (
          <div
            className="promotion-picker"
            role="dialog"
            aria-label="Pilih promosi"
          >
            <p>Promosikan pion</p>
            <div>
              {["q", "r", "b", "n"].map((type) => (
                <button
                  key={type}
                  aria-label={`Promosi ${NAMES[type]}`}
                  onClick={() => {
                    onMove?.(promotion.from, promotion.to, type);
                    setPromotion(undefined);
                    setSelection(undefined);
                  }}
                >
                  <img
                    src={`/pieces/${chess.turn()}${type.toUpperCase()}.svg`}
                    alt={NAMES[type]}
                  />
                </button>
              ))}
            </div>
            <button
              className="text-button"
              onClick={() => setPromotion(undefined)}
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export function EvalBar({
  cp = 0,
  mate,
  flipped = false,
  active = true,
}: {
  cp?: number;
  mate?: number;
  flipped?: boolean;
  active?: boolean;
}) {
  const white = Math.max(5, Math.min(95, 50 + 45 * Math.tanh(cp / 450)));
  return (
    <div
      className={`eval-bar ${flipped ? "flipped" : ""}`}
      aria-label={active ? `Evaluasi putih ${cp / 100}` : "Belum dianalisis"}
      style={{ "--white-height": `${white}%` } as CSSProperties}
    >
      <div className="white-eval" />
      <span className={cp >= 0 ? "positive" : ""}>
        {active
          ? mate !== undefined
            ? `M${Math.abs(mate)}`
            : (Math.abs(cp) / 100).toFixed(1)
          : "—"}
      </span>
    </div>
  );
}
