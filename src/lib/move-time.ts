import type { GameData } from "./chess";

function clockSeconds(clock?: string): number | undefined {
  if (!clock || !/^\d+:\d{2}(?::\d{2})?(?:\.\d+)?$/.test(clock.trim())) return;
  return clock
    .trim()
    .split(":")
    .reduce((seconds, part) => seconds * 60 + Number(part), 0);
}
export function moveDurations(game: GameData): (number | undefined)[] {
  const control = game.timeControl?.match(/^(\d+)(?:\+(\d+))?$/);
  const initial =
    control && Number(game.startFen.split(" ")[5]) === 1
      ? Number(control[1])
      : undefined;
  const increment = control ? Number(control[2] || 0) : 0;
  const previous: (number | undefined)[] = [initial, initial];
  const offset = game.startFen.split(" ")[1] === "b" ? 1 : 0;
  return game.moves.map((_, index) => {
    const color = (index + offset) % 2;
    const current = clockSeconds(game.moveTimes?.[index]);
    const before = previous[color];
    previous[color] = current;
    if (current === undefined || before === undefined) return undefined;
    const elapsed = before + increment - current;
    return elapsed >= 0 ? elapsed : undefined;
  });
}
export function formatMoveDuration(seconds: number) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return minutes
    ? minutes + "m" + (remainder ? " " + remainder + "s" : "")
    : remainder + "s";
}
