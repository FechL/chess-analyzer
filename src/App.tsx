import ProfilePage from "./pages/Profile";
import { useAuth } from "./lib/auth-context";
import AboutModal, { AboutPage } from "./components/AboutModal";
import MobileNavigation from "./components/MobileNavigation";
import MorePage from "./pages/More";
import Title from "./components/Title";
import LibraryGames from "./components/LibraryGames";
import { useMobileLayout } from "./hooks/useMobileLayout";
import { filterLibrary } from "./lib/library-filter";
import type { LibraryKind } from "./lib/library-filter";
import { titleCase } from "./lib/title-case";
// i18n: rendered text
import { useI18n } from "@/lib/i18n";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  ChartNoAxesCombined,
  Download,
  FolderHeart,
  GraduationCap,
  Grid2X2,
  Import,
  Info,
  LibraryBig,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Star,
  Sun,
  Moon,
  Swords,
  Target,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { DashboardShell } from "./components/block/dashboard-shell";
import { AppearanceContext, pieceAsset } from "./lib/preferences";
import { setLanguage } from "./lib/i18n";
import Analysis from "./pages/Analysis";
import { setBoardSound, useBoardSound } from "./lib/board-sound";
import { setBoardAnimation, useBoardAnimation } from "./lib/board-animation";
import BotPage from "./pages/Bot";
import HomePage from "./pages/Home";
import { AcademyPage, AcademyStudy, OpeningsPage, PuzzlesPage } from "./pages/Learn";
import { Modal, ProgressRing } from "./components/Common";
import OnlineImport from "./components/OnlineImport";
import type { OnlineSource } from "./components/OnlineImport";
import {
  downloadFile,
  emptyGame,
  parseGame,
  positionAt,
  readStorage,
  SAMPLE_PGN,
  toPgn,
  writeStorage,
} from "./lib/chess";
import type { GameData } from "./lib/chess";
import { LESSONS, OPENINGS } from "./data/content";

const OpeningStudy = lazy(() => import("./pages/OpeningStudy"));

export type Settings = {
  boardTheme: "sage" | "walnut" | "slate";
  analysisMs: number;
  multiPV: number;
  engine: "lite" | "full";
  liveEngine: boolean;
  engineDepth: number;
  showArrows: boolean;
  showEvalBar: boolean;
  autoAnalyzeImported: boolean;
  enableShortcuts: boolean;
  showPieceAnnotation: boolean;
  showCoachNotes?: boolean;
  notationStyle: "letters" | "pieces" | "both";
  language: "id" | "en";
  colorMode: "light" | "dark" | "system";
  pieceTheme: "classic" | "merida" | "celtic";
};
export type SavedGame = { id: string; date: string; game: GameData; favorite?: boolean };
const TITLES: Record<string, string> = {
  home: "Beranda",
  more: "Lainnya",
  about: "Tentang",
  settings: "Pengaturan",
  profile: "Profil",
  analysis: "Analisis permainan",
  bot: "Lawan bot",
  openings: "Opening explorer",
  academy: "Akademi catur",
  puzzles: "Puzzle",
  library: "Koleksi permainan",
};
const DEFAULT_SETTINGS: Settings = {
  boardTheme: "sage",
  analysisMs: 800,
  multiPV: 3,
  engine: "lite",
  liveEngine: true,
  engineDepth: 0,
  showArrows: true,
  showEvalBar: true,
  autoAnalyzeImported: true,
  enableShortcuts: true,
  showPieceAnnotation: true,
  showCoachNotes: true,
  notationStyle: "letters",
  language: "en",
  colorMode: "system",
  pieceTheme: "classic",
};
function restoreGame() {
  try {
    const g = readStorage<GameData>("kuda-session", parseGame(SAMPLE_PGN));
    positionAt(g, g.moves.length);
    return g;
  } catch {
    return parseGame(SAMPLE_PGN);
  }
}
export default function App() {
  const { t } = useI18n();
  const { user } = useAuth();

  const boardSound = useBoardSound();
  const boardAnimation = useBoardAnimation();
  const mobileLayout = useMobileLayout();
  const [route, setRoute] = useState(
    () => location.hash.slice(1) || (readStorage("kuda-analysis-open", false) ? "analysis/game" : "analysis"),
  );
  const routePage = route.split("/")[0];
  const page = routePage === "home" || (!mobileLayout && (routePage === "more" || routePage === "about" || routePage === "settings"))
    ? "analysis"
    : TITLES[routePage] ? routePage : "analysis";
  const [analysisActive, setAnalysisActive] = useState(() =>
    route === "analysis/game" || readStorage("kuda-analysis-open", false),
  );
  const analysisBoard = page === "analysis" && analysisActive;
  useEffect(() => {
    if (mobileLayout || routePage !== "more") return;
    const target = analysisActive ? "analysis/game" : "analysis";
    window.history.replaceState(window.history.state, "", `#${target}`);
    setRoute(target);
  }, [mobileLayout, routePage, analysisActive]);
  const [showLeaveAnalysis, setShowLeaveAnalysis] = useState(false);
  const activeLesson = page === "academy" ? LESSONS.find(lesson => lesson.id === route.split("/")[1]) : undefined;
  const activeOpening =
    page === "openings"
      ? OPENINGS.find((opening) => opening.id === route.split("/")[1])
      : undefined;
  const [game, setGame] = useState<GameData>(restoreGame);
  const [analysisFen, setAnalysisFen] = useState(() => {
    const g = restoreGame();
    return positionAt(g, g.moves.length).fen();
  });
  const [revision, setRevision] = useState(0);
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readStorage("kuda-settings", {}),
  }));
  const pageSettings = mobileLayout ? { ...settings, enableShortcuts: false } : settings;
  const updatePageSettings = (next: Settings) => setSettings((current) => ({
    ...next,
    // Disabling shortcuts for a small screen must not overwrite the saved preference.
    enableShortcuts: mobileLayout ? current.enableShortcuts : next.enableShortcuts,
  }));
  const [saved, setSaved] = useState<SavedGame[]>(() =>
    readStorage("kuda-library", []),
  );
  const currentPgn = useMemo(() => toPgn(game), [game]);
  const gameIsSaved = useMemo(
    () => saved.some((item) => toPgn(item.game) === currentPgn),
    [saved, currentPgn],
  );
  const [modal, setModal] = useState<
    "import" | "new-game" | "settings" | "help" | undefined
  >();
  useEffect(() => {
    if (mobileLayout && (modal === "help" || modal === "settings")) {
      const target = modal === "help" ? "about" : "settings";
      setModal(undefined);
      setRoute(target);
      window.history.replaceState(window.history.state, "", `#${target}`);
    } else if (!mobileLayout && (routePage === "about" || routePage === "settings")) {
      const target = analysisActive ? "analysis/game" : "analysis";
      setModal(routePage === "about" ? "help" : "settings");
      setRoute(target);
      window.history.replaceState(window.history.state, "", `#${target}`);
    }
  }, [mobileLayout, modal, routePage, analysisActive]);
  const [customEditing, setCustomEditing] = useState(false);
  const [autoReviewOnLoad, setAutoReviewOnLoad] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [completed, setCompleted] = useState<string[]>(() =>
    readStorage("kuda-lessons", []),
  );
  useEffect(() => { writeStorage("kuda-route", route); }, [route]);
  useEffect(() => {
    writeStorage("kuda-session", game);
  }, [game]);
  useEffect(() => {
    writeStorage("kuda-settings", settings);
    setLanguage(settings.language);
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyColorMode = () => {
      const effectiveMode =
        settings.colorMode === "system"
          ? systemTheme.matches
            ? "dark"
            : "light"
          : settings.colorMode;
      document.documentElement.dataset.colorMode = effectiveMode;
      document.documentElement.classList.toggle("dark", effectiveMode === "dark");
      document.documentElement.style.colorScheme = effectiveMode;
    };
    applyColorMode();
    if (settings.colorMode === "system")
      systemTheme.addEventListener("change", applyColorMode);
    return () => systemTheme.removeEventListener("change", applyColorMode);
  }, [settings]);
  useEffect(() => {
    writeStorage("kuda-library", saved);
  }, [saved]);
  useEffect(() => {
    const handler = () => {
      const next = location.hash.slice(1);
      setRoute(next || "analysis");
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    document.title = `${titleCase(activeOpening?.name || (activeLesson && t(activeLesson.title)) || t(TITLES[page]))} · Kuda`;
    setCompleted(readStorage("kuda-lessons", []));
  }, [page, activeOpening?.name, activeLesson?.title, modal, t]);
  useEffect(() => {
    const update = () => setCompleted(readStorage("kuda-lessons", []));
    window.addEventListener("kuda-progress", update);
    return () => window.removeEventListener("kuda-progress", update);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const navigate = (id: string) => {
    if (mobileLayout && (id === "help" || id === "settings")) {
      const target = id === "help" ? "about" : "settings";
      setRoute(target);
      location.hash = target;
      return;
    }
    if (id === "settings" || id === "help") {
      setModal(id);
      return;
    }
    const target = id === "home" || id === "analysis"
      ? (analysisActive ? "analysis/game" : "analysis")
      : id;
    setRoute(target);
    location.hash = target;
  };
  const notify = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  const load = (g: GameData, editCustom = false) => {
    setAnalysisActive(true);
    writeStorage("kuda-analysis-open", true);
    setGame(g);
    setCustomEditing(editCustom);
    setAutoReviewOnLoad(
      !editCustom &&
        !["Bebas", "Kustom"].includes(g.source || "") &&
        settings.autoAnalyzeImported &&
        g.moves.length > 0,
    );
    setAnalysisFen(positionAt(g, g.moves.length).fen());
    setRevision((r) => r + 1);
    navigate("analysis/game");
    setModal(undefined);
  };
  const returnToAnalysisHome = () => {
    setAnalysisActive(false);
    writeStorage("kuda-analysis-open", false);
    setShowLeaveAnalysis(false);
    setRoute("analysis");
    location.hash = "analysis";
  };
  const save = () => {
    const existing = saved.find((s) => toPgn(s.game) === toPgn(game));
    if (existing) {
      notify("Permainan ini sudah ada di koleksi.");
      return;
    }
    setSaved((s) => [
      { id: crypto.randomUUID(), date: new Date().toISOString(), game },
      ...s,
    ]);
    notify("Permainan tersimpan di koleksi.");
  };
  const analyzePosition = (fen: string, name: string) => {
    const g = parseGame(fen);
    g.event = name;
    load(g);
  };
  const renderSettings = () => (
            <div className="app-settings">
            <div className="settings-section">
              <Title as="label">{t("Tampilan papan")}</Title>
              <div className="board-theme-options">
                {t(
                  (["sage", "walnut", "slate"] as const).map((theme, i) => (
                <button
                  key={theme}
                      className={settings.boardTheme === theme ? "active" : ""}
                      onClick={() =>
                        setSettings((s) => ({ ...s, boardTheme: theme }))
                      }
                    >
                      <span className={`theme-swatch swatch-${theme}`} />
                      <span>
                        {t(["Sage garden", "Warm walnut", "Quiet slate"][i])}
                      </span>
                      {t(settings.boardTheme === theme && <Check size={14} />)}
                    </button>
                  )),
                )}
              </div>
            </div>
            <div className="settings-section">
              <Title as="label">{t("Tema buah")}</Title>
              <div className="piece-theme-options">
                {t(
                  (["classic", "merida", "celtic"] as const).map((theme) => (
                    <button
                      key={theme}
                      className={settings.pieceTheme === theme ? "active" : ""}
                      aria-pressed={settings.pieceTheme === theme}
                      onClick={() =>
                        setSettings((s) => ({ ...s, pieceTheme: theme }))
                      }
                    >
                      <img src={pieceAsset("w", "N", theme)} alt={t("")} />
                      <span>
                        {t(
                          theme === "classic"
                            ? "Klasik"
                            : theme === "merida"
                              ? "Merida"
                              : "Celtic",
                        )}
                      </span>
                    </button>
                  )),
                )}
              </div>
            </div>
            <div className="settings-section">
              <Title as="label">{t("Tampilan notasi")}</Title>
              <div className="board-theme-options settings-choice-options notation-choice-options" role="group" aria-label={t("Tampilan notasi")}>
                {t(
                  ([
                    ["letters", "Huruf"],
                    ["pieces", "Gambar buah"],
                    ["both", "Keduanya"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      className={settings.notationStyle === value ? "active" : ""}
                      aria-pressed={settings.notationStyle === value}
                      onClick={() =>
                        setSettings((s) => ({ ...s, notationStyle: value }))
                      }
                    >
                      <span className="notation-example" aria-hidden="true">
                        {value !== "letters" && (
                          <img src={pieceAsset("w", "N", settings.pieceTheme)} alt="" />
                        )}
                        {value !== "pieces" && <span>Nf3</span>}
                        {value === "pieces" && <span>f3</span>}
                      </span>
                      <span>{t(label)}</span>
                      {settings.notationStyle === value && <Check className="setting-choice-check" size={14} />}
                    </button>
                  )),
                )}
              </div>
            </div>
            <div className="settings-section">
              <Title as="label">{t("Mode tampilan")}</Title>
              <div className="board-theme-options settings-choice-options appearance-choice-options" role="group" aria-label={t("Mode tampilan")}>
                {t(
                  ([
                    ["light", "Terang"],
                    ["dark", "Gelap"],
                    ["system", "Sistem"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      className={settings.colorMode === value ? "active" : ""}
                      aria-pressed={settings.colorMode === value}
                      onClick={() =>
                        setSettings((s) => ({ ...s, colorMode: value }))
                      }
                    >
                      {value === "light" ? <Sun size={16} aria-hidden="true" /> : value === "dark" ? <Moon size={16} aria-hidden="true" /> : <Monitor size={16} aria-hidden="true" />}
                      <span>{t(label)}</span>
                      {settings.colorMode === value && <Check size={14} />}
                    </button>
                  )),
                )}
              </div>
            </div>
            <div className="settings-section">
              <Title as="label" htmlFor="app-language">{t("Bahasa")}</Title>
              <select
                id="app-language"
                value={settings.language}
                onChange={(e) => {
                  const language = e.target.value as Settings["language"];
                  setLanguage(language);
                  setSettings((s) => ({ ...s, language }));
                }}
              >
                <option value="id">{t("Bahasa Indonesia")}</option>
                <option value="en">{t("English")}</option>
              </select>
            </div>
            <div className="settings-section">
              <label className="board-sound-setting">
                <input
                  type="checkbox"
                  role="switch"
                  checked={boardAnimation}
                  onChange={(e) => setBoardAnimation(e.target.checked)}
                />
                {t("Animasi langkah")}
              </label>
            </div>
            <div className="settings-section">
              <label className="board-sound-setting">
                <input
                  type="checkbox"
                  role="switch"
                  checked={settings.autoAnalyzeImported}
                  onChange={(e) => setSettings((s) => ({ ...s, autoAnalyzeImported: e.target.checked }))}
                />
                {t("Analisis otomatis saat impor")}
              </label>
            </div>
            <div className="settings-section">
              <label className="board-sound-setting">
                <input
                  type="checkbox"
                  role="switch"
                  checked={boardSound}
                  onChange={(e) => setBoardSound(e.target.checked)}
                />
                {t("Suara")}
              </label>
            </div>
            {!mobileLayout && (
            <div className="settings-section">
              <label className="board-sound-setting">
                <input
                  type="checkbox"
                  role="switch"
                  checked={settings.enableShortcuts}
                  onChange={(e) => setSettings((s) => ({ ...s, enableShortcuts: e.target.checked }))}
                />
                {t("Aktifkan pintasan keyboard")}
              </label>
            </div>
            )}
            <div className="settings-section">
              <button
                className="button secondary"
                onClick={() => {
                  setSettings({ ...DEFAULT_SETTINGS });
                  setBoardSound(true);
                  setBoardAnimation(true);
                }}
              >
                <RotateCcw size={15} />
                {t("Reset ke default")}
              </button>
            </div>
            </div>
  );
  const nav = [
    {
      id: "workspace",
      title: "RUANG BERMAIN",
      items: [
        { id: "analysis", label: "Analisis permainan", icon: ChartNoAxesCombined },
        { id: "bot", label: "Lawan bot", icon: Swords },
      ],
    },
    {
      id: "learn",
      title: "TUMBUH & BELAJAR",
      items: [
        { id: "puzzles", label: "Puzzle", icon: Target },
        { id: "openings", label: "Opening explorer", icon: BookOpen },
        { id: "academy", label: "Akademi catur", icon: GraduationCap },
      ],
    },
    {
      id: "personal",
      title: "RUANG PRIBADI",
      items: [
        {
          id: "library",
          label: "Koleksi permainan",
          icon: FolderHeart,
          count: saved.length || undefined,
        },
      ],
    },
  ];
  return (
    <AppearanceContext.Provider value={settings}>
      <DashboardShell
        hideHeader
        className="kuda-shell"
        defaultSidebarWidth={232}
        minSidebarWidth={205}
        maxSidebarWidth={300}
        brand={{
          name: "kuda",
          href: "#analysis",
          description: "CHESS STUDIO",
          logo: (
            <span className="brand-icon">
              <img src="/pieces/wN.svg" alt={t("")} />
            </span>
          ),
        }}
        navigation={nav}
        secondaryNavigation={[
          { id: "profile", label: user.username, icon: UserRound },
          { id: "settings", label: "Pengaturan", icon: Settings2 },
          { id: "help", label: "Tentang", icon: Info },
        ]}
        activeItemId={page}
        onActiveItemChange={navigate}
        title={t(TITLES[page])}
        navigationLabel="Navigasi Kuda Chess Studio"

      >
        {page === "profile" && <ProfilePage onBack={() => navigate(mobileLayout ? "more" : "analysis")} />}
        {page === "settings" && (
          <div className="page settings-page">
            <header className="settings-page-header">
              <button className="icon-button back-icon" onClick={() => navigate("more")} aria-label={t("Kembali")} title={t("Kembali")}><ArrowLeft size={20} /></button>
              <Title as="h1">{t("Pengaturan")}</Title>
            </header>
            {renderSettings()}
          </div>
        )}
        {page === "about" && <AboutPage onBack={() => navigate("more")} />}
        {page === "more" && <MorePage onNavigate={navigate} completedCount={completed.length} />}
        {page === "analysis" && !analysisBoard && <HomePage saved={saved} onLoad={load} onNewGame={() => setModal("new-game")} />}
        {t(
          analysisBoard && (
            <Analysis
              key={revision}
              game={game}
              setGame={setGame}
              settings={pageSettings}
              onSettingsChange={updatePageSettings}
              onSave={save}
              isSaved={gameIsSaved}
              onImport={() => setModal("import")}
              onNewGame={() => setModal("new-game")}
              onBackHome={() => {
                if (!gameIsSaved) setShowLeaveAnalysis(true);
                else returnToAnalysisHome();
              }}
              autoReviewOnLoad={autoReviewOnLoad}
              onAutoReviewStarted={() => setAutoReviewOnLoad(false)}
              customEditing={customEditing}
              onCustomEditingChange={setCustomEditing}
              onPositionChange={setAnalysisFen}
            />
          ),
        )}
        {t(
          page === "bot" && (
            <BotPage
              settings={pageSettings}
              analysisFen={analysisFen}
              onReview={load}
            />
          ),
        )}
        {t(
          page === "openings" &&
            (activeOpening ? (
              <Suspense
                fallback={
                  <div className="page opening-loading" role="status">
                    {t("Memuat opening…")}
                  </div>
                }
              >
                <OpeningStudy
                  key={activeOpening.id}
                  opening={activeOpening}
                  onBack={() => navigate("openings")}
                  settings={pageSettings}
                  onSettingsChange={updatePageSettings}
                />
              </Suspense>
            ) : (
              <OpeningsPage
                settings={pageSettings}
                onOpenOpening={(id) => navigate(`openings/${id}`)}
              />
            )),
        )}
        {t(
          page === "academy" && (
            activeLesson ? <AcademyStudy key={activeLesson.id} lesson={activeLesson} settings={pageSettings} onBack={() => navigate("academy")} onOpenLesson={id => navigate(`academy/${id}`)} onAnalyze={analyzePosition} /> : <AcademyPage settings={pageSettings} onOpenLesson={id => navigate(`academy/${id}`)} />
          ),
        )}
        {t(
          page === "puzzles" && (
            <PuzzlesPage
              settings={pageSettings}
              onSettingsChange={updatePageSettings}
              onAnalyze={analyzePosition}
            />
          ),
        )}
        {t(
          page === "library" && (
            <Library
              saved={saved}
              onLoad={load}
              onToggleFavorite={(id) => setSaved((items) => items.map((item) => item.id === id ? {...item, favorite: !item.favorite} : item))}
              onDelete={(id) => {
                setSaved((s) => s.filter((g) => g.id !== id));
                notify("Permainan dihapus dari koleksi.");
              }}
              onImport={() => setModal("import")}
            />
          ),
        )}
      </DashboardShell>
      {showLeaveAnalysis && (
        <Modal title={t("Permainan belum disimpan")} onClose={() => setShowLeaveAnalysis(false)}>
          <p className="modal-description">{t("Simpan permainan ke koleksi sebelum kembali?")}</p>
          <div className="modal-actions">
            <button className="text-button" onClick={returnToAnalysisHome}>{t("Kembali tanpa menyimpan")}</button>
            <button className="button primary" onClick={() => { save(); returnToAnalysisHome(); }}>{t("Simpan dan kembali")}</button>
          </div>
        </Modal>
      )}
      {mobileLayout && <MobileNavigation page={page} onNavigate={navigate} />}
      {t(
        (modal === "import" || modal === "new-game") && (
          <ImportModal
            initialNewGame={modal === "new-game"}
            limitedSources={page === "analysis" && !analysisBoard}
            onNewGame={page === "analysis" ? (custom) => {
              const next = emptyGame();
              next.source = custom ? "Kustom" : "Bebas";
              if (custom) next.event = "Analisis Bebas (Kustom)";
              load(next, custom);
            } : undefined}
            onClose={() => setModal(undefined)}
            saved={saved}
            onLoad={load}
          />
        ),
      )}
      {modal === "settings" && !mobileLayout && (
        <Modal title={t("Pengaturan")} onClose={() => setModal(undefined)}>
          {renderSettings()}
        </Modal>
      )}
      {modal === "help" && !mobileLayout && <AboutModal onClose={() => setModal(undefined)} />}
      {t(
        toast && (
          <div className="toast" role="status">
            <span>
              <Check size={15} />
            </span>
            {t(toast)}
            <button
              className="icon-button"
              onClick={() => setToast("")}
              aria-label={t("Tutup notifikasi")}
            >
              <X size={14} />
            </button>
          </div>
        ),
      )}
    </AppearanceContext.Provider>
  );
}

function ImportModal({
  onClose,
  onLoad,
  saved,
  onNewGame,
  initialNewGame = false,
  limitedSources = false,
}: {
  onClose: () => void;
  onLoad: (g: GameData) => void;
  saved: SavedGame[];
  onNewGame?: (custom: boolean) => void;
  initialNewGame?: boolean;
  limitedSources?: boolean;
}) {
  const { t } = useI18n();

  const [source, setSource] = useState<"new" | "local" | "collection" | OnlineSource>(
    initialNewGame && onNewGame ? "new" : "local",
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const load = () => {
    try {
      onLoad(parseGame(input));
    } catch {
      setError(
        "Format belum valid. Periksa notasi PGN atau enam bagian FEN dan pastikan semua langkah legal.",
      );
    }
  };
  const readFile = async (f?: File) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setError("Batas berkas 2 MB. Pilih satu permainan PGN.");
      return;
    }
    setInput(await f.text());
    setError("");
  };
  return (
    <Modal title={onNewGame ? `${t("New Game")} / ${t("Impor permainan")}` : t("Impor permainan")} onClose={onClose}>
      <div
        className="import-source-options"
        role="group"
        aria-label={t("Sumber permainan")}
      >
        {onNewGame && (
          <button className={source === "new" ? "active" : ""} aria-pressed={source === "new"} onClick={() => setSource("new")}>
            {t("New Game")}
          </button>
        )}
        {t(
          (
            [
              ["local", "PGN / FEN"],
              ["chesscom", "Chess.com"],
              ["lichess", "Lichess"],
              ["url", "Tautan PGN"],
              ["collection", "Koleksi"],
            ] as const
          ).filter(([value]) => !limitedSources || value === "local" || value === "url").map(([value, label]) => (
            <button
              key={value}
              aria-pressed={source === value}
              className={source === value ? "active" : ""}
              onClick={() => setSource(value)}
            >
              {t(label)}
            </button>
          )),
        )}
      </div>
      {t(
        source === "new" ? (
          <>
            <p className="modal-description">{t("Pilih papan awal untuk ruang analisis bebas.")}</p>
            <div className="new-game-options">
              <button className="button secondary" onClick={() => onNewGame?.(false)}>
                <Plus size={16} /> {t("Dari posisi awal")}
              </button>
              <button className="button primary" onClick={() => onNewGame?.(true)}>
                <Grid2X2 size={16} /> {t("Atur buah sendiri")}
              </button>
            </div>
          </>
        ) : source === "collection" ? (
          <div className="saved-import-list">
            {t(
              saved.length ? (
                saved.map((item) => (
                  <button
                    key={item.id}
                    className="online-game-item"
                    onClick={() => onLoad({ ...item.game, source: "Koleksi" })}
                  >
                    <span className="online-game-players">
                      <strong>{t(item.game.event)}</strong>
                      <span>
                        {t(item.game.white)}
                        {t(" vs ")}
                        {t(item.game.black)}
                      </span>
                    </span>
                    <span className="online-game-meta">
                      <strong>{t(item.game.result)}</strong>
                      <span>
                        {t(new Date(item.date).toLocaleDateString(t("id-ID")))}
                      </span>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))
              ) : (
                <p className="online-import-status">
                  {t("Belum ada permainan tersimpan.")}
                </p>
              ),
            )}
          </div>
        ) : source !== "local" ? (
          <OnlineImport key={source} source={source} onLoad={onLoad} />
        ) : (
          <>
            <textarea
              id="game-import"
              aria-label={t("PGN atau FEN")}
              className="import-textarea"
              autoFocus
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder={t(
                '[White "Nama Anda"]\n[Black "Lawan"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4…',
              )}
              rows={9}
            />
            <input
              className="sr-only"
              ref={file}
              type="file"
              accept=".pgn,.fen,.txt"
              aria-label={t("Berkas permainan")}
              onChange={(e) => readFile(e.target.files?.[0])}
            />
            <div className="import-options">
              <button
                className="text-button"
                onClick={() => file.current?.click()}
              >
                <Upload size={14} />
                {t(" Unggah berkas")}
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setInput(SAMPLE_PGN);
                  setError("");
                }}
              >
                {t("Gunakan contoh Opera Game")}
              </button>
            </div>
            {t(
              error && (
                <div className="error-message" role="alert">
                  {t(error)}
                </div>
              ),
            )}
            <div className="modal-actions">
              <button
                className="button primary"
                onClick={load}
                disabled={!input.trim()}
              >
                {t("Buka analisis ")}
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        ),
      )}
    </Modal>
  );
}

function Library({
  saved,
  onLoad,
  onDelete,
  onImport,
  onToggleFavorite,
}: {
  saved: SavedGame[];
  onLoad: (g: GameData) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImport: () => void;
}) {
  const { t } = useI18n();

  const [search, setSearch] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchExpanded) searchField.current?.focus();
  }, [searchExpanded]);
  const [deleting, setDeleting] = useState<SavedGame>();
  const [favorites, setFavorites] = useState(false);
  const [kind, setKind] = useState<LibraryKind>("all");
  const hasFilters = !!(search || favorites || kind !== "all");
  const filtered = filterLibrary(saved, {search, favorites, kind, from: "", until: ""});
  return (
    <div className="page library-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">{t("KOLEKSI PRIBADI")}</div>
          <Title as="h1">
            {t("Permainan berlalu.")}
            <br />
            {t("Pelajarannya tinggal")}
            <span>{t(".")}</span>
          </Title>
          <p>
            {t("Simpan permainan yang berarti, dan kunjungi lagi kapan saja.")}
          </p>
        </div>
        <button
          className="button primary library-import-action"
          onClick={onImport}
          aria-label={t("Impor permainan")}
          title={t("Impor permainan")}
        >
          <ArrowDownToLine size={16} />
          <span>{t(" Impor permainan")}</span>
        </button>
      </div>
      <div className={`catalog-toolbar library-toolbar${searchExpanded ? " is-search-expanded" : ""}`}>
      <div className="library-filters">
        <button className="button secondary library-favorite-filter" aria-label={t("Favorit")} title={t("Favorit")} aria-pressed={favorites} onClick={() => setFavorites((value) => !value)}>
          <Star size={15} fill={favorites ? "currentColor" : "none"} />
          <span>{t("Favorit")}</span>
        </button>
        <label>
          <select aria-label={t("Jenis permainan")} value={kind} onChange={(event) => setKind(event.target.value as LibraryKind)}>
            {([ ["all", "Semua jenis"], ["live", "Live"], ["bot", "Lawan bot"], ["free", "Analisis bebas"], ["chesscom", "Chess.com"], ["lichess", "Lichess"], ["pgn", "PGN"], ["fen", "FEN"], ["collection", "Koleksi"] ] as const).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </select>
        </label>
        {hasFilters && <button className="text-button library-clear-filters" aria-label={t("Hapus filter")} title={t("Hapus filter")} onClick={() => {setSearch(""); setFavorites(false); setKind("all");}}><span>{t("Hapus filter")}</span><X size={15} /></button>}
      </div>
        <Title as="h3">
          {t(saved.length)}
          {t(" permainan tersimpan")}
        </Title>
        <div className="library-toolbar-actions">
        <button
          className="button secondary library-search-toggle"
          aria-label={t("Cari koleksi")}
          aria-expanded={searchExpanded}
          aria-controls="library-search-field"
          onClick={() => setSearchExpanded(true)}
        >
          <Search size={16} />
        </button>
        <label className="search-input">
          <Search size={16} />
          <input
            id="library-search-field"
            ref={searchField}
            onKeyDown={(event) => { if (event.key === "Escape") setSearchExpanded(false); }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Cari pemain atau permainan…")}
            aria-label={t("Cari koleksi")}
          />
          <button
            type="button"
            className="library-search-close icon-button"
            aria-label={t("Tutup")}
            onClick={() => setSearchExpanded(false)}
          >
            <X size={16} />
          </button>
        </label>
        </div>
      </div>
      {t(
        filtered.length ? (
          <LibraryGames games={filtered} onLoad={onLoad} onDelete={setDeleting} onToggleFavorite={onToggleFavorite} />
        ) : (
          <div className="empty-state library-empty">
            <div className="empty-icon">
              <LibraryBig size={36} />
            </div>
            <Title as="h2">
              {t(
                hasFilters
                  ? "Belum ada yang cocok."
                  : "Halaman untuk perjalananmu.",
              )}
            </Title>
            <p>
              {t(
                hasFilters
                  ? "Coba ubah filter atau kata kunci pencarian."
                  : "Buka ruang analisis, lalu klik Simpan. Permainanmu akan tersusun di sini.",
              )}
            </p>
            {!saved.length && (
            <button className="button primary" onClick={onImport}>
              {t("Impor permainan pertama ")}
              <ArrowRight size={16} />
            </button>
            )}
          </div>
        ),
      )}
      {t(
        deleting && (
          <Modal
            title={t("Hapus dari koleksi?")}
            onClose={() => setDeleting(undefined)}
          >
            <p className="modal-description">
              {t(deleting.game.event)}
              {t(" akan dihapus dari penyimpanan koleksi lokal.")}
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setDeleting(undefined)}
              >
                {t("Batal")}
              </button>
              <button
                className="button danger"
                onClick={() => {
                  onDelete(deleting.id);
                  setDeleting(undefined);
                }}
              >
                {t("Hapus permainan")}
              </button>
            </div>
          </Modal>
        ),
      )}
    </div>
  );
}
