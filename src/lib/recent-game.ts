import type { GameData } from "./chess";

export function recentGameOutcome(game: GameData, username: string) {
  const name = username.trim().toLowerCase();
  const side =
    game.white.toLowerCase() === name
      ? "w"
      : game.black.toLowerCase() === name
        ? "b"
        : undefined;
  if (!side) return undefined;
  if (game.result === "1/2-1/2") return "draw";
  if (!["1-0", "0-1"].includes(game.result)) return undefined;
  return (game.result === "1-0") === (side === "w") ? "win" : "loss";
}

export function recentGameScores(result: string) {
  if (result === "1-0") return ["1", "0"];
  if (result === "0-1") return ["0", "1"];
  if (result === "1/2-1/2") return ["½", "½"];
  return ["—", "—"];
}

export function recentTimeControl(control?: string, fallback = "—") {
  if (control === "-") return "∞";
  const match = control?.match(/^(\d+)(?:\+(\d+))?$/);
  if (match) {
    const seconds = Number(match[1]);
    const base =
      seconds < 60 ? `${seconds}s` : `${Number((seconds / 60).toFixed(1))} min`;
    return Number(match[2]) > 0 ? `${base} + ${match[2]}s` : base;
  }
  const daily = control?.match(/^1\/(\d+)$/);
  if (daily) return `${Number(daily[1]) / 86400}d`;
  return fallback;
}
