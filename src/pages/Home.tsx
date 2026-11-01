import {
  ArrowRight,
  BookOpen,
  Grid2X2,
  Swords,
  Target,
  FolderHeart,
  GraduationCap,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import Title from "../components/Title";
import HomeGames from "../components/HomeGames";
import type { SavedGame } from "../App";
import type { GameData } from "../lib/chess";

export default function HomePage({
  onNavigate,
  saved,
  onLoad,
  completedCount,
}: {
  onNavigate: (page: string) => void;
  saved: SavedGame[];
  onLoad: (game: GameData) => void;
  completedCount: number;
}) {
  const { t } = useI18n();
  const activities = [
    {
      id: "analysis",
      title: "Analisis permainan",
      icon: Grid2X2,
      text: "Telusuri permainan dan temukan langkah yang lebih baik.",
    },
    {
      id: "bot",
      title: "Lawan bot",
      icon: Swords,
      text: "Pilih lawan dan latih permainan dengan ritmemu sendiri.",
    },
    {
      id: "puzzles",
      title: "Puzzle",
      icon: Target,
      text: "Asah taktik lewat posisi dari permainan nyata.",
    },
    {
      id: "openings",
      title: "Opening explorer",
      icon: BookOpen,
      text: "Pelajari opening, lalu latih variasinya dari ingatan.",
    },
  ];
  return (
    <div className="page home-page">
      <section className="home-welcome">
        <div>
          <span className="home-eyebrow">KUDA CHESS STUDIO</span>
          <Title as="h1">{t("Satu langkah lebih baik.")}</Title>
          <p>{t("Ruang untuk bermain, memahami, dan berkembang.")}</p>
          <button
            className="button primary"
            onClick={() => onNavigate("analysis")}
          >
            {t("Buka papan analisis")} <ArrowRight size={16} />
          </button>
        </div>
        <img
          className="home-knight"
          src="/pieces/wN.svg"
          alt=""
          draggable={false}
        />
      </section>
      <HomeGames saved={saved} onLoad={onLoad} />
      <div className="home-activities">
        {activities.map(({ id, title, icon: Icon, text }) => (
          <button
            key={id}
            className="home-activity"
            onClick={() => onNavigate(id)}
          >
            <span className="home-activity-icon">
              <Icon size={24} />
            </span>
            <Title as="h2">{t(title)}</Title>
            <p>{t(text)}</p>
            <ArrowRight size={17} className="home-activity-arrow" />
          </button>
        ))}
      </div>
      <div className="home-personal">
        <button
          className="home-personal-link"
          onClick={() => onNavigate("library")}
        >
          <FolderHeart size={21} />
          <span>
            <Title as="strong">{t("Koleksi permainan")}</Title>
            <small>
              {saved.length} {t("permainan tersimpan")}
            </small>
          </span>
          <ArrowRight size={16} />
        </button>
        <button
          className="home-personal-link"
          onClick={() => onNavigate("academy")}
        >
          <GraduationCap size={21} />
          <span>
            <Title as="strong">{t("Akademi catur")}</Title>
            <small>
              {completedCount} {t("pelajaran selesai")}
            </small>
          </span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
