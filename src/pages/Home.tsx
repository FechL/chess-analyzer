import { Plus, ArrowDownToLine } from "lucide-react";
import { useI18n } from "../lib/i18n";
import Title from "../components/Title";
import HomeGames from "../components/HomeGames";
import type { SavedGame } from "../App";
import type { GameData } from "../lib/chess";

export default function HomePage({
  saved,
  onLoad,
  onNewGame,
  onImport,
}: {
  saved: SavedGame[];
  onLoad: (game: GameData) => void;
  onNewGame: () => void;
  onImport: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="page home-page">
      <section className="home-welcome">
        <div>
          <span className="home-eyebrow">KUDA CHESS STUDIO</span>
          <Title as="h1">{t("Satu langkah lebih baik.")}</Title>
          <p>{t("Ruang untuk bermain, memahami, dan berkembang.")}</p>
          <div className="home-analysis-actions">
            <button className="button secondary" onClick={onNewGame}><Plus size={16} /><Title>{t("New Game")}</Title></button>
            <button className="button primary" onClick={onImport}><ArrowDownToLine size={16} /><Title>{t("Impor permainan")}</Title></button>
          </div>
        </div>
        <img
          className="home-knight"
          src="/pieces/wN.svg"
          alt=""
          draggable={false}
        />
      </section>
      <HomeGames saved={saved} onLoad={onLoad} />
    </div>
  );
}
