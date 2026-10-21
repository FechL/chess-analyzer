import { parseGame } from "./chess";
import type { GameData } from "./chess";

export type OnlineGame = {
  id: string;
  game: GameData;
  date: number;
  speed: string;
};
export function normalizeUsername(value: string) {
  const username = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(username))
    throw new Error("Masukkan username, bukan tautan profil.");
  return username;
}

async function readRemote(
  url: string,
  signal: AbortSignal,
  accept = "application/json",
  maxBytes = 12 * 1024 * 1024,
) {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    headers: { Accept: accept },
    credentials: "omit",
  });
  if (!response.ok) {
    if (response.status === 404)
      throw new Error("Username atau permainan tidak ditemukan.");
    if (response.status === 429)
      throw new Error(
        "Batas permintaan platform tercapai. Tunggu sebentar sebelum mencoba lagi.",
      );
    throw new Error(
      `Platform gagal merespons (${response.status}). Coba lagi nanti.`,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Data permainan tidak dapat dibaca.");
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error(
          "Data terlalu besar. Gunakan ekspor satu permainan PGN.",
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function chessArchives(
  username: string,
  signal: AbortSignal,
): Promise<string[]> {
  const data = JSON.parse(
    await readRemote(
      `https://api.chess.com/pub/player/${encodeURIComponent(normalizeUsername(username))}/games/archives`,
      signal,
    ),
  );
  if (!Array.isArray(data.archives))
    throw new Error("Format arsip Chess.com tidak dikenali.");
  return data.archives
    .filter(
      (url: unknown): url is string =>
        typeof url === "string" &&
        /^https:\/\/api\.chess\.com\/pub\/player\/[^/]+\/games\/\d{4}\/\d{2}$/.test(
          url,
        ),
    )
    .reverse();
}

export async function chessMonth(
  url: string,
  signal: AbortSignal,
): Promise<OnlineGame[]> {
  if (
    !/^https:\/\/api\.chess\.com\/pub\/player\/[^/]+\/games\/\d{4}\/\d{2}$/.test(
      url,
    )
  )
    throw new Error("Arsip Chess.com tidak valid.");
  const data = JSON.parse(await readRemote(url, signal));
  if (!Array.isArray(data.games))
    throw new Error("Format permainan Chess.com tidak dikenali.");
  const games: OnlineGame[] = [];
  for (const item of data.games) {
    if (item.rules !== "chess" || typeof item.pgn !== "string") continue;
    try {
      const game = parseGame(item.pgn);
      if (!game.moves.length || game.result === "*") continue;
      games.push({
        id: item.url,
        game,
        date: item.end_time * 1000,
        speed: item.time_class ?? "Catur",
      });
    } catch {
      /* Unsupported or incomplete PGN is omitted from the list. */
    }
  }
  return games.sort((a, b) => b.date - a.date);
}

export async function lichessGames(
  username: string,
  signal: AbortSignal,
  until?: number,
) {
  const params = new URLSearchParams({
    max: "20",
    pgnInJson: "true",
    clocks: "false",
    evals: "false",
    ongoing: "false",
    finished: "true",
    sort: "dateDesc",
  });
  if (until) params.set("until", String(until));
  const text = await readRemote(
    `https://lichess.org/api/games/user/${encodeURIComponent(normalizeUsername(username))}?${params}`,
    signal,
    "application/x-ndjson",
  );
  const records = text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const games: OnlineGame[] = [];
  for (const item of records) {
    if (item.variant !== "standard" || typeof item.pgn !== "string") continue;
    try {
      const game = parseGame(item.pgn);
      if (!game.moves.length || game.result === "*") continue;
      games.push({
        id: item.id,
        game,
        date: item.createdAt,
        speed: item.speed ?? "Catur",
      });
    } catch {
      /* Unsupported or incomplete PGN is omitted from the list. */
    }
  }
  const dates = records.map((item) => item.createdAt).filter(Number.isFinite);
  return {
    games,
    next:
      records.length === 20 && dates.length
        ? Math.min(...dates) - 1
        : undefined,
  };
}

export async function importPgnUrl(value: string, signal: AbortSignal) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Masukkan tautan PGN yang valid.");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Gunakan tautan HTTPS langsung ke satu permainan PGN.");
  const text = await readRemote(
    url.href,
    signal,
    "application/x-chess-pgn, text/plain",
    2 * 1024 * 1024,
  );
  try {
    return parseGame(text);
  } catch {
    throw new Error(
      "Tautan harus mengarah langsung ke satu PGN, bukan halaman permainan. Anda juga bisa mengunduh PGN lalu mengunggahnya.",
    );
  }
}

export function onlineError(error: unknown) {
  if (error instanceof TypeError)
    return "Tidak dapat menghubungi sumber. Periksa internet; jika situs membatasi akses browser, unduh PGN lalu unggah berkasnya.";
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "Permintaan terlalu lama. Coba lagi sebentar lagi.";
  return error instanceof Error ? error.message : "Gagal mengambil permainan.";
}
