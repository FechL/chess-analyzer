import { BookOpen, ChevronRight, CircleHelp, FolderHeart, GraduationCap, Settings2 } from "lucide-react";
import { useI18n } from "../lib/i18n";
import Title from "../components/Title";

const items = [
  { id: "openings", label: "Opening explorer", icon: BookOpen },
  { id: "academy", label: "Akademi catur", icon: GraduationCap },
  { id: "library", label: "Koleksi permainan", icon: FolderHeart },
  { id: "settings", label: "Pengaturan", icon: Settings2 },
  { id: "help", label: "Panduan & referensi", icon: CircleHelp },
];

export default function MorePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="page more-page">
      <a className="more-brand" href="#home" aria-label={t("Beranda")} onClick={(event) => { event.preventDefault(); onNavigate("home"); }}>
        <span className="brand-icon"><img src="/pieces/wN.svg" alt="" /></span>
        <span><strong>kuda</strong><small>CHESS STUDIO</small></span>
      </a>
      <Title as="h1">{t("Lainnya")}</Title>
      <div className="more-menu">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onNavigate(id)}>
            <Icon size={21} aria-hidden="true" />
            <span>{t(label)}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
