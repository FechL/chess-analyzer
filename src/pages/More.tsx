import { ArrowRight, BookOpen, ChevronRight, CircleHelp, FolderHeart, GraduationCap, Settings2 } from "lucide-react";
import { useI18n } from "../lib/i18n";
import Title from "../components/Title";

const items = [
  { id: "openings", label: "Opening explorer", icon: BookOpen },
  { id: "academy", label: "Akademi catur", icon: GraduationCap },
  { id: "library", label: "Koleksi permainan", icon: FolderHeart },
  { id: "settings", label: "Pengaturan", icon: Settings2 },
  { id: "help", label: "Panduan & referensi", icon: CircleHelp },
];

export default function MorePage({ onNavigate, completedCount = 0 }: { onNavigate: (page: string) => void; completedCount?: number }) {
  const { t } = useI18n();
  return (
    <div className="page more-page">
      <a className="more-brand" href="#home" aria-label={t("Beranda")} onClick={(event) => { event.preventDefault(); onNavigate("home"); }}>
        <span className="brand-icon"><img src="/pieces/wN.svg" alt="" /></span>
        <span><strong>kuda</strong><small>CHESS STUDIO</small></span>
      </a>
      <Title as="h1">{t("Lainnya")}</Title>
      <div className="home-activities more-learning-cards">
        {items.filter((item) => item.id === "academy").map(({ id, label, icon: Icon }) => (
          <button key={id} className="home-activity" onClick={() => onNavigate(id)}>
            <span className="home-activity-icon" aria-hidden="true"><Icon /></span>
            <Title as="h2">{t(label)}</Title>
            <p>{t("Pelajari dasar catur dan tingkatkan keterampilanmu.")}</p>
            {id === "academy" && <small className="home-academy-progress">{completedCount} {t("pelajaran selesai")}</small>}
            <ArrowRight size={17} className="home-activity-arrow" />
          </button>
        ))}
      </div>
      <div className="more-menu">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} data-learning={id === "openings" || id === "academy" ? true : undefined} onClick={() => onNavigate(id)}>
            <Icon size={21} aria-hidden="true" />
            <span>{t(label)}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
