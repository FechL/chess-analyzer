// i18n: rendered text
import { useI18n } from "@/lib/i18n";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Cpu,
  Download,
  FolderHeart,
  GraduationCap,
  Grid2X2,
  HelpCircle,
  Import,
  LayoutDashboard,
  LibraryBig,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { DashboardShell } from "./components/block/dashboard-shell";
import { AppearanceContext, pieceAsset } from "./lib/preferences";
import { setLanguage } from "./lib/i18n";
import Analysis from "./pages/Analysis";
import { setBoardSound, useBoardSound } from "./lib/board-sound";
import { setBoardAnimation, useBoardAnimation } from "./lib/board-animation";
import BotPage from "./pages/Bot";
import { AcademyPage, OpeningsPage, PuzzlesPage } from "./pages/Learn";
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
import { ANALYSIS_SHORTCUTS } from "./lib/analysis-shortcuts";

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
  notationStyle: "letters" | "pieces" | "both";
  language: "id" | "en";
  colorMode: "light" | "dark";
  pieceTheme: "classic" | "merida" | "celtic";
};
type SavedGame = { id: string; date: string; game: GameData };
const TITLES: Record<string, string> = {
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
  notationStyle: "letters",
  language: "id",
  colorMode: "light",
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

  const boardSound = useBoardSound();
  const boardAnimation = useBoardAnimation();
  const [route, setRoute] = useState(
    () => location.hash.slice(1) || "analysis",
  );
  const routePage = route.split("/")[0];
  const page = TITLES[routePage] ? routePage : "analysis";
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
  const [saved, setSaved] = useState<SavedGame[]>(() =>
    readStorage("kuda-library", []),
  );
  const [modal, setModal] = useState<
    "import" | "new-game" | "settings" | "help" | undefined
  >();
  const [customEditing, setCustomEditing] = useState(false);
  const [autoReviewOnLoad, setAutoReviewOnLoad] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [completed, setCompleted] = useState<string[]>(() =>
    readStorage("kuda-lessons", []),
  );
  useEffect(() => {
    writeStorage("kuda-session", game);
  }, [game]);
  useEffect(() => {
    writeStorage("kuda-settings", settings);
    document.documentElement.dataset.colorMode = settings.colorMode;
    document.documentElement.classList.toggle(
      "dark",
      settings.colorMode === "dark",
    );
    setLanguage(settings.language);
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
    document.title = `${activeOpening?.name || t(TITLES[page])} · Kuda`;
    setCompleted(readStorage("kuda-lessons", []));
  }, [page, activeOpening?.name, modal, t]);
  useEffect(() => {
    const update = () => setCompleted(readStorage("kuda-lessons", []));
    window.addEventListener("kuda-progress", update);
    return () => window.removeEventListener("kuda-progress", update);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const navigate = (id: string) => {
    if (id === "settings" || id === "help") {
      setModal(id);
      return;
    }
    setRoute(id);
    location.hash = id;
  };
  const notify = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  const load = (g: GameData, editCustom = false) => {
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
    navigate("analysis");
    setModal(undefined);
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
  const nav = [
    {
      id: "workspace",
      title: "RUANG BERMAIN",
      items: [
        { id: "analysis", label: "Analisis permainan", icon: Grid2X2 },
        { id: "bot", label: "Lawan bot", icon: Swords },
      ],
    },
    {
      id: "learn",
      title: "TUMBUH & BELAJAR",
      items: [
        { id: "openings", label: "Opening explorer", icon: BookOpen },
        { id: "academy", label: "Akademi catur", icon: GraduationCap },
        { id: "puzzles", label: "Puzzle", icon: Target },
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
  const percent = Math.round((completed.length / LESSONS.length) * 100);
  return (
    <AppearanceContext.Provider value={settings}>
      <DashboardShell
        className="kuda-shell"
        defaultSidebarWidth={232}
        minSidebarWidth={205}
        maxSidebarWidth={300}
        brand={{
          name: "kuda",
          description: "CHESS STUDIO",
          logo: (
            <span className="brand-icon">
              <img src="/pieces/wN.svg" alt={t("")} />
            </span>
          ),
        }}
        navigation={nav}
        secondaryNavigation={[
          { id: "settings", label: "Pengaturan", icon: Settings2 },
          { id: "help", label: "Panduan & referensi", icon: CircleHelp },
        ]}
        activeItemId={page}
        onActiveItemChange={navigate}
        title={t(
          <span className="breadcrumb">
            <span>{t("Studio")}</span>
            <ChevronRight size={14} />
            {activeOpening ? (
              <>
                <button
                  className="breadcrumb-link"
                  onClick={() => navigate("openings")}
                >
                  {t("Opening explorer")}
                </button>
                <ChevronRight size={14} />
                <span aria-current="page">{activeOpening.name}</span>
              </>
            ) : (
              t(TITLES[page])
            )}
          </span>,
        )}
        headerActions={
          <>
            <button
              className="icon-button header-help"
              aria-label={t("Buka panduan")}
              onClick={() => setModal("help")}
            >
              <HelpCircle size={18} />
            </button>
            <span className="profile-avatar" title={t("Profil lokal")}>
              {t("K")}
            </span>
          </>
        }
        navigationLabel="Navigasi Kuda Chess Studio"
        sidebarFooter={
          <div className="sidebar-footer-content">
            <div className="sidebar-learning">
              <span className="sidebar-learning-icon">
                <Sparkles size={21} />
              </span>
              <h3>
                {t("Satu langkah")}
                <br />
                {t("lebih baik, setiap hari.")}
              </h3>
              <p>
                {t("Luangkan waktu untuk")}
                <br />
                {t("rasa ingin tahumu.")}
              </p>
              <button onClick={() => navigate("academy")}>
                {t("Lanjutkan belajar ")}
                <ArrowRight size={14} />
              </button>
              <div className="sidebar-progress">
                <span style={{ width: `${percent}%` }} />
              </div>
              <span className="sidebar-progress-label">
                {t(completed.length)}
                {t("/")}
                {t(LESSONS.length)}
                {t(" pelajaran selesai")}
              </span>
            </div>
            <div className="sidebar-bottom">
              <span className="status-dot" />
              <span>{t("Ruang untuk berkembang.")}</span>
              <span>{t("v1.0")}</span>
            </div>
          </div>
        }
      >
        {t(
          page === "analysis" && (
            <Analysis
              key={revision}
              game={game}
              setGame={setGame}
              settings={settings}
              onSettingsChange={setSettings}
              onSave={save}
              onImport={() => setModal("import")}
              onNewGame={() => setModal("new-game")}
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
              settings={settings}
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
                  settings={settings}
                  onBack={() => navigate("openings")}
                />
              </Suspense>
            ) : (
              <OpeningsPage
                settings={settings}
                onOpenOpening={(id) => navigate(`openings/${id}`)}
              />
            )),
        )}
        {t(
          page === "academy" && (
            <AcademyPage settings={settings} onAnalyze={analyzePosition} />
          ),
        )}
        {t(
          page === "puzzles" && (
            <PuzzlesPage settings={settings} onAnalyze={analyzePosition} />
          ),
        )}
        {t(
          page === "library" && (
            <Library
              saved={saved}
              onLoad={load}
              onDelete={(id) => {
                setSaved((s) => s.filter((g) => g.id !== id));
                notify("Permainan dihapus dari koleksi.");
              }}
              onImport={() => setModal("import")}
            />
          ),
        )}
      </DashboardShell>
      {t(
        modal === "new-game" && (
          <Modal
            title={t("Mulai permainan baru")}
            onClose={() => setModal(undefined)}
          >
            <p className="modal-description">
              {t("Pilih papan awal untuk ruang analisis bebas.")}
            </p>
            <div className="new-game-options">
              <button
                className="button secondary"
                onClick={() => {
                  const g = emptyGame();
                  g.source = "Bebas";
                  load(g);
                }}
              >
                <Plus size={16} />
                {t(" Dari posisi awal")}
              </button>
              <button
                className="button primary"
                onClick={() => {
                  const g = emptyGame();
                  g.event = "Analisis Bebas (Kustom)";
                  g.source = "Kustom";
                  load(g, true);
                }}
              >
                <Grid2X2 size={16} />
                {t(" Atur buah sendiri")}
              </button>
            </div>
          </Modal>
        ),
      )}
      {t(
        modal === "import" && (
          <ImportModal
            onClose={() => setModal(undefined)}
            saved={saved}
            onLoad={load}
          />
        ),
      )}
      {t(
        modal === "settings" && (
          <Modal
            title={t("Buat ruang ini milikmu")}
            onClose={() => setModal(undefined)}
          >
            <p className="modal-description">
              {t("Preferensi tersimpan otomatis di perangkat ini.")}
            </p>
            <div className="settings-section">
              <label>{t("Tampilan papan")}</label>
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
              <label htmlFor="notation-style">{t("Tampilan notasi")}</label>
              <select
                id="notation-style"
                value={settings.notationStyle}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    notationStyle: e.target.value as Settings["notationStyle"],
                  }))
                }
              >
                <option value="letters">{t("Huruf")}</option>
                <option value="pieces">{t("Gambar buah")}</option>
                <option value="both">{t("Gambar dan huruf")}</option>
              </select>
            </div>
            <div className="settings-section">
              <label htmlFor="app-language">{t("Bahasa")}</label>
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
              <label htmlFor="color-mode">{t("Mode tampilan")}</label>
              <select
                id="color-mode"
                value={settings.colorMode}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    colorMode: e.target.value as Settings["colorMode"],
                  }))
                }
              >
                <option value="light">{t("Terang")}</option>
                <option value="dark">{t("Gelap")}</option>
              </select>
            </div>
            <div className="settings-section">
              <label>{t("Tema buah")}</label>
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
              <label className="board-sound-setting">
                <input
                  type="checkbox"
                  role="switch"
                  checked={settings.autoAnalyzeImported}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      autoAnalyzeImported: e.target.checked,
                    }))
                  }
                />
                {t("Analisis otomatis saat impor")}
              </label>
            </div>
            <div className="settings-section">
              <label className="board-sound-setting">
                <input
                  type="checkbox"
                  role="switch"
                  checked={settings.enableShortcuts}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      enableShortcuts: e.target.checked,
                    }))
                  }
                />
                {t("Aktifkan pintasan keyboard")}
              </label>
            </div>
            <div className="settings-section">
              <label className="board-sound-setting">
                <input
                  type="checkbox"
                  role="switch"
                  checked={!boardSound}
                  onChange={(e) => setBoardSound(!e.target.checked)}
                />
                {t("Bisukan suara")}
              </label>
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
          </Modal>
        ),
      )}
      {t(
        modal === "help" && (
          <Modal
            title={t("Selamat datang di Kuda.")}
            onClose={() => setModal(undefined)}
            wide
          >
            <div className="help-layout">
              <div className="prose">
                <span className="small-label">
                  {t("RUANG KECIL UNTUK PERMAINAN BESAR")}
                </span>
                <h3>{t("Belajar dengan memainkan idenya.")}</h3>
                <p>
                  {t(
                    "Mulai dari contoh Opera Game, impor PGN/FEN Anda, atau buat analisis baru. Klik buah lalu petak tujuan; Anda juga bisa menyeret buah.",
                  )}
                </p>
                <ul>
                  <li>
                    <strong>{t("Analisis:")}</strong>
                    {t(
                      " ulas seluruh permainan, periksa evaluasi dan variasi, tambahkan catatan, lalu latih ulang kesalahan.",
                    )}
                  </li>
                  <li>
                    <strong>{t("Lawan bot:")}</strong>
                    {t(
                      " pilih satu dari empat preset, warna, dan waktu. Gunakan petunjuk saat belajar.",
                    )}
                  </li>
                  <li>
                    <strong>{t("Opening:")}</strong>
                    {t(
                      " 12 jalur terkurasi dengan penjelasan dan latihan urutan.",
                    )}
                  </li>
                  <li>
                    <strong>{t("Akademi:")}</strong>
                    {t(
                      " 9 tutorial interaktif tentang dasar, taktik, skakmat, dan aturan khusus.",
                    )}
                  </li>
                  <li>
                    <strong>{t("Taktik:")}</strong>
                    {t(" 6 tantangan terkurasi untuk mengenali pola.")}
                  </li>
                  <li>
                    <strong>{t("Koleksi:")}</strong>
                    {t(" simpan permainan dan ekspor PGN.")}
                  </li>
                </ul>
                <p>
                  <kbd>{t("←")}</kbd> <kbd>{t("→")}</kbd>
                  {t(" navigasi langkah · ")}
                  <kbd>{t("F")}</kbd>
                  {t(" balik papan · ")}
                  <kbd>{t("Esc")}</kbd>
                  {t(" tutup dialog")}
                </p>
                <h3>{t("Pintasan analisis")}</h3>
                <ul className="analysis-shortcut-list">
                  {ANALYSIS_SHORTCUTS.map((shortcut) => (
                    <li key={shortcut.key}>
                      <kbd>{shortcut.display}</kbd> {t(shortcut.label)}
                    </li>
                  ))}
                </ul>
                <div className="study-tip">
                  <ShieldCheck size={18} />
                  <p>
                    {t(
                      "Permainan, catatan, dan progres disimpan di localStorage browser. Ekspor PGN untuk salinan cadangan permainan Anda.",
                    )}
                  </p>
                </div>
              </div>
              <div className="help-sources">
                <span className="section-label">{t("RISET & TEKNOLOGI")}</span>
                <a
                  href="https://lichess.org/features"
                  target="_blank"
                  rel="noreferrer"
                >
                  <BookOpen size={18} />
                  <div>
                    <strong>{t("Lichess")}</strong>
                    <span>{t("Analisis, study, opening, dan latihan")}</span>
                  </div>
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://www.chess.com/analysis"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Grid2X2 size={18} />
                  <div>
                    <strong>{t("Chess.com")}</strong>
                    <span>{t("Game review dan latihan kesalahan")}</span>
                  </div>
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://chessify.me/analysis"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Cpu size={18} />
                  <div>
                    <strong>{t("Chessify")}</strong>
                    <span>{t("Variasi dan pengaturan engine")}</span>
                  </div>
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://chesstempo.com/chess-tactics/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Target size={18} />
                  <div>
                    <strong>{t("ChessTempo")}</strong>
                    <span>{t("Latihan berdasarkan motif taktik")}</span>
                  </div>
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://www.obsidianui.dev/docs/dashboard-shell"
                  target="_blank"
                  rel="noreferrer"
                >
                  <LayoutDashboard size={18} />
                  <div>
                    <strong>{t("ObsidianUI")}</strong>
                    <span>{t("Dashboard Shell resmi, React & Tailwind")}</span>
                  </div>
                  <ArrowRight size={15} />
                </a>
                <a
                  href="https://github.com/nmrugg/stockfish.js"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Swords size={18} />
                  <div>
                    <strong>{t("Stockfish.js")}</strong>
                    <span>{t("Engine lokal WebAssembly · GPL v3")}</span>
                  </div>
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </Modal>
        ),
      )}
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
}: {
  onClose: () => void;
  onLoad: (g: GameData) => void;
  saved: SavedGame[];
}) {
  const { t } = useI18n();

  const [source, setSource] = useState<"local" | "collection" | OnlineSource>(
    "local",
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
    <Modal title={t("Bawa permainanmu ke sini.")} onClose={onClose}>
      <div
        className="import-source-options"
        role="group"
        aria-label={t("Sumber permainan")}
      >
        {t(
          (
            [
              ["local", "PGN / FEN"],
              ["chesscom", "Chess.com"],
              ["lichess", "Lichess"],
              ["url", "Tautan PGN"],
              ["collection", "Koleksi"],
            ] as const
          ).map(([value, label]) => (
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
        source === "collection" ? (
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
            <p className="modal-description">
              {t(
                "Tempel satu permainan PGN atau posisi FEN. Semua diproses di perangkat Anda.",
              )}
            </p>
            <label className="field-label" htmlFor="game-import">
              {t("PGN atau FEN")}
            </label>
            <textarea
              id="game-import"
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
}: {
  saved: SavedGame[];
  onLoad: (g: GameData) => void;
  onDelete: (id: string) => void;
  onImport: () => void;
}) {
  const { t } = useI18n();

  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<SavedGame>();
  const filtered = saved.filter((s) =>
    `${s.game.event} ${s.game.white} ${s.game.black}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="page library-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">{t("KOLEKSI PRIBADI")}</div>
          <h1>
            {t("Permainan berlalu.")}
            <br />
            {t("Pelajarannya tinggal")}
            <span>{t(".")}</span>
          </h1>
          <p>
            {t("Simpan permainan yang berarti, dan kunjungi lagi kapan saja.")}
          </p>
        </div>
        <button className="button primary" onClick={onImport}>
          <Plus size={16} />
          {t(" Impor permainan")}
        </button>
      </div>
      <div className="catalog-toolbar">
        <h3>
          {t(saved.length)}
          {t(" permainan tersimpan")}
        </h3>
        <label className="search-input">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Cari pemain atau permainan…")}
            aria-label={t("Cari koleksi")}
          />
        </label>
      </div>
      {t(
        filtered.length ? (
          <div className="library-grid">
            {t(
              filtered.map((s) => (
                <article className="saved-game-card" key={s.id}>
                  <div className="saved-card-top">
                    <span className="saved-game-icon">
                      <FolderHeart size={23} />
                    </span>
                    <span className="subtle-pill">{t(s.game.result)}</span>
                    <button
                      className="icon-button"
                      aria-label={t(`Hapus ${s.game.event}`)}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <span className="small-label">
                    {t(
                      new Date(s.date).toLocaleDateString(t("id-ID"), {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }),
                    )}
                  </span>
                  <h3>{t(s.game.event)}</h3>
                  <p>
                    {t(s.game.white)} <span>{t("vs")}</span> {t(s.game.black)}
                  </p>
                  <div className="saved-card-bottom">
                    <span>
                      {t(s.game.moves.length)}
                      {t(" ply")}
                    </span>
                    <button
                      className="text-button"
                      onClick={() =>
                        downloadFile(
                          `${s.game.event.replace(/[^a-zA-Z0-9]/g, "-")}.pgn`,
                          toPgn(s.game),
                        )
                      }
                    >
                      <Download size={14} />
                      {t(" PGN")}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => onLoad(s.game)}
                    >
                      {t("Buka ")}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              )),
            )}
          </div>
        ) : (
          <div className="empty-state library-empty">
            <div className="empty-icon">
              <LibraryBig size={36} />
            </div>
            <h2>
              {t(
                search
                  ? "Belum ada yang cocok."
                  : "Halaman untuk perjalananmu.",
              )}
            </h2>
            <p>
              {t(
                search
                  ? "Coba nama pemain atau kata kunci lain."
                  : "Buka ruang analisis, lalu klik Simpan. Permainanmu akan tersusun di sini.",
              )}
            </p>
            <button className="button primary" onClick={onImport}>
              {t("Impor permainan pertama ")}
              <ArrowRight size={16} />
            </button>
          </div>
        ),
      )}
      <p className="content-note">
        <ShieldCheck size={14} />
        {t(
          " Koleksi disimpan di browser ini. Unduh PGN untuk mencadangkan permainan.",
        )}
      </p>
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
