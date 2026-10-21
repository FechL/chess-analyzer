import data from "../data/opening-book.json";
export type BookMove = { eco: string; name: string };
const edges: Record<string, number> = data.edges;

// Include side to move, castling rights and legal en-passant availability;
// exclude counters so transpositions and imported FENs are recognized.
export function findBookMove(fen: string, uci: string): BookMove | undefined {
  const key = `${fen.split(" ").slice(0, 4).join(" ")}|${uci}`;
  // FNV-1a 64-bit, shared with the generator; collisions are checked at generation.
  let hash = 14695981039346656037n;
  for (let i = 0; i < key.length; i++)
    hash = BigInt.asUintN(
      64,
      (hash ^ BigInt(key.charCodeAt(i))) * 1099511628211n,
    );
  const index = edges[hash.toString(16).padStart(16, "0")];
  if (index === undefined) return;
  const [eco, name] = data.names[index];
  return { eco, name };
}
