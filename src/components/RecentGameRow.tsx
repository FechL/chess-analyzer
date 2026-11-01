import {
  CalendarDays,
  Clock3,
  Hourglass,
  Rocket,
  SquareEqual,
  SquareMinus,
  SquarePlus,
  createLucideIcon,
  Zap,
} from "lucide-react";

import { useI18n } from "../lib/i18n";
import type { GameAccuracy } from "../lib/game-accuracy";
import type { OnlineGame } from "../lib/online-games";
import {
  recentGameOutcome,
  recentGameScores,
  recentTimeControl,
} from "../lib/recent-game";

const BulletIcon = createLucideIcon("Bullet", [
  ["path", { d: "M8 21V9c0-4 4-7 4-7s4 3 4 7v12Z", key: "body" }],
  ["path", { d: "M8 15h8M8 18h8", key: "base" }],
]);

const timeClasses = {
  ultrabullet: { icon: Rocket, kind: "ultrabullet" },
  bullet: { icon: BulletIcon, kind: "bullet" },
  blitz: { icon: Zap, kind: "blitz" },
  rapid: { icon: Clock3, kind: "rapid" },
  classical: { icon: Hourglass, kind: "classical" },
  daily: { icon: CalendarDays, kind: "daily" },
  correspondence: { icon: CalendarDays, kind: "daily" },
};

export default function RecentGameRow({
  item,
  accuracy,
  username,
  dateLabel,
  onOpen,
}: {
  item: OnlineGame;
  accuracy?: GameAccuracy;
  username: string;
  dateLabel: string;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const { game } = item;
  const timeClass =
    timeClasses[item.speed.toLowerCase() as keyof typeof timeClasses];
  const TimeIcon = timeClass?.icon ?? Clock3;
  const outcome = recentGameOutcome(game, username);
  const scores = recentGameScores(game.result);
  const resultLabel =
    outcome === "win"
      ? t("Menang")
      : outcome === "loss"
        ? t("Kalah")
        : outcome === "draw"
          ? t("Seri")
          : game.result;
  const ResultIcon =
    outcome === "win"
      ? SquarePlus
      : outcome === "loss"
        ? SquareMinus
        : SquareEqual;
  return (
    <button
      className="home-game-row"
      data-recent-game
      onClick={onOpen}
      title={dateLabel}
    >
      <span
        className={`home-recent-control time-${timeClass?.kind ?? "other"}`}
      >
        <span className="home-recent-time" title={item.speed}>
          <TimeIcon size={16} aria-hidden="true" />
          <small>{recentTimeControl(game.timeControl, item.speed)}</small>
        </span>
        <time
          className="home-recent-date"
          dateTime={
            Number.isFinite(item.date)
              ? new Date(item.date).toISOString()
              : undefined
          }
        >
          {dateLabel}
        </time>
      </span>
      <span className="home-recent-players">
        {(
          [
            ["w", game.white, game.whiteElo],
            ["b", game.black, game.blackElo],
          ] as const
        ).map(([color, name, rating]) => (
          <span className="home-recent-player" key={color}>
            <span
              className={`home-recent-side side-${color}`}
              role="img"
              aria-label={t(color === "w" ? "Putih" : "Hitam")}
            />
            <strong title={name}>{name}</strong>
            {Number(rating) > 0 && (
              <span className="home-recent-rating">({rating})</span>
            )}
          </span>
        ))}
      </span>
      {accuracy && (
        <span
          className="home-recent-accuracy"
          title={t("Akurasi")}
          aria-label={t("Akurasi")}
        >
          <span>
            {accuracy.white !== undefined ? `${accuracy.white}%` : "—"}
          </span>
          <span>
            {accuracy.black !== undefined ? `${accuracy.black}%` : "—"}
          </span>
        </span>
      )}
      <span className="home-recent-score" aria-label={game.result}>
        <span>{scores[0]}</span>
        <span>{scores[1]}</span>
      </span>
      <span
        className={`home-recent-outcome ${outcome || "unknown"}`}
        title={resultLabel}
        role="img"
        aria-label={resultLabel}
      >
        <ResultIcon size={18} aria-hidden="true" />
      </span>
    </button>
  );
}
