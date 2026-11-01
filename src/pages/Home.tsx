import {
  ArrowRight,
  BookOpen,
  Swords,
  Target,
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
    {
      id: "academy",
      title: "Akademi catur",
      icon: GraduationCap,
      text: "Pelajari dasar catur dan tingkatkan keterampilanmu.",
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
      <div className="home-activities">
        {activities.map(({ id, title, icon: Icon, text }) => (
          <button
            key={id}
            className="home-activity"
            onClick={() => onNavigate(id)}
          >
            <span className="home-activity-icon" aria-hidden="true">
              <Icon />
            </span>
            <Title as="h2">{t(title)}</Title>
            <p>{t(text)}</p>
            {id === "academy" && (
              <small className="home-academy-progress">
                {completedCount} {t("pelajaran selesai")}
              </small>
            )}
            <ArrowRight size={17} className="home-activity-arrow" />
          </button>
        ))}
      </div>
      <HomeGames saved={saved} onLoad={onLoad} />
    </div>
  );
}
