import type { ReviewMove } from "./chess";

export function mergeReview(items: ReviewMove[], item: ReviewMove) {
  return [...items.filter((r) => r.ply !== item.ply), item].sort(
    (a, b) => a.ply - b.ply,
  );
}
export function retainReview(
  items: ReviewMove[],
  history: { before: string; after: string }[],
) {
  return items.filter(
    (item) =>
      history[item.ply - 1]?.before === item.before.fen &&
      history[item.ply - 1]?.after === item.after.fen,
  );
}
// Do not draw across positions that have not been evaluated yet.
export function reviewSegments(review: ReviewMove[]) {
  const values = new Map<number, number>();
  const sorted = [...review].sort((a, b) => a.ply - b.ply);
  for (const item of sorted) values.set(item.ply - 1, item.before.cp);
  for (const item of sorted) values.set(item.ply, item.after.cp);
  const segments: { ply: number; cp: number }[][] = [];
  for (const [ply, cp] of [...values].sort((a, b) => a[0] - b[0])) {
    const previous = segments.at(-1);
    if (previous && previous.at(-1)!.ply === ply - 1)
      previous.push({ ply, cp });
    else segments.push([{ ply, cp }]);
  }
  return { values, segments };
}
