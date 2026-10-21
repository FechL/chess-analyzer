import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Bookmark,
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
import Analysis from "./pages/Analysis";
import BotPage from "./pages/Bot";
import { AcademyPage, OpeningsPage, PuzzlesPage } from "./pages/Learn";
import { Modal, ProgressRing } from "./components/Common";
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
import { LESSONS } from "./data/content";

export type Settings = {
  boardTheme: "sage" | "walnut" | "slate";
  analysisMs: number;
  multiPV: number;
};
type SavedGame = { id: string; date: string; game: GameData };
const TITLES: Record<string, string> = {
  analysis: "Analisis permainan",
  bot: "Lawan bot",
  openings: "Opening explorer",
  academy: "Akademi catur",
  puzzles: "Latihan taktik",
  library: "Koleksi permainan",
};
const DEFAULT_SETTINGS: Settings = {
  boardTheme: "sage",
  analysisMs: 800,
  multiPV: 3,
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
  const [page, setPage] = useState(() =>
    TITLES[location.hash.slice(1)] ? location.hash.slice(1) : "analysis",
  );
  const [game, setGame] = useState<GameData>(restoreGame);
  const [analysisFen, setAnalysisFen] = useState(() => {
    const g = restoreGame();
    return positionAt(g, Math.min(14, g.moves.length)).fen();
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
    "import" | "settings" | "help" | undefined
  >();
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
  }, [settings]);
  useEffect(() => {
    writeStorage("kuda-library", saved);
  }, [saved]);
  useEffect(() => {
    const handler = () => {
      const next = location.hash.slice(1);
      if (TITLES[next]) setPage(next);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    document.title = `${TITLES[page]} · Kuda`;
    setCompleted(readStorage("kuda-lessons", []));
  }, [page, modal]);
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
    setPage(id);
    location.hash = id;
  };
  const notify = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  const load = (g: GameData) => {
    setGame(g);
    setAnalysisFen(positionAt(g, Math.min(14, g.moves.length)).fen());
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
        { id: "puzzles", label: "Latihan taktik", icon: Target },
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
    <>
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
              <img src="/pieces/wN.svg" alt="" />
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
        title={
          <span className="breadcrumb">
            <span>Studio</span>
            <ChevronRight size={14} />
            {TITLES[page]}
          </span>
        }
        headerActions={
          <>
            {page === "analysis" && (
              <div className="header-game-actions">
                <button
                  className="button secondary"
                  onClick={save}
                  aria-label="Simpan permainan"
                  title="Simpan permainan"
                >
                  <Bookmark size={16} />
                  <span className="header-action-label">Simpan</span>
                </button>
                <button
                  className="button primary"
                  onClick={() => setModal("import")}
                  aria-label="Impor permainan"
                  title="Impor permainan"
                >
                  <ArrowDownToLine size={16} />
                  <span className="header-action-label">Impor permainan</span>
                </button>
              </div>
            )}
            <button
              className="icon-button header-help"
              aria-label="Buka panduan"
              onClick={() => setModal("help")}
            >
              <HelpCircle size={18} />
            </button>
            <span className="profile-avatar" title="Profil lokal">
              K
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
                Satu langkah
                <br />
                lebih baik, setiap hari.
              </h3>
              <p>
                Luangkan waktu untuk
                <br />
                rasa ingin tahumu.
              </p>
              <button onClick={() => navigate("academy")}>
                Lanjutkan belajar <ArrowRight size={14} />
              </button>
              <div className="sidebar-progress">
                <span style={{ width: `${percent}%` }} />
              </div>
              <span className="sidebar-progress-label">
                {completed.length}/{LESSONS.length} pelajaran selesai
              </span>
            </div>
            <div className="sidebar-bottom">
              <span className="status-dot" />
              <span>Ruang untuk berkembang.</span>
              <span>v1.0</span>
            </div>
          </div>
        }
      >
        {page === "analysis" && (
          <Analysis
            key={revision}
            game={game}
            setGame={setGame}
            settings={settings}
            onOpening={() => navigate("openings")}
            onPositionChange={setAnalysisFen}
          />
        )}
        {page === "bot" && (
          <BotPage
            settings={settings}
            analysisFen={analysisFen}
            onReview={load}
          />
        )}
        {page === "openings" && (
          <OpeningsPage settings={settings} onAnalyze={analyzePosition} />
        )}
        {page === "academy" && (
          <AcademyPage settings={settings} onAnalyze={analyzePosition} />
        )}
        {page === "puzzles" && (
          <PuzzlesPage settings={settings} onAnalyze={analyzePosition} />
        )}
        {page === "library" && (
          <Library
            saved={saved}
            onLoad={load}
            onDelete={(id) => {
              setSaved((s) => s.filter((g) => g.id !== id));
              notify("Permainan dihapus dari koleksi.");
            }}
            onImport={() => setModal("import")}
          />
        )}
      </DashboardShell>
      {modal === "import" && (
        <ImportModal
          onClose={() => setModal(undefined)}
          onLoad={load}
          onNew={() => load(emptyGame())}
        />
      )}
      {modal === "settings" && (
        <Modal
          title="Buat ruang ini milikmu"
          onClose={() => setModal(undefined)}
        >
          <p className="modal-description">
            Preferensi tersimpan otomatis di perangkat ini.
          </p>
          <div className="settings-section">
            <label>Tampilan papan</label>
            <div className="board-theme-options">
              {(["sage", "walnut", "slate"] as const).map((theme, i) => (
                <button
                  key={theme}
                  className={settings.boardTheme === theme ? "active" : ""}
                  onClick={() =>
                    setSettings((s) => ({ ...s, boardTheme: theme }))
                  }
                >
                  <span className={`theme-swatch swatch-${theme}`} />
                  <span>
                    {["Sage garden", "Warm walnut", "Quiet slate"][i]}
                  </span>
                  {settings.boardTheme === theme && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-section">
            <label htmlFor="analysis-time">
              Waktu analisis per posisi{" "}
              <strong>{settings.analysisMs / 1000} detik</strong>
            </label>
            <input
              id="analysis-time"
              type="range"
              min="200"
              max="5000"
              step="100"
              value={settings.analysisMs}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  analysisMs: Number(e.target.value),
                }))
              }
            />
            <div className="range-labels">
              <span>Respons cepat</span>
              <span>Analisis lebih dalam</span>
            </div>
            <p>
              Ulasan seluruh permainan memakai 350 ms per posisi. Waktu di atas
              berlaku untuk analisis posisi yang sedang dibuka.
            </p>
          </div>
          <div className="settings-section">
            <label htmlFor="variation-count">Jumlah variasi terbaik</label>
            <select
              id="variation-count"
              value={settings.multiPV}
              onChange={(e) =>
                setSettings((s) => ({ ...s, multiPV: Number(e.target.value) }))
              }
            >
              <option value={1}>1 variasi · paling hemat</option>
              <option value={2}>2 variasi</option>
              <option value={3}>3 variasi · jelajahi alternatif</option>
            </select>
          </div>
          <div className="settings-engine">
            <Cpu size={19} />
            <div>
              <strong>Stockfish 19 · Lite single-threaded</strong>
              <p>
                1 thread CPU · 64 MiB hash. Total RAM juga mencakup engine dan
                aplikasi.
              </p>
            </div>
          </div>
          <button
            className="button secondary"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
          >
            <Settings2 size={15} /> Kembalikan pengaturan awal
          </button>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Selamat datang di Kuda."
          onClose={() => setModal(undefined)}
          wide
        >
          <div className="help-layout">
            <div className="prose">
              <span className="small-label">
                RUANG KECIL UNTUK PERMAINAN BESAR
              </span>
              <h3>Belajar dengan memainkan idenya.</h3>
              <p>
                Mulai dari contoh Opera Game, impor PGN/FEN Anda, atau buat
                analisis baru. Klik buah lalu petak tujuan; Anda juga bisa
                menyeret buah.
              </p>
              <ul>
                <li>
                  <strong>Analisis:</strong> ulas seluruh permainan, periksa
                  evaluasi dan variasi, tambahkan catatan, lalu latih ulang
                  kesalahan.
                </li>
                <li>
                  <strong>Lawan bot:</strong> pilih satu dari empat preset,
                  warna, dan waktu. Gunakan petunjuk saat belajar.
                </li>
                <li>
                  <strong>Opening:</strong> 12 jalur terkurasi dengan penjelasan
                  dan latihan urutan.
                </li>
                <li>
                  <strong>Akademi:</strong> 9 tutorial interaktif tentang dasar,
                  taktik, skakmat, dan aturan khusus.
                </li>
                <li>
                  <strong>Taktik:</strong> 6 tantangan terkurasi untuk mengenali
                  pola.
                </li>
                <li>
                  <strong>Koleksi:</strong> simpan permainan dan ekspor PGN.
                </li>
              </ul>
              <p>
                <kbd>←</kbd> <kbd>→</kbd> navigasi langkah · <kbd>F</kbd> balik
                papan · <kbd>Esc</kbd> tutup dialog
              </p>
              <div className="study-tip">
                <ShieldCheck size={18} />
                <p>
                  Permainan, catatan, dan progres disimpan di localStorage
                  browser. Ekspor PGN untuk salinan cadangan permainan Anda.
                </p>
              </div>
            </div>
            <div className="help-sources">
              <span className="section-label">RISET & TEKNOLOGI</span>
              <a
                href="https://lichess.org/features"
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen size={18} />
                <div>
                  <strong>Lichess</strong>
                  <span>Analisis, study, opening, dan latihan</span>
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
                  <strong>Chess.com</strong>
                  <span>Game review dan latihan kesalahan</span>
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
                  <strong>Chessify</strong>
                  <span>Variasi dan pengaturan engine</span>
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
                  <strong>ChessTempo</strong>
                  <span>Latihan berdasarkan motif taktik</span>
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
                  <strong>ObsidianUI</strong>
                  <span>Dashboard Shell resmi, React & Tailwind</span>
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
                  <strong>Stockfish.js</strong>
                  <span>Engine lokal WebAssembly · GPL v3</span>
                </div>
                <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Tutup notifikasi"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}

function ImportModal({
  onClose,
  onLoad,
  onNew,
}: {
  onClose: () => void;
  onLoad: (g: GameData) => void;
  onNew: () => void;
}) {
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
    <Modal title="Bawa permainanmu ke sini." onClose={onClose}>
      <p className="modal-description">
        Tempel satu permainan PGN atau posisi FEN. Semua diproses di perangkat
        Anda.
      </p>
      <label className="field-label" htmlFor="game-import">
        PGN atau FEN
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
        placeholder={
          '[White "Nama Anda"]\n[Black "Lawan"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4…'
        }
        rows={9}
      />
      <input
        className="sr-only"
        ref={file}
        type="file"
        accept=".pgn,.fen,.txt"
        aria-label="Berkas permainan"
        onChange={(e) => readFile(e.target.files?.[0])}
      />
      <div className="import-options">
        <button className="text-button" onClick={() => file.current?.click()}>
          <Upload size={14} /> Unggah berkas
        </button>
        <button
          className="text-button"
          onClick={() => {
            setInput(SAMPLE_PGN);
            setError("");
          }}
        >
          Gunakan contoh Opera Game
        </button>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <div className="modal-actions">
        <button className="button secondary" onClick={onNew}>
          <Plus size={15} /> Papan baru
        </button>
        <button
          className="button primary"
          onClick={load}
          disabled={!input.trim()}
        >
          Buka analisis <ArrowRight size={15} />
        </button>
      </div>
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
          <div className="eyebrow">KOLEKSI PRIBADI</div>
          <h1>
            Permainan berlalu.
            <br />
            Pelajarannya tinggal<span>.</span>
          </h1>
          <p>Simpan permainan yang berarti, dan kunjungi lagi kapan saja.</p>
        </div>
        <button className="button primary" onClick={onImport}>
          <Plus size={16} /> Impor permainan
        </button>
      </div>
      <div className="catalog-toolbar">
        <h3>{saved.length} permainan tersimpan</h3>
        <label className="search-input">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pemain atau permainan…"
            aria-label="Cari koleksi"
          />
        </label>
      </div>
      {filtered.length ? (
        <div className="library-grid">
          {filtered.map((s) => (
            <article className="saved-game-card" key={s.id}>
              <div className="saved-card-top">
                <span className="saved-game-icon">
                  <FolderHeart size={23} />
                </span>
                <span className="subtle-pill">{s.game.result}</span>
                <button
                  className="icon-button"
                  aria-label={`Hapus ${s.game.event}`}
                  onClick={() => setDeleting(s)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <span className="small-label">
                {new Date(s.date).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <h3>{s.game.event}</h3>
              <p>
                {s.game.white} <span>vs</span> {s.game.black}
              </p>
              <div className="saved-card-bottom">
                <span>{s.game.moves.length} ply</span>
                <button
                  className="text-button"
                  onClick={() =>
                    downloadFile(
                      `${s.game.event.replace(/[^a-zA-Z0-9]/g, "-")}.pgn`,
                      toPgn(s.game),
                    )
                  }
                >
                  <Download size={14} /> PGN
                </button>
                <button
                  className="button secondary"
                  onClick={() => onLoad(s.game)}
                >
                  Buka <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state library-empty">
          <div className="empty-icon">
            <LibraryBig size={36} />
          </div>
          <h2>
            {search ? "Belum ada yang cocok." : "Halaman untuk perjalananmu."}
          </h2>
          <p>
            {search
              ? "Coba nama pemain atau kata kunci lain."
              : "Buka ruang analisis, lalu klik Simpan. Permainanmu akan tersusun di sini."}
          </p>
          <button className="button primary" onClick={onImport}>
            Impor permainan pertama <ArrowRight size={16} />
          </button>
        </div>
      )}
      <p className="content-note">
        <ShieldCheck size={14} /> Koleksi disimpan di browser ini. Unduh PGN
        untuk mencadangkan permainan.
      </p>
      {deleting && (
        <Modal
          title="Hapus dari koleksi?"
          onClose={() => setDeleting(undefined)}
        >
          <p className="modal-description">
            {deleting.game.event} akan dihapus dari penyimpanan koleksi lokal.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(undefined)}
            >
              Batal
            </button>
            <button
              className="button danger"
              onClick={() => {
                onDelete(deleting.id);
                setDeleting(undefined);
              }}
            >
              Hapus permainan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
