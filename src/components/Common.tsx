import { useEffect, useRef } from "react";
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
import type { ReviewMove } from "../lib/chess";
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
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" aria-label="Tutup" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
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
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function NavigationControls({
  ply,
  total,
  onChange,
  onFlip,
}: {
  ply: number;
  total: number;
  onChange: (n: number) => void;
  onFlip?: () => void;
}) {
  return (
    <div className="board-controls">
      <span className="move-position">
        {ply === 0 ? "Posisi awal" : `Langkah ${Math.ceil(ply / 2)}`}
        <span> / {Math.ceil(total / 2)}</span>
      </span>
      <div className="navigation-buttons">
        <IconButton
          label="Ke posisi awal"
          onClick={() => onChange(0)}
          disabled={ply === 0}
        >
          <ChevronsLeft size={19} />
        </IconButton>
        <IconButton
          label="Langkah sebelumnya"
          onClick={() => onChange(Math.max(0, ply - 1))}
          disabled={ply === 0}
        >
          <ChevronLeft size={20} />
        </IconButton>
        <IconButton
          label="Langkah berikutnya"
          onClick={() => onChange(Math.min(total, ply + 1))}
          disabled={ply === total}
        >
          <ChevronRight size={20} />
        </IconButton>
        <IconButton
          label="Ke posisi terakhir"
          onClick={() => onChange(total)}
          disabled={ply === total}
        >
          <ChevronsRight size={19} />
        </IconButton>
      </div>
      {onFlip && (
        <IconButton label="Balik papan (F)" onClick={onFlip}>
          <RotateCw size={16} />
        </IconButton>
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
  return (
    <div className="player-row">
      <span className={`player-avatar ${color}`}>
        <img src={`/pieces/${color}K.svg`} alt="" />
      </span>
      <div className="player-name">
        <strong>{name}</strong>
        <span>{subtitle || (color === "w" ? "Buah putih" : "Buah hitam")}</span>
      </div>
      <span className={`player-turn ${active ? "is-active" : ""}`} />
      {right}
    </div>
  );
}
export function MoveList({
  moves,
  ply,
  onChange,
  review = [],
  bookMoves = [],
  startFen,
}: {
  moves: string[];
  ply: number;
  onChange?: (n: number) => void;
  review?: ReviewMove[];
  bookMoves?: (BookMove | undefined)[];
  startFen: string;
}) {
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
  }, [ply]);
  const c = new Chess(startFen);
  const startNumber = Number(startFen.split(" ")[5]);
  const offset = c.turn() === "b" ? 1 : 0;
  const rows = Math.ceil((moves.length + offset) / 2);
  return (
    <div className="move-list" ref={ref}>
      {moves.length ? (
        Array.from({ length: rows }, (_, row) => (
          <div className="move-row" key={row}>
            <span className="move-number">{startNumber + row}.</span>
            {[0, 1].map((col) => {
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
                  onClick={onChange ? () => onChange(index + 1) : undefined}
                >
                  <span>{moves[index]}</span>
                  {label && (
                    <span
                      className="move-symbol"
                      style={{ color: label.color }}
                      title={
                        book
                          ? `Book Move · ${book.name} (${book.eco})`
                          : label.label
                      }
                    >
                      {book ? (
                        <BookOpen size={13} aria-label="Book Move" />
                      ) : (
                        label.symbol
                      )}
                    </span>
                  )}
                </Cell>
              );
            })}
          </div>
        ))
      ) : (
        <div className="empty-inline">
          Belum ada langkah. Mainkan buah di papan untuk memulai.
        </div>
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-label={`${percent}% selesai`}
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
        {percent}%
      </text>
    </svg>
  );
}
