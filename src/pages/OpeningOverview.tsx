import { ExternalLink, Lightbulb } from "lucide-react";
import type { Opening } from "../data/content";
import { OPENING_OVERVIEWS } from "../data/opening-overviews";
import { useI18n } from "../lib/i18n";

export default function OpeningOverview({ opening }: { opening: Opening }) {
  const { t, language } = useI18n();
  const overview = OPENING_OVERVIEWS[opening.id];
  if (!overview) return null;
  const chesscom = `https://www.chess.com/openings/${overview.chesscom}`;
  const wikipedia = `https://en.wikipedia.org/wiki/${overview.wikipedia}`;
  const sources = [
    {
      name: "Chess.com",
      href: chesscom,
      note: "Dasar, strategi, dan sejarah opening",
    },
    {
      name: "Wikipedia",
      href: wikipedia,
      note: "Bacaan lanjutan dan konteks sejarah",
    },
    {
      name: "Lichess · CC0",
      href: "https://github.com/lichess-org/chess-openings",
      note: "Database nama, kode ECO, dan variasi latihan",
    },
  ];
  return (
    <div
      className="opening-overview-panel"
      role="tabpanel"
      id="opening-overview-panel"
      aria-labelledby="opening-overview-tab"
    >
      <header className="opening-overview-intro">
        <h2>{opening.name}</h2>
        <p>{t(opening.description)}</p>
        <div
          className="opening-overview-moves"
          aria-label={t("Langkah pembuka")}
        >
          {overview.moves}
        </div>
      </header>
      <section>
        <h3>{t("Pengertian dasar")}</h3>
        <p>{overview.basics[language]}</p>
      </section>
      <section>
        <h3>{t("Sejarah singkat")}</h3>
        <p>{overview.history[language]}</p>
      </section>
      <section className="opening-lesson-theory">
        <h3>{t("Rencana opening")}</h3>
        <ol>
          {opening.ideas.map((idea, index) => (
            <li key={idea}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {t(idea)}
            </li>
          ))}
        </ol>
        <div className="opening-overview-side-plan">
          <h4>
            <span className="opening-overview-color white" aria-hidden="true" />
            {t("Rencana putih")}
          </h4>
          <p>{overview.whitePlan[language]}</p>
        </div>
        <div className="opening-overview-side-plan">
          <h4>
            <span className="opening-overview-color black" aria-hidden="true" />
            {t("Rencana hitam")}
          </h4>
          <p>{overview.blackPlan[language]}</p>
        </div>
      </section>
      <section>
        <h3>{t("Cabang penting")}</h3>
        <ul className="opening-overview-branches">
          {overview.branches.map((branch) => (
            <li key={branch}>{branch}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>{t("Tips praktis")}</h3>
        <div className="opening-study-tip">
          <Lightbulb size={17} aria-hidden="true" />
          <p>{t(opening.tip)}</p>
        </div>
        <h4>{t("Yang perlu diwaspadai")}</h4>
        <p>{overview.caution[language]}</p>
      </section>
      <section className="opening-overview-sources">
        <h3>{t("Sumber & kredit")}</h3>
        <p>
          {t(
            "Ringkasan ditulis ulang untuk materi belajar ini. Baca referensi lengkap melalui tautan berikut.",
          )}
        </p>
        <ul>
          {sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.name}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
              <small>{t(source.note)}</small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
