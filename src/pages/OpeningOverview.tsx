import Title from "../components/Title";
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
      note: "Nama, kode ECO, dan jalur opening yang disaring untuk latihan",
    },
    {
      name: "Stockfish 19",
      href: "https://github.com/official-stockfish/Stockfish",
      note: "Pemeriksaan kualitas langkah dan pengembangan cabang latihan",
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
        <Title as="h2">{opening.name}</Title>
        <p>{t(opening.description)}</p>
        <div
          className="opening-overview-moves"
          aria-label={t("Langkah pembuka")}
        >
          {overview.moves}
        </div>
      </header>
      <section>
        <Title as="h3">{t("Pengertian dasar")}</Title>
        <p>{overview.basics[language]}</p>
      </section>
      <section>
        <Title as="h3">{t("Sejarah singkat")}</Title>
        <p>{overview.history[language]}</p>
      </section>
      <section className="opening-lesson-theory">
        <Title as="h3">{t("Rencana opening")}</Title>
        <ol>
          {opening.ideas.map((idea, index) => (
            <li key={idea}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {t(idea)}
            </li>
          ))}
        </ol>
        <div className="opening-overview-side-plan">
          <Title as="h4">
            <span className="opening-overview-color white" aria-hidden="true" />
            {t("Rencana putih")}
          </Title>
          <p>{overview.whitePlan[language]}</p>
        </div>
        <div className="opening-overview-side-plan">
          <Title as="h4">
            <span className="opening-overview-color black" aria-hidden="true" />
            {t("Rencana hitam")}
          </Title>
          <p>{overview.blackPlan[language]}</p>
        </div>
      </section>
      <section>
        <Title as="h3">{t("Cabang penting")}</Title>
        <ul className="opening-overview-branches">
          {overview.branches.map((branch) => (
            <li key={branch}>{branch}</li>
          ))}
        </ul>
      </section>
      <section>
        <Title as="h3">{t("Tips praktis")}</Title>
        <div className="opening-study-tip">
          <Lightbulb size={17} aria-hidden="true" />
          <p>{t(opening.tip)}</p>
        </div>
        <Title as="h4">{t("Yang perlu diwaspadai")}</Title>
        <p>{overview.caution[language]}</p>
      </section>
      <section className="opening-overview-sources">
        <Title as="h3">{t("Sumber & kredit")}</Title>
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
