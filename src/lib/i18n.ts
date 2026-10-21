import { useCallback, useSyncExternalStore } from "react";
import { ENGLISH } from "./translations";
export type Language = "id" | "en";
const eventName = "kuda-language-change";
function readLanguage(): Language {
  try {
    return JSON.parse(localStorage.getItem("kuda-settings") || "{}")
      .language === "en"
      ? "en"
      : "id";
  } catch {
    return "id";
  }
}
let language: Language = readLanguage();
export function setLanguage(next: Language) {
  if (language === next) return;
  language = next;
  if (typeof document !== "undefined") document.documentElement.lang = next;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(eventName));
}
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}
export function translate<T>(value: T, locale: Language): T {
  if (locale !== "en" || value === "kuda") return value;
  if (Array.isArray(value))
    return value.map((item) => translate(item, locale)) as T;
  if (typeof value !== "string") return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (/^[a-h][1-8] (putih|hitam) /.test(normalized)) {
    const names: Record<string, string> = {
      putih: "white",
      hitam: "black",
      raja: "king",
      menteri: "queen",
      benteng: "rook",
      gajah: "bishop",
      kuda: "knight",
      pion: "pawn",
    };
    return normalized
      .split(" ")
      .map((part) => names[part] || part)
      .join(" ") as T;
  }
  const translated = ENGLISH[normalized];
  if (translated) return value.replace(value.trim(), translated) as T;
  for (const [pattern, replacement] of DYNAMIC) {
    if (pattern.test(normalized))
      return normalized.replace(pattern, replacement) as T;
  }
  let result = value as string;
  for (const [source, target] of INLINE)
    result = /^[a-z]+$/.test(source)
      ? result.replace(new RegExp(`\\b${source}\\b`, "g"), target)
      : result.split(source).join(target);
  return result as T;
}
const INLINE: [string, string][] = [
  [" adalah Book Move dalam ", " is a book move in "],
  [
    " adalah langkah Brilian: pengorbanan material yang tetap kuat menurut Stockfish. Lihat variasi engine untuk memahami kelanjutannya.",
    " is a brilliant move: a material sacrifice that remains strong according to Stockfish. Check the engine variation to understand the continuation.",
  ],
  [" melewatkan peluang taktis untuk ", " misses a tactical opportunity to "],
  ["meraih keunggulan menang", "gain a winning advantage"],
  ["mempertahankan keseimbangan", "maintain equality"],
  [". Pertimbangkan ", ". Consider "],
  [
    ", lalu periksa kelanjutannya pada variasi engine.",
    ", then check the engine continuation.",
  ],
  [
    " menurunkan estimasi peluang menang ",
    " reduces estimated winning chances by ",
  ],
  [" poin persentase", " percentage points"],
  [
    ", lalu lihat variasi engine untuk memahami respons lawan.",
    ", then inspect the engine line to understand the response.",
  ],
  ["sesuai pilihan utama Stockfish", "matches Stockfish's top choice"],
  ["mempertahankan posisi dengan baik", "maintains a good position"],
  [
    "Lanjutkan dengan memeriksa ancaman lawan dan aktivitas buah.",
    "Continue by checking the opponent's threats and piece activity.",
  ],
  ["Langkah ini menangkap buah lawan.", "This move captures an enemy piece."],
  [
    "Rokade mengamankan raja dan mengaktifkan benteng.",
    "Castling secures the king and activates the rook.",
  ],
  ["Stockfish menyarankan ", "Stockfish recommends "],
  [
    "Raja sedang skak: tangani ancaman terlebih dahulu.",
    "The king is in check: deal with the threat first.",
  ],
  [
    "Material seimbang. Perhatikan aktivitas buah dan keselamatan raja.",
    "Material is equal. Consider piece activity and king safety.",
  ],
  ["Selisih material ", "Material difference: "],
  [" poin untuk ", " points for "],
  [
    ". Evaluasi juga memperhitungkan posisi.",
    ". The evaluation also considers the position.",
  ],
  ["Langkah berikutnya: ", "Next move: "],
  [
    ". Ingat ide perkembangan dan kontrol pusat.",
    ". Remember development and central control.",
  ],
  ["Tepat! ", "Correct! "],
  [" juga memberi skakmat.", " also delivers checkmate."],
  ["Lihat posisi ply ", "View position at ply "],
  ["Navigasi Kuda Chess Studio", "Kuda Chess Studio navigation"],
  [" · Skak!", " · Check!"],
  ["Putih melangkah", "White to move"],
  ["Hitam melangkah", "Black to move"],
  ["putih", "white"],
  ["hitam", "black"],
  ["menteri", "queen"],
  ["benteng", "rook"],
  ["gajah", "bishop"],
  ["pion", "pawn"],
  ["raja", "king"],
];
const DYNAMIC: [RegExp, string][] = [
  [/^Langkah (.*)$/, "Move $1"],
  [/^Variasi (.*)$/, "Variation $1"],
  [/^↳ Variasi (.*)$/, "↳ Variation $1"],
  [/^dari Variasi (.*)$/, "from Variation $1"],
  [/^Impor (.*)$/, "Import $1"],
  [/^Sisa waktu putih$/, "White's remaining time"],
  [/^Sisa waktu hitam$/, "Black's remaining time"],
  [/^Setelah (.*)$/, "After $1"],
  [/^Petak (.*) dipilih$/, "Square $1 selected"],
  [/^Analisis (.*)$/, "Analysis $1"],
  [/^Posisi (.*)$/, "Position $1"],
  [/^Latihan (.*)$/, "Practice $1"],
  [/^Pemain (.*)$/, "Player $1"],
  [/^(.*) detik$/, "$1 seconds"],
  [/^(.*) variasi$/, "$1 variations"],
  [/^Tantangan (.*)$/, "Puzzle $1"],
  [/^Rating (.*)$/, "Rating $1"],
  [/^Koleksi permainan (.*)$/, "Game library $1"],
  [/^Hapus (.*)$/, "Delete $1"],
  [/^Evaluasi putih (.*)$/, "White evaluation $1"],
];
export function useI18n() {
  const locale = useSyncExternalStore(
    subscribe,
    () => language,
    () => "id" as Language,
  );
  const t = useCallback(<T>(value: T): T => translate(value, locale), [locale]);
  return { t, language: locale };
}
