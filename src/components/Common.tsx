// i18n: rendered text
import { pieceAsset, useAppearance } from "../lib/preferences";
import { useI18n } from "@/lib/i18n";
import { Fragment, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCw,
} from "lucide-react";
import { Chess } from "chess.js";
import { LABELS } from "../lib/chess";
import type { GameVariation, ReviewMove } from "../lib/chess";
import { NotationMove } from "./Notation";
import { formatMoveDuration } from "../lib/move-time";
import type { BookMove } from "../lib/opening-book";

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { t } = useI18n();

  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2 id="modal-title">{t(title)}</h2>
          <button
            className="icon-button"
            aria-label={t("Tutup")}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {t(children)}
      </div>
    </dialog>
  );
}
export function IconButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const { t } = useI18n();

  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      title={t(label)}
      aria-label={t(label)}
      onClick={onClick}
      disabled={disabled}
    >
      {t(children)}
    </button>
  );
}
export function NavigationControls({
  ply,
  total,
  onChange,
  onFlip,
  outsideNotation = false,
  onReturnToMain,
}: {
  ply: number;
  total: number;
  onChange: (n: number) => void;
  onFlip?: () => void;
  outsideNotation?: boolean;
  onReturnToMain?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="board-controls">
      <span className="move-position">
        {t(
          outsideNotation ? (
            "- / -"
          ) : (
            <>
              {t("Langkah ")}
              {t(Math.ceil(ply / 2))}
              {t("/")}
              {t(Math.ceil(total / 2))}
            </>
          ),
        )}
      </span>
      <div className="navigation-buttons">
        <IconButton
          label={t("Ke posisi awal")}
          onClick={() => onChange(0)}
          disabled={ply === 0}
        >
          <ChevronsLeft size={19} />
        </IconButton>
        <IconButton
          label={t("Langkah sebelumnya")}
          onClick={() => onChange(Math.max(0, ply - 1))}
          disabled={ply === 0}
        >
          <ChevronLeft size={20} />
        </IconButton>
        <IconButton
          label={t("Langkah berikutnya")}
          onClick={() => onChange(Math.min(total, ply + 1))}
          disabled={ply === total}
        >
          <ChevronRight size={20} />
        </IconButton>
        <IconButton
          label={t("Ke posisi terakhir")}
          onClick={() => onChange(total)}
          disabled={ply === total}
        >
          <ChevronsRight size={19} />
        </IconButton>
      </div>
      {t(
        outsideNotation && onReturnToMain && (
          <button
            className="text-button return-to-main"
            onClick={onReturnToMain}
            title={t("Kembali ke langkah terakhir notasi asli")}
          >
            <RotateCw size={14} />
            {t(" Kembali ke notasi")}
          </button>
        ),
      )}
      {t(
        onFlip && (
          <IconButton label={t("Balik papan (F)")} onClick={onFlip}>
            <RotateCw size={16} />
          </IconButton>
        ),
      )}
    </div>
  );
}
export function PlayerRow({
  name,
  color,
  subtitle,
  active,
  right,
}: {
  name: string;
  color: "w" | "b";
  subtitle?: string;
  active?: boolean;
  right?: ReactNode;
}) {
  const { t } = useI18n();
  const { pieceTheme } = useAppearance();

  return (
    <div className="player-row">
      <span className={`player-avatar ${color}`}>
        <img src={pieceAsset(color, "K", pieceTheme)} alt={t("")} />
      </span>
      <div className="player-name">
        <strong>{t(name)}</strong>
        <span>
          {t(subtitle || (color === "w" ? "Buah putih" : "Buah hitam"))}
        </span>
      </div>
      <span className={`player-turn ${active ? "is-active" : ""}`} />
      {t(right)}
    </div>
  );
}
export function MoveList({
  moves,
  ply,
  onChange,
  review = [],
  bookMoves = [],
  durations = [],
  startFen,
  variations = [],
  activeVariationId,
  variationPly,
  onVariationChange,
}: {
  moves: string[];
  ply: number;
  onChange?: (n: number) => void;
  review?: ReviewMove[];
  bookMoves?: (BookMove | undefined)[];
  durations?: (number | undefined)[];
  startFen: string;
  variations?: GameVariation[];
  activeVariationId?: string;
  variationPly?: number;
  onVariationChange?: (id: string, ply: number) => void;
}) {
  const { t } = useI18n();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    const active = container?.querySelector<HTMLElement>(
      '[aria-current="step"]',
    );
    if (!container || !active) return;
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < container.scrollTop)
      container.scrollTo({ top, behavior: "smooth" });
    else if (bottom > container.scrollTop + container.clientHeight)
      container.scrollTo({
        top: bottom - container.clientHeight,
        behavior: "smooth",
      });
  }, [ply, variationPly, activeVariationId]);
  const c = new Chess(startFen);
  const startNumber = Number(startFen.split(" ")[5]);
  const offset = c.turn() === "b" ? 1 : 0;
  const rows = Math.ceil((moves.length + offset) / 2);
  const isRootVariation = (branch: GameVariation) =>
    !branch.parentId || !variations.some((item) => item.id === branch.parentId);
  const renderVariation = (
    branch: GameVariation,
    branchIndex: number,
  ): ReactNode => (
    <div
      className={
        "notation-variation " +
        (activeVariationId === branch.id ? "is-active" : "")
      }
      key={branch.id}
    >
      <div className="notation-variation-heading">
        <span>
          {t("↳ Variasi ")}
          {t(branchIndex + 1)}
        </span>
        <span>
          {t(
            branch.parentId
              ? "dari Variasi " +
                  (variations.findIndex((item) => item.id === branch.parentId) +
                    1)
              : "dari jalur utama",
          )}
        </span>
      </div>
      <div className="notation-variation-moves">
        {t(
          branch.moves.slice(branch.forkPly).map((san, i) => {
            const index = branch.forkPly + i;
            const number = startNumber + Math.floor((index + offset) / 2);
            const black = (index + offset) % 2 === 1;
            const current =
              activeVariationId === branch.id && variationPly === index + 1;
            return (
              <button
                key={index}
                className={
                  "move-cell variation-move " + (current ? "current" : "")
                }
                aria-current={current ? "step" : undefined}
                aria-label={t(
                  "Variasi " +
                    (branchIndex + 1) +
                    ": " +
                    number +
                    (black ? "... " : ". ") +
                    san,
                )}
                onClick={() => onVariationChange?.(branch.id, index + 1)}
              >
                <small>
                  {t(number)}
                  {t(black ? "..." : ".")}
                </small>
                <NotationMove san={san} color={black ? "b" : "w"} />
              </button>
            );
          }),
        )}
      </div>
      {t(
        variations.some((child) => child.parentId === branch.id) && (
          <div className="notation-variation-children">
            {t(
              variations.map((child, childIndex) =>
                child.parentId === branch.id
                  ? renderVariation(child, childIndex)
                  : null,
              ),
            )}
          </div>
        ),
      )}
    </div>
  );
  return (
    <div className="move-list" ref={ref}>
      {t(
        moves.length ? (
          Array.from({ length: rows }, (_, row) => (
            <Fragment key={row}>
              <div className="move-row">
                <span className="move-number">
                  {t(startNumber + row)}
                  {t(".")}
                </span>
                {t(
                  [0, 1].map((col) => {
                    const index = row * 2 + col - offset;
                    const item = review.find((r) => r.ply === index + 1);
                    const book = bookMoves[index];
                    const label = book
                      ? LABELS.book
                      : item && LABELS[item.annotation];
                    const Cell = onChange ? "button" : "span";
                    return index < 0 || index >= moves.length ? (
                      <span key={col} />
                    ) : (
                      <Cell
                        key={col}
                        aria-current={ply === index + 1 ? "step" : undefined}
                        className={`move-cell ${ply === index + 1 ? "current" : ""}`}
                        onClick={
                          onChange ? () => onChange(index + 1) : undefined
                        }
                      >
                        <NotationMove
                          san={moves[index]}
                          color={(index + offset) % 2 ? "b" : "w"}
                        />
                        {t(
                          variations.some(
                            (branch) =>
                              isRootVariation(branch) &&
                              branch.forkPly === index,
                          ) && (
                            <span
                              className="notation-fork"
                              title={t("Ada variasi dari posisi ini")}
                              aria-label={t("Ada variasi")}
                            >
                              {t("↳")}
                            </span>
                          ),
                        )}
                        {t(
                          durations[index] !== undefined && (
                            <span
                              className="move-think-time"
                              title={t("Waktu berpikir")}
                            >
                              {t(formatMoveDuration(durations[index]!))}
                            </span>
                          ),
                        )}
                        {t(
                          label && (
                            <span
                              className="move-symbol"
                              style={{ color: label.color }}
                              title={t(
                                book
                                  ? `Book Move · ${book.name} (${book.eco})`
                                  : label.label,
                              )}
                            >
                              {t(
                                book ? (
                                  <BookOpen
                                    size={13}
                                    aria-label={t("Book Move")}
                                  />
                                ) : (
                                  label.symbol
                                ),
                              )}
                            </span>
                          ),
                        )}
                      </Cell>
                    );
                  }),
                )}
              </div>
              {t(
                variations.map((branch, branchIndex) =>
                  isRootVariation(branch) &&
                  Math.min(
                    Math.floor((branch.forkPly + offset) / 2),
                    rows - 1,
                  ) === row
                    ? renderVariation(branch, branchIndex)
                    : null,
                ),
              )}
            </Fragment>
          ))
        ) : (
          <div className="empty-inline">
            {t("Belum ada langkah. Mainkan buah di papan untuk memulai.")}
            {t(
              variations.map((branch, branchIndex) =>
                isRootVariation(branch)
                  ? renderVariation(branch, branchIndex)
                  : null,
              ),
            )}
          </div>
        ),
      )}
    </div>
  );
}
export function ProgressRing({
  percent,
  size = 44,
}: {
  percent: number;
  size?: number;
}) {
  const { t } = useI18n();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-label={t(`${percent}% selesai`)}
    >
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity=".13"
      />
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={`${percent * 1.131} 113.1`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fill="currentColor">
        {t(percent)}
        {t("%")}
      </text>
    </svg>
  );
}
