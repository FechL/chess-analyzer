import type { GameData, GameVariation } from "./chess";

/** Follow nested branches back to the original main-line departure point. */
export function mainlineReturnPly(game: GameData, variation?: GameVariation) {
  if (!variation) return 0;
  const seen = new Set<string>();
  let branch = variation;
  while (branch.parentId && !seen.has(branch.id)) {
    seen.add(branch.id);
    const parent = game.variations?.find((item) => item.id === branch.parentId);
    if (!parent || seen.has(parent.id)) break;
    branch = parent;
  }
  return Math.max(0, Math.min(branch.forkPly, game.moves.length));
}
