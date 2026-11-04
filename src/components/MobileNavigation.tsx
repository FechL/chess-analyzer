import { BookOpen, ChartNoAxesCombined, Ellipsis, Swords, Target } from "lucide-react";
import { useI18n } from "../lib/i18n";

const items = [
  { id: "analysis", label: "Analisis papan", icon: ChartNoAxesCombined },
  { id: "bot", label: "Lawan bot", icon: Swords },
  { id: "puzzles", label: "Puzzle", icon: Target },
  { id: "openings", label: "Kumpulan opening", icon: BookOpen },
  { id: "more", label: "Lainnya", icon: Ellipsis },
];

export default function MobileNavigation({ page, onNavigate }: {
  page: string;
  onNavigate: (page: string) => void;
}) {
  const { t } = useI18n();
  const active = items.some((item) => item.id === page) ? page : "more";
  return (
    <nav className="mobile-bottom-navigation" aria-label={t("Navigasi utama")}>
      {items.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? "page" : undefined}
          onClick={(event) => { event.preventDefault(); onNavigate(id); }}
        >
          <Icon size={22} aria-hidden="true" />
          <span>{t(label)}</span>
        </a>
      ))}
    </nav>
  );
}
