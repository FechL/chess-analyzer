import rawLessons from "./academy-lessons.json";
import type { Exercise } from "./content";

// Original instructional positions and explanations; references guide the syllabus.
export const ACADEMY_ENGLISH: Record<string, string> = {
  "Gerak buah": "Piece Movement",
  Semua: "All",
  dari: "of",
  "Mulai pelajaran": "Start Lesson",
  "MULAI DARI FONDASI": "START WITH THE FOUNDATIONS",
  "Pion d5 dapat maju ke d6 dan menyerang kuda e7 yang terikat.":
    "The d5 pawn can advance to d6 and attack the pinned e7 knight.",
  "d6 menyerang kuda e7 yang terikat pada raja e8 oleh benteng e1. Kuda tidak boleh meninggalkan lajur e; hitam harus mencari pertahanan lain.":
    "d6 attacks the e7 knight, pinned to the e8 king by the e1 rook. The knight cannot leave the e-file; Black must find another defense.",
  Strategi: "Strategy",
  "Kenali papan dan buah": "Meet the Board and Pieces",
  "Gerak, tangkapan, koordinat, dan notasi dasar.":
    "Movement, captures, coordinates, and basic notation.",
  "Mainkan permainan pertama": "Play Your First Game",
  "Skak, nilai buah, pusat, perkembangan, dan keselamatan raja.":
    "Check, piece values, the center, development, and king safety.",
  "Pahami aturan khusus": "Understand Special Rules",
  "Rokade dan en passant melalui posisi latihan.":
    "Castling and en passant through training positions.",
  "Temukan peluang taktis": "Find Tactical Opportunities",
  "Fork, pin, skewer, serangan terbuka, dan kombinasi.":
    "Forks, pins, skewers, discovered attacks, and combinations.",
  "Bangun rencana": "Build a Plan",
  "Lajur terbuka, pos kuat, terobosan pion, dan pencegahan.":
    "Open files, outposts, pawn breaks, and prevention.",
  "Tuntaskan serangan": "Finish the Attack",
  "Mat baris belakang, menteri, benteng, dan pola tangga.":
    "Back-rank mates, queen mates, rook mates, and the ladder pattern.",
  "Ubah keunggulan menjadi hasil": "Convert Your Advantage",
  "Aktivitas raja, oposisi, pion bebas, dan promosi.":
    "King activity, opposition, passed pawns, and promotion.",
  "Jalur belajar": "Learning Paths",
  "Semua tingkat": "All Levels",
  "Semua status": "All Statuses",
  "Belum selesai": "Not Completed",
  "Tingkat pelajaran": "Lesson Level",
  "Status pelajaran": "Lesson Status",
  "Cari pelajaran": "Search Lessons",
  "Cari topik atau pelajaran…": "Search topics or lessons…",
  pelajaran: "lessons",
  "Tidak ada pelajaran yang cocok. Coba ubah filter pencarian.":
    "No lessons match. Try changing the search filters.",
  "Referensi kurikulum": "Curriculum References",
  "Materi dan posisi latihan disusun untuk Kuda. Platform berikut menjadi referensi cakupan dan urutan belajar, bukan penyedia salinan kursus.":
    "The teaching material and training positions were created for Kuda. These platforms inform the scope and sequence of learning; their courses are not reproduced here.",
  "Kurikulum aturan, prinsip opening, taktik, dan pola mat.":
    "Rules, opening principles, tactics, and mating patterns.",
  "Tahapan belajar dan pembagian waktu latihan.":
    "Learning stages and allocating study time.",
  "Belajar gerak buah dan aturan melalui papan interaktif.":
    "Learning piece movement and rules through an interactive board.",
  "Pengelompokan motif taktik, skakmat, dan endgame.":
    "Grouping tactical motifs, checkmates, and endgames.",
  "Mulai dari gerak buah, pahami aturan, lalu latih taktik, strategi, dan endgame. Setiap pelajaran memiliki penjelasan, petunjuk, serta latihan di papan.":
    "Start with piece movement and the rules, then practice tactics, strategy, and endgames. Every lesson includes explanations, hints, and board exercises.",
  "Pelajaran selesai": "Lesson Complete",
  "Pelajaran berikutnya": "Next Lesson",
  "Kembali ke akademi": "Back to Academy",
};
function text(pair: string[]) {
  ACADEMY_ENGLISH[pair[0]] = pair[1];
  return pair[0];
}
export const ACADEMY_LESSONS: Exercise[] = rawLessons.map((lesson) => ({
  ...lesson,
  title: text(lesson.title),
  description: text(lesson.description),
  hint: text(lesson.hint),
  explanation: text(lesson.explanation),
  theory: lesson.theory.map(text),
}));

export const ACADEMY_MODULES = [
  {
    category: "Gerak buah",
    title: "Kenali papan dan buah",
    description: "Gerak, tangkapan, koordinat, dan notasi dasar.",
  },
  {
    category: "Dasar",
    title: "Mainkan permainan pertama",
    description: "Skak, nilai buah, pusat, perkembangan, dan keselamatan raja.",
  },
  {
    category: "Aturan khusus",
    title: "Pahami aturan khusus",
    description: "Rokade dan en passant melalui posisi latihan.",
  },
  {
    category: "Taktik",
    title: "Temukan peluang taktis",
    description: "Fork, pin, skewer, serangan terbuka, dan kombinasi.",
  },
  {
    category: "Strategi",
    title: "Bangun rencana",
    description: "Lajur terbuka, pos kuat, terobosan pion, dan pencegahan.",
  },
  {
    category: "Skakmat",
    title: "Tuntaskan serangan",
    description: "Mat baris belakang, menteri, benteng, dan pola tangga.",
  },
  {
    category: "Endgame",
    title: "Ubah keunggulan menjadi hasil",
    description: "Aktivitas raja, oposisi, pion bebas, dan promosi.",
  },
];
export const ACADEMY_REFERENCES = [
  {
    name: "Chess.com · Lessons",
    url: "https://www.chess.com/lessons/skill-level/beginner",
    focus: "Kurikulum aturan, prinsip opening, taktik, dan pola mat.",
  },
  {
    name: "Chess.com · Study Plans",
    url: "https://www.chess.com/article/view/study-plan-directory",
    focus: "Tahapan belajar dan pembagian waktu latihan.",
  },
  {
    name: "Lichess · Learn",
    url: "https://lichess.org/learn",
    focus: "Belajar gerak buah dan aturan melalui papan interaktif.",
  },
  {
    name: "Lichess · Practice",
    url: "https://lichess.org/practice",
    focus: "Pengelompokan motif taktik, skakmat, dan endgame.",
  },
];
