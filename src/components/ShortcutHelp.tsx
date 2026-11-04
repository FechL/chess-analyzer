import { CircleHelp } from "lucide-react";
import { useI18n } from "../lib/i18n";
import Title from "./Title";
import { DashboardPopover, DashboardPopoverContent, DashboardPopoverTrigger } from "./block/dashboard-shell";

const entry = (key: string, id: string, en: string) => ({ key, id, en });
const shortcuts = {
  navigate: entry("← / →", "Melihat posisi sebelumnya atau berikutnya tanpa mengubah notasi permainan.", "View the previous or next position without changing the game notation."),
  start: entry("Shift+←", "Langsung menuju posisi awal pada notasi yang sedang dibuka.", "Jump to the starting position of the notation you are viewing."),
  end: entry("Shift+→", "Langsung menuju posisi terakhir pada notasi yang sedang dibuka.", "Jump to the final position of the notation you are viewing."),
  flip: entry("F", "Membalik orientasi papan antara sudut pandang putih dan hitam.", "Flip the board between White's and Black's perspective."),
  mainline: entry("R", "Kembali dari variasi ke posisi percabangan pada notasi asli.", "Return from a variation to its branching position in the original game."),
  engine: entry("E", "Mengaktifkan atau menonaktifkan analisis engine langsung untuk posisi di papan.", "Turn live engine analysis of the current board position on or off."),
  arrows: entry("A", "Menampilkan atau menyembunyikan panah langkah rekomendasi engine.", "Show or hide the engine's recommended move arrows."),
  evaluation: entry("V", "Menampilkan atau menyembunyikan bar evaluasi posisi.", "Show or hide the position evaluation bar."),
  categories: entry("C", "Menampilkan atau menyembunyikan kategori langkah pada buah yang baru bergerak.", "Show or hide the move category on the piece that just moved."),
  newGame: entry("Shift+N", "Membuka pilihan permainan baru dari posisi awal atau susunan buah kustom.", "Open a new game from the starting position or a custom piece setup."),
  importGame: entry("Shift+I", "Membuka pilihan impor permainan dari PGN/FEN, tautan, akun publik, atau koleksi.", "Open game import from PGN/FEN, a link, a public account, or your library."),
  save: entry("Shift+S", "Menyimpan permainan yang sedang dibuka ke koleksi permainan.", "Save the currently open game to your game library."),
  pause: entry("P", "Menjeda atau melanjutkan permainan dan timer. Tersedia pada mode bantuan dan bantuan penuh.", "Pause or resume the game and clock. Available in Assisted and Full Assistance modes."),
  hint: entry("H", "Meminta petunjuk langkah untuk posisi saat ini.", "Request a move hint for the current position."),
  undo: entry("U", "Membatalkan giliran terakhir dan mengembalikan posisi sebelumnya.", "Undo the last turn and restore the previous position."),
  threats: entry("T", "Menampilkan atau menyembunyikan penanda petak yang diserang lawan.", "Show or hide the squares attacked by your opponent."),
  premoves: entry("Esc", "Membatalkan seluruh langkah premove yang masih berada dalam antrean.", "Cancel all premoves still waiting in the queue."),
  openingNavigate: entry("← / →", "Pada Lesson, meninjau langkah sebelumnya atau berikutnya dalam line yang sedang dipelajari.", "In Lesson, browse the previous or next move of the line you are learning."),
  openingStart: entry("Shift+←", "Pada Lesson, kembali ke posisi awal line yang sedang dipelajari.", "In Lesson, jump to the starting position of the current line."),
  openingEnd: entry("Shift+→", "Pada Lesson, menuju langkah terakhir yang sudah tersedia dalam line.", "In Lesson, jump to the last available move in the current line."),
  learnArrows: entry("A", "Mengaktifkan atau menonaktifkan panah petunjuk langkah. Panah hanya tampil pada mode Learn.", "Turn move guidance arrows on or off. These arrows appear only in Learn mode."),
  repeatLine: entry("R", "Pada Lesson, mengulang line dari awal. Saat meninjau langkah, kembali dahulu ke posisi latihan aktif.", "In Lesson, repeat the current line from the start. While browsing moves, return to the active training position first."),
  nextLine: entry("N", "Membuka line berikutnya pada mode yang sama setelah syarat penyelesaian dan pembukaannya terpenuhi.", "Open the next line in the same mode after its completion and unlock requirements are met."),
  openingHint: entry("H", "Pada Lesson, menampilkan petunjuk langkah latihan. Penggunaan petunjuk dihitung pada hasil Practice.", "In Lesson, reveal a move hint. Hint use counts toward your Practice result."),
  puzzleNavigate: entry("← / →", "Meninjau langkah solusi setelah puzzle selesai atau solusi ditampilkan.", "Browse solution moves after completing the puzzle or revealing its solution."),
  puzzleStart: entry("Shift+←", "Saat solusi dapat ditinjau, langsung kembali ke posisi awal puzzle.", "When solution review is available, jump to the puzzle's starting position."),
  puzzleEnd: entry("Shift+→", "Saat solusi dapat ditinjau, langsung menuju posisi akhir solusi.", "When solution review is available, jump to the solution's final position."),
  puzzleHint: entry("H", "Menampilkan atau menyembunyikan petunjuk selama puzzle belum selesai.", "Show or hide a move hint while the puzzle is still in progress."),
};
export type ShortcutHelpId = keyof typeof shortcuts;

export default function ShortcutHelp({ items }: { items: readonly ShortcutHelpId[] }) {
  const { t, language } = useI18n();
  return (
    <DashboardPopover>
      <DashboardPopoverTrigger asChild>
        <button className="icon-button shortcut-help-button" aria-label={t("Pintasan lainnya")} title={t("Pintasan lainnya")}>
          <CircleHelp size={16} aria-hidden="true" />
        </button>
      </DashboardPopoverTrigger>
      <DashboardPopoverContent className="shortcut-help-popover keyboard-shortcut-popover" align="end" side="top" aria-label={t("Pintasan lainnya")}>
        <Title as="strong">{t("Panduan pintasan keyboard")}</Title>
        <dl>
          {items.map((id) => {
            const item = shortcuts[id];
            return <div key={id}><dt><kbd>{item.key}</kbd></dt><dd>{language === "en" ? item.en : item.id}</dd></div>;
          })}
        </dl>
      </DashboardPopoverContent>
    </DashboardPopover>
  );
}
