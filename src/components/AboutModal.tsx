import { ArrowLeft, ArrowRight, BookOpen, Cpu, Grid2X2, LayoutDashboard, ShieldCheck, Swords, Target } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Modal } from "./Common";
import Title from "./Title";

const features = [
  ["Analisis permainan", "Ulas permainan lengkap, jelajahi variasi, dan simpan catatan untuk setiap posisi."],
  ["Lawan bot", "Bermain melawan bot dengan pilihan kontrol waktu dan mode bantuan."],
  ["Opening explorer", "Pelajari line opening, berlatih dari ingatan, dan uji kembali line yang sudah dikuasai."],
  ["Puzzle", "Selesaikan puzzle Lichess dan pantau waktu, streak, serta riwayat latihan."],
  ["Akademi catur", "Pelajari gerak buah, aturan catur, taktik, strategi, dan endgame melalui pelajaran interaktif."],
  ["Koleksi permainan", "Simpan permainan, tandai favorit, dan salin PGN atau FEN."],
] as const;

const sources = [
  { name: "Lichess", href: "https://lichess.org/features", icon: BookOpen, description: "Permainan publik, database opening, dan puzzle" },
  { name: "Chess.com", href: "https://www.chess.com/analysis", icon: Grid2X2, description: "Permainan publik dan referensi ulasan permainan" },
  { name: "Chessify", href: "https://chessify.me/analysis", icon: Cpu, description: "Referensi fitur analisis dan variasi engine" },
  { name: "ChessTempo", href: "https://chesstempo.com/chess-tactics/", icon: Target, description: "Referensi latihan dan motif taktik" },
  { name: "ObsidianUI", href: "https://www.obsidianui.dev/docs/dashboard-shell", icon: LayoutDashboard, description: "Komponen antarmuka berbasis React dan Tailwind" },
  { name: "Stockfish.js", href: "https://github.com/nmrugg/stockfish.js", icon: Swords, description: "Engine lokal WebAssembly · GPL v3" },
];

function AboutContent() {
  const { t } = useI18n();
  return (
    <div className="help-layout">
        <div className="prose">
          <Title as="h3">Kuda Chess Studio</Title>
          <p>{t("Ruang untuk menganalisis permainan dan berlatih catur, langsung di browser Anda.")}</p>
          <ul>
            {features.map(([name, description]) => (
              <li key={name}><Title as="strong">{t(name)}</Title>{": "}{t(description)}</li>
            ))}
          </ul>
          <div className="study-tip">
            <ShieldCheck size={18} />
            <p>{t("Stockfish berjalan di browser. Permainan, catatan, dan progres belajar disimpan di perangkat ini. Mengambil permainan publik atau puzzle memerlukan koneksi internet.")}</p>
          </div>
        </div>
        <div className="help-sources">
          <span className="section-label">{t("SUMBER & TEKNOLOGI")}</span>
          {sources.map(({ name, href, icon: Icon, description }) => (
            <a key={name} href={href} target="_blank" rel="noreferrer">
              <Icon size={18} />
              <div><strong>{name}</strong><span>{t(description)}</span></div>
              <ArrowRight size={15} />
            </a>
          ))}
        </div>
    </div>
  );
}

export function AboutPage({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="page about-page">
      <header className="about-page-header">
        <button className="icon-button" onClick={onBack} aria-label={t("Kembali")} title={t("Kembali")}><ArrowLeft size={20} /></button>
        <Title as="h1">{t("Tentang")}</Title>
      </header>
      <AboutContent />
    </div>
  );
}

export default function AboutModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return <Modal title={t("Tentang")} onClose={onClose} wide><AboutContent /></Modal>;
}
