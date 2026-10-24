// i18n: rendered text
import { useI18n } from "@/lib/i18n";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LABELS } from "../lib/chess";
import type { Annotation } from "../lib/chess";
import { useAppearance, pieceAsset } from "../lib/preferences";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import type { CSSProperties } from "react";
import {
  annotationColor,
  isAllowedArrow,
  boardTransition,
  toggleMark,
} from "../lib/board-effects";
import type { Mark } from "../lib/board-effects";
import {
  playBoardSound,
  unlockBoardSound,
  useBoardSound,
} from "../lib/board-sound";

import { useBoardAnimation } from "../lib/board-animation";
import { premoveTargets, projectPremoves } from "../lib/premove";
import type { Premove } from "../lib/premove";
import { whiteEvaluationPercent } from "../lib/eval-bar";

type Props = {
  fen: string;
  flipped?: boolean;
  onMove?: (from: string, to: string, promotion?: string) => boolean | void;
  disabled?: boolean;
  lastMove?: { from: string; to: string };
  arrow?: string | string[];
  selectedSquare?: string;
  theme?: "sage" | "walnut" | "slate";
  compact?: boolean;
  annotation?: Annotation;
  moveBadge?: { square: string; symbol: string; label: string; color: string };
  editMode?: boolean;
  onEditSquare?: (square: string, piece?: string, from?: string) => void;
  onDeleteDropSquare?: (square: string) => void;
  threatSquares?: string[];
  premove?: {
    color: "w" | "b";
    moves: Premove[];
    onQueue: (from: string, to: string, promotion?: string) => boolean;
    onCancel: () => void;
  };
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
  annotation,
  moveBadge,
  editMode = false,
  onEditSquare,
  onDeleteDropSquare,
  premove,
  threatSquares = [],
}: Props) {
  const { t } = useI18n();

  const { pieceTheme } = useAppearance();
  const boardRef = useRef<HTMLDivElement>(null);
  const previous = useRef({ fen, flipped, queued: false });
  const animations = useRef<Animation[]>([]);
  const draggedMove = useRef<
    { fen: string; from: string; to: string } | undefined
  >(undefined);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [drawing, setDrawing] = useState<Mark>();
  const gesture = useRef<Mark | undefined>(undefined);
  const sound = useBoardSound();
  const animate = useBoardAnimation();
  useEffect(() => {
    if (compact || !sound) return;
    window.addEventListener("pointerdown", unlockBoardSound, true);
    window.addEventListener("keydown", unlockBoardSound, true);
    return () => {
      window.removeEventListener("pointerdown", unlockBoardSound, true);
      window.removeEventListener("keydown", unlockBoardSound, true);
    };
  }, [compact, sound]);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { fen, flipped, queued: !!premove?.moves.length };
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
    if (before.fen === fen) return;
    setMarks([]);
    setDrawing(undefined);
    gesture.current = undefined;
    const dragged = draggedMove.current;
    draggedMove.current = undefined;
    const transition = boardTransition(before.fen, fen);
    if (!transition || compact) return;
    playBoardSound(transition.sound);
    if (
      !animate ||
      before.queued ||
      !!premove?.moves.length ||
      before.flipped !== flipped ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    for (const { from, to } of transition.pieces) {
      if (
        dragged?.fen === before.fen &&
        dragged.from === from &&
        dragged.to === to
      )
        continue;
      const origin = boardRef.current?.querySelector<HTMLElement>(
        `[data-square="${from}"]`,
      );
      const destination = boardRef.current?.querySelector<HTMLElement>(
        `[data-square="${to}"]`,
      );
      const piece = destination?.querySelector("img");
      if (!origin || !destination || !piece) continue;
      const a = origin.getBoundingClientRect();
      const b = destination.getBoundingClientRect();
      animations.current.push(
        piece.animate(
          [
            {
              transform: `translate(${a.x - b.x}px, ${a.y - b.y}px)`,
              zIndex: 5,
            },
            { transform: "translate(0, 0)", zIndex: 5 },
          ],
          { duration: 120, easing: "cubic-bezier(0.2, 0, 0.2, 1)" },
        ),
      );
    }
  }, [fen, flipped, compact, animate]);
  useEffect(
    () => () => animations.current.forEach((animation) => animation.cancel()),
    [],
  );
  const squareAt = (x: number, y: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (
      !rect ||
      x < rect.left ||
      x >= rect.right ||
      y < rect.top ||
      y >= rect.bottom
    )
      return;
    const files = flipped ? "hgfedcba" : "abcdefgh";
    const ranks = flipped ? "12345678" : "87654321";
    return (
      files[Math.floor(((x - rect.left) / rect.width) * 8)] +
      ranks[Math.floor(((y - rect.top) / rect.height) * 8)]
    );
  };
  const clearMarks = () => {
    setMarks([]);
    setDrawing(undefined);
    gesture.current = undefined;
  };
  const chess = useMemo(() => new Chess(fen), [fen]);
  const premoveMode =
    !!premove && (chess.turn() !== premove.color || premove.moves.length > 0);
  const displayChess = useMemo(
    () =>
      premoveMode && premove
        ? projectPremoves(fen, premove.moves, premove.color)
        : chess,
    [fen, chess, premoveMode, premove?.moves, premove?.color],
  );
  const displayFen = displayChess.fen();
  const interactiveColor =
    premoveMode && premove ? premove.color : chess.turn();
  const [selection, setSelection] = useState<{
    square: string;
    fen: string;
    piece: string;
  }>();
  const [promotion, setPromotion] = useState<{
    from: string;
    to: string;
    premove?: boolean;
  }>();
  useEffect(() => {
    if (disabled) {
      setSelection(undefined);
      setPromotion(undefined);
    }
  }, [disabled]);
  const selected =
    selectedSquare ??
    (selection &&
    (selection.fen === displayFen ||
      (premove &&
        !disabled &&
        displayChess.get(selection.square as Square)?.color === premove.color &&
        displayChess.get(selection.square as Square)?.type === selection.piece))
      ? selection.square
      : undefined);
  const legal = selected
    ? premoveMode
      ? premoveTargets(displayChess, selected, interactiveColor).map((to) => ({
          to,
        }))
      : chess.moves({ square: selected as Square, verbose: true })
    : [];
  const files = flipped ? "hgfedcba" : "abcdefgh";
  const ranks = flipped ? "12345678" : "87654321";
  const attempt = (from: string, to: string, dragged = false) => {
    if (disabled) return false;
    if (premoveMode && premove) {
      if (
        !premoveTargets(displayChess, from, premove.color).includes(
          to as Square,
        )
      )
        return false;
      const piece = displayChess.get(from as Square);
      draggedMove.current = undefined;
      if (piece?.type === "p" && to[1] === (piece.color === "w" ? "8" : "1")) {
        setPromotion({ from, to, premove: true });
        return true;
      }
      const accepted = premove.onQueue(from, to);
      if (accepted) setSelection(undefined);
      return accepted;
    }
    const moves = chess
      .moves({ square: from as Square, verbose: true })
      .filter((m) => m.to === to);
    if (!moves.length) return false;
    draggedMove.current = dragged ? { fen, from, to } : undefined;
    if (moves.some((m) => m.isPromotion())) {
      setPromotion({ from, to });
      return true;
    }
    const result = onMove?.(from, to);
    if (result !== false) setSelection(undefined);
    else draggedMove.current = undefined;
    return result !== false;
  };
  const choose = (square: string) => {
    clearMarks();
    if (disabled || !onMove || promotion) return;
    if (selected && attempt(selected, square)) return;
    const p = displayChess.get(square as Square);
    setSelection(
      p?.color === interactiveColor
        ? { square, fen: displayFen, piece: p.type }
        : undefined,
    );
  };
  const point = (square: string) => ({
    x: files.indexOf(square[0]) * 100 + 50,
    y: ranks.indexOf(square[1]) * 100 + 50,
  });
  const arrows = (Array.isArray(arrow) ? arrow : arrow ? [arrow] : []).filter(
    (move) => move.length >= 4,
  );
  return (
    <div
      className={`chessboard-wrap ${compact ? "compact" : ""}`}
      onDragOver={(e) => {
        if (editMode) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(e) => {
        if (!editMode || (e.target as HTMLElement).closest("[data-square]"))
          return;
        const from = e.dataTransfer.getData("application/x-kuda-square");
        if (from) {
          e.preventDefault();
          onDeleteDropSquare?.(from);
        }
      }}
    >
      <div
        ref={boardRef}
        className={`chessboard board-${theme}`}
        onContextMenu={(e) => e.preventDefault()}
        aria-description={t(
          "Klik kanan untuk menandai petak, tarik klik kanan untuk panah. Escape menghapus anotasi.",
        )}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          clearMarks();
          setSelection(undefined);
          setPromotion(undefined);
          premove?.onCancel();
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          if (e.button !== 2 || compact || promotion) return;
          e.preventDefault();
          if (premove?.moves.length) {
            premove.onCancel();
            setSelection(undefined);
            clearMarks();
            return;
          }
          const square = squareAt(e.clientX, e.clientY);
          if (!square) return;
          const mark = { from: square, to: square, color: annotationColor(e) };
          gesture.current = mark;
          setDrawing(mark);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!gesture.current) return;
          const square = squareAt(e.clientX, e.clientY);
          setDrawing(
            square &&
              (square === gesture.current.from ||
                isAllowedArrow(gesture.current.from, square))
              ? { ...gesture.current, to: square }
              : undefined,
          );
        }}
        onPointerUp={(e) => {
          const mark = gesture.current;
          if (!mark || e.button !== 2) return;
          const square = squareAt(e.clientX, e.clientY);
          if (
            square &&
            (square === mark.from || isAllowedArrow(mark.from, square))
          )
            setMarks((items) => toggleMark(items, { ...mark, to: square }));
          gesture.current = undefined;
          setDrawing(undefined);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={clearMarks}
        onLostPointerCapture={() => {
          gesture.current = undefined;
          setDrawing(undefined);
        }}
        role="group"
        aria-label={t("Papan catur interaktif")}
      >
        {t(
          [...ranks].flatMap((rank, row) =>
            [...files].map((file, col) => {
              const square = file + rank;
              const p = displayChess.get(square as Square);
              const badge =
                moveBadge?.square === square
                  ? moveBadge
                  : annotation && lastMove?.to === square && p
                    ? LABELS[annotation]
                    : undefined;
              const pendingSquare = premove?.moves.some(
                (move) => move.from === square || move.to === square,
              );
              const premoveIndex =
                premove?.moves
                  .map((move) => move.to)
                  .lastIndexOf(square as Square) ?? -1;
              const dark = (file.charCodeAt(0) - 97 + Number(rank)) % 2 === 1;
              const isLegal = legal.some((m) => m.to === square);
              const check =
                p?.type === "k" && p.color === chess.turn() && chess.isCheck();
              return (
                <button
                  key={square}
                  type="button"
                  className={`square ${dark ? "dark-square" : "light-square"} ${selected === square ? "selected" : ""} ${lastMove && [lastMove.from, lastMove.to].includes(square) ? "last-move" : ""} ${check ? "in-check" : ""} ${pendingSquare ? "premove-square" : ""} ${threatSquares.includes(square) ? "threatened-square" : ""}`}
                  aria-label={t(
                    `${square}${p ? ` ${p.color === "w" ? "putih" : "hitam"} ${NAMES[p.type]}` : ""}`,
                  )}
                  data-square={square}
                  onClick={() =>
                    editMode ? onEditSquare?.(square) : choose(square)
                  }
                  onDragOver={(e) => {
                    if (editMode || !disabled) {
                      e.preventDefault();
                      if (editMode) e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (editMode) {
                      const piece = e.dataTransfer.getData(
                        "application/x-kuda-piece",
                      );
                      const from = e.dataTransfer.getData(
                        "application/x-kuda-square",
                      );
                      onEditSquare?.(
                        square,
                        piece || undefined,
                        from || undefined,
                      );
                    } else if (!disabled) {
                      attempt(
                        e.dataTransfer.getData("text/plain"),
                        square,
                        true,
                      );
                    }
                  }}
                >
                  {t(
                    col === 0 && (
                      <span className="coordinate rank">{t(rank)}</span>
                    ),
                  )}
                  {t(
                    row === 7 && (
                      <span className="coordinate file">{t(file)}</span>
                    ),
                  )}
                  {t(
                    p && (
                      <img
                        className={
                          premoveIndex >= 0 && p.color === premove?.color
                            ? "premove-piece"
                            : undefined
                        }
                        src={pieceAsset(p.color, p.type, pieceTheme)}
                        alt={t("")}
                        draggable={
                          editMode ||
                          (!disabled &&
                            !!onMove &&
                            p.color === interactiveColor)
                        }
                        onDragStart={(e) => {
                          clearMarks();
                          if (editMode) {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData(
                              "application/x-kuda-square",
                              square,
                            );
                          } else {
                            e.dataTransfer.setData("text/plain", square);
                            setSelection({
                              square,
                              fen: displayFen,
                              piece: p.type,
                            });
                          }
                        }}
                        onDragEnd={(e) => {
                          if (editMode && e.dataTransfer.dropEffect === "none")
                            onDeleteDropSquare?.(square);
                        }}
                      />
                    ),
                  )}
                  {premoveIndex >= 0 && (
                    <span
                      className="premove-number"
                      aria-label={
                        t("Antrean premove") + " " + (premoveIndex + 1)
                      }
                    >
                      {premoveIndex + 1}
                    </span>
                  )}
                  {t(
                    badge && (
                      <span
                        className="piece-category-badge"
                        style={{ background: badge.color }}
                        aria-label={t(badge.label)}
                      >
                        {t(badge.symbol)}
                      </span>
                    ),
                  )}
                  {t(
                    isLegal && (
                      <span className={p ? "legal-capture" : "legal-dot"} />
                    ),
                  )}
                </button>
              );
            }),
          ),
        )}
        {t(
          arrows.length > 0 && (
            <svg
              className="board-arrow"
              viewBox="0 0 800 800"
              aria-hidden="true"
            >
              {t(
                arrows.map((move, index) => (
                  <g key={`${move}-${index}`} opacity={index === 0 ? 1 : 0.42}>
                    <ArrowShape
                      start={point(move.slice(0, 2))}
                      end={point(move.slice(2, 4))}
                    />
                  </g>
                )),
              )}
            </svg>
          ),
        )}
        {t(
          !compact && (marks.length > 0 || drawing) && (
            <svg
              className="board-annotations"
              viewBox="0 0 800 800"
              aria-label={t("Anotasi papan")}
              role="img"
            >
              {t(
                [...marks, ...(drawing ? [drawing] : [])].map((mark, index) => {
                  const a = point(mark.from);
                  const b = point(mark.to);
                  const knight =
                    Math.abs(a.x - b.x) * Math.abs(a.y - b.y) === 20000;
                  return mark.from === mark.to ? (
                    <circle
                      key={index}
                      data-mark={`${mark.from}-${mark.to}`}
                      cx={a.x}
                      cy={a.y}
                      r="42"
                      fill={mark.color}
                      fillOpacity="0.24"
                      stroke={mark.color}
                      strokeWidth="9"
                    />
                  ) : (
                    <g
                      key={index}
                      data-mark={`${mark.from}-${mark.to}`}
                      color={mark.color}
                    >
                      <ArrowShape start={a} end={b} knight={knight} />
                    </g>
                  );
                }),
              )}
            </svg>
          ),
        )}
        {t(
          promotion && (
            <div
              className="promotion-picker"
              role="dialog"
              aria-label={t("Pilih promosi")}
            >
              <p>{t("Promosikan pion")}</p>
              <div>
                {t(
                  ["q", "r", "b", "n"].map((type) => (
                    <button
                      key={type}
                      aria-label={t(`Promosi ${NAMES[type]}`)}
                      onClick={() => {
                        if (promotion.premove && premoveMode && premove)
                          premove.onQueue(promotion.from, promotion.to, type);
                        else onMove?.(promotion.from, promotion.to, type);
                        setPromotion(undefined);
                        setSelection(undefined);
                      }}
                    >
                      <img
                        src={pieceAsset(
                          promotion.premove && premove
                            ? premove.color
                            : chess.turn(),
                          type,
                          pieceTheme,
                        )}
                        alt={t(NAMES[type])}
                      />
                    </button>
                  )),
                )}
              </div>
              <button
                className="text-button"
                onClick={() => {
                  draggedMove.current = undefined;
                  setPromotion(undefined);
                }}
              >
                {t("Batal")}
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
type Point = { x: number; y: number };
function ArrowShape({
  start,
  end,
  knight = false,
}: {
  start: Point;
  end: Point;
  knight?: boolean;
}) {
  const { t } = useI18n();

  const corner = knight
    ? Math.abs(start.x - end.x) > Math.abs(start.y - end.y)
      ? { x: end.x, y: start.y }
      : { x: start.x, y: end.y }
    : start;
  const length = Math.hypot(end.x - corner.x, end.y - corner.y);
  if (!length) return null;
  const ux = (end.x - corner.x) / length;
  const uy = (end.y - corner.y) / length;
  const headLength = Math.min(48, length * 0.6);
  const halfWidth = headLength * 0.58;
  const base = { x: end.x - ux * headLength, y: end.y - uy * headLength };
  // End the shaft inside the triangle; the triangle's tip is the exact target.
  const shaftEnd = { x: base.x + ux * 2, y: base.y + uy * 2 };
  const path = `M${start.x},${start.y} ${knight ? `L${corner.x},${corner.y} ` : ""}L${shaftEnd.x},${shaftEnd.y}`;
  return (
    <>
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`${end.x},${end.y} ${base.x - uy * halfWidth},${base.y + ux * halfWidth} ${base.x + uy * halfWidth},${base.y - ux * halfWidth}`}
        fill="currentColor"
      />
    </>
  );
}

export function EvalBar({
  cp = 0,
  mate,
  flipped = false,
  active = true,
  pending = false,
}: {
  cp?: number;
  mate?: number;
  flipped?: boolean;
  active?: boolean;
  pending?: boolean;
}) {
  const { t } = useI18n();

  const white = whiteEvaluationPercent(cp, mate);
  return (
    <div
      className={`eval-bar ${flipped ? "flipped" : ""}`}
      aria-label={t(
        active
          ? `${pending ? "Evaluasi sebelumnya" : "Evaluasi putih"} ${cp / 100}${pending ? "; menunggu posisi baru" : ""}`
          : "Belum dianalisis",
      )}
      aria-busy={pending}
      title={t(pending ? "Menunggu evaluasi posisi baru" : undefined)}
      style={{ "--white-fraction": white / 100 } as CSSProperties}
    >
      <div className="white-eval" />
      <span className={cp >= 0 ? "positive" : ""}>
        {t(
          active
            ? mate !== undefined
              ? `M${Math.abs(mate)}`
              : Math.abs(cp) >= 1000
                ? (Math.abs(cp) / 100).toFixed(0)
                : (Math.abs(cp) / 100).toFixed(1)
            : "—",
        )}
      </span>
    </div>
  );
}
