import Title from "../components/Title";
// i18n: rendered text
import { pieceAsset } from "../lib/preferences";
import { useI18n } from "@/lib/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flag,
  Flame,
  GraduationCap,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import Board, { EvalBar } from "../components/Board";
import {
  IconButton,
  Modal,
  NavigationControls,
  NavigationShortcutHint,
  ProgressRing,
} from "../components/Common";
import { LESSONS, OPENINGS } from "../data/content";
import type { Exercise } from "../data/content";
import { readStorage, writeStorage } from "../lib/chess";
import type { Evaluation } from "../lib/chess";
import { useEngine } from "../hooks/useEngine";
import { playBoardSound } from "../lib/board-sound";
import { LocalEngine } from "../lib/engine";
import { findPuzzleReply } from "../lib/puzzle-reply";
import type { PuzzleReply } from "../lib/puzzle-reply";
import { appendPremove, executePremove } from "../lib/premove";
import type { Premove } from "../lib/premove";
import {
  DashboardPopover,
  DashboardPopoverContent,
  DashboardPopoverTrigger,
} from "../components/block/dashboard-shell";
import {
  cachedPuzzles,
  consumePuzzle,
  ensurePuzzles,
} from "../lib/lichess-puzzles";
import type { LichessPuzzle, PuzzleDifficulty } from "../lib/lichess-puzzles";
import type { Settings } from "../App";

const PUZZLE_THEMES: [string, string][] = [
  ["mix", "Campuran"],
  ["mateIn1", "Mat dalam 1 langkah"],
  ["fork", "Garpu"],
  ["pin", "Ikatan"],
  ["endgame", "Endgame"],
  ["sacrifice", "Pengorbanan"],
];
const PUZZLE_DIFFICULTIES: [PuzzleDifficulty, string][] = [
  ["easiest", "Sangat mudah"],
  ["easier", "Mudah"],
  ["normal", "Normal"],
  ["harder", "Sulit"],
  ["hardest", "Sangat sulit"],
];

type PuzzleHistoryEntry = {
  id: string;
  number?: number;
  clean?: boolean;
  rating: number;
  elapsedMs: number;
  outcome: "solved" | "skipped";
};

type PuzzleSessionSnapshot = {
  puzzleId: string;
  theme: string;
  difficulty: PuzzleDifficulty;
  elapsedMs: number;
  started: boolean;
};

type PuzzleMoveFeedback = {
  kind: "ready" | "correct" | "wrong" | "complete" | "hint";
  move?: string;
  reply?: string;
  replyStatus?: "searching" | "shown" | "unavailable" | "terminal";
};

function formatPuzzleDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatPuzzleClock(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function OpeningsPage({
  settings,
  onOpenOpening,
}: {
  settings: Settings;
  onOpenOpening: (id: string) => void;
}) {
  const { t } = useI18n();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [completed] = useState<string[]>(() =>
    readStorage("kuda-openings", []),
  );
  const openings = OPENINGS.filter(
    (o) =>
      (filter === "all" || o.side === filter) &&
      `${o.name} ${o.eco} ${o.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="page learning-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">{t("OPENING EXPLORER")}</div>
          <Title as="h1">
            {t("Langkah pertama.")}
            <br />
            {t("Rencana yang lebih besar")}
            <span>{t(".")}</span>
          </Title>
          <p>
            {t(
              "Jangan hanya menghafal. Temukan alasan di balik setiap langkah.",
            )}
          </p>
        </div>
        <div className="learning-counter">
          <GitOpening />
          <strong>{t(OPENINGS.length)}</strong>
          <span>
            {t("opening pilihan")}
            <br />
            {t("untuk repertoarmu")}
          </span>
        </div>
      </div>
      <div className="feature-banner">
        <div className="feature-chess-icon">{t("♘")}</div>
        <div>
          <span className="small-label">{t("REKOMENDASI UNTUK MEMULAI")}</span>
          <Title as="h2">
            {t("Italian Game. Klasik untuk sebuah alasan.")}
          </Title>
          <p>
            {t(
              "Kontrol pusat, kembangkan buah, dan amankan raja. Semua dalam satu opening.",
            )}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => onOpenOpening(OPENINGS[0].id)}
        >
          {t("Pelajari sekarang ")}
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="catalog-toolbar">
        <div className="segmented">
          {t(
            [
              ["all", "Semua opening"],
              ["w", "Untuk putih"],
              ["b", "Untuk hitam"],
            ].map(([id, label]) => (
              <button
                className={filter === id ? "active" : ""}
                key={id}
                onClick={() => setFilter(id)}
              >
                {t(label)}
              </button>
            )),
          )}
        </div>
        <label className="search-input">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Cari opening atau kode ECO…")}
            aria-label={t("Cari opening")}
          />
        </label>
      </div>
      <div className="opening-grid">
        {t(
          openings.map((o, i) => {
            const c = new Chess();
            o.moves.slice(0, 6).forEach((m) => c.move(m));
            return (
              <article
                className="opening-card"
                key={o.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenOpening(o.id);
                  }
                }}
                onClick={() => onOpenOpening(o.id)}
              >
                <div className={`opening-card-art art-${i % 4}`}>
                  <div className="opening-mini-board" inert>
                    <Board
                      fen={c.fen()}
                      flipped={o.side === "b"}
                      compact
                      theme={settings.boardTheme}
                      disabled
                    />
                  </div>
                  <span className="eco-label">{t(o.eco)}</span>
                  {t(
                    completed.includes(o.id) && (
                      <span className="complete-badge">
                        <Check size={13} />
                        {t(" Dipelajari")}
                      </span>
                    ),
                  )}
                </div>
                <div className="opening-card-content">
                  <div className="opening-card-meta">
                    <span>{t(o.side === "w" ? "● Putih" : "● Hitam")}</span>
                    <span>{t(o.level)}</span>
                  </div>
                  <Title as="h3">
                    {t(o.name)}
                    <ArrowRight size={18} />
                  </Title>
                  <p>{t(o.description)}</p>
                  <div className="opening-moves">
                    {t(
                      o.moves.slice(0, 6).map((m, j) => (
                        <span key={j}>
                          {t(j % 2 === 0 ? `${Math.floor(j / 2) + 1}. ` : "")}
                          {t(m)}
                        </span>
                      )),
                    )}
                  </div>
                </div>
              </article>
            );
          }),
        )}
      </div>
      {t(
        !openings.length && (
          <div className="empty-state">
            <Search size={32} />
            <Title as="h3">{t("Opening belum ditemukan")}</Title>
            <p>{t("Coba nama, kode ECO, atau filter lain.")}</p>
          </div>
        ),
      )}
      <p className="content-note">
        {t(
          "Repertoar lokal terkurasi · Jalur contoh untuk belajar, bukan database statistik pertandingan.",
        )}
      </p>
    </div>
  );
}
function GitOpening() {
  const { t } = useI18n();

  return (
    <div className="learning-counter-icon">
      <BookOpen size={27} />
    </div>
  );
}

export function AcademyPage({
  settings,
  onAnalyze,
}: {
  settings: Settings;
  onAnalyze: (fen: string, name: string) => void;
}) {
  const { t } = useI18n();

  const [category, setCategory] = useState("Semua");
  const [selected, setSelected] = useState<Exercise>();
  const [completed, setCompleted] = useState<string[]>(() =>
    readStorage("kuda-lessons", []),
  );
  const categories = [
    "Semua",
    "Dasar",
    "Taktik",
    "Skakmat",
    "Endgame",
    "Aturan khusus",
  ];
  const percent = Math.round((completed.length / LESSONS.length) * 100);
  return (
    <div className="page learning-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">{t("AKADEMI KUDA")}</div>
          <Title as="h1">
            {t("Pahami satu ide.")}
            <br />
            {t("Naik satu tingkat")}
            <span>{t(".")}</span>
          </Title>
          <p>
            {t("Pelajaran singkat. Papan interaktif. Pemahaman yang bertahan.")}
          </p>
        </div>
        <div className="academy-progress">
          <ProgressRing percent={percent} size={62} />
          <div>
            <strong>{t("Perjalanan belajarmu")}</strong>
            <span>
              {t(completed.length)}
              {t(" dari ")}
              {t(LESSONS.length)}
              {t(" pelajaran selesai")}
            </span>
          </div>
        </div>
      </div>
      <div className="academy-feature">
        <div className="academy-feature-copy">
          <span className="small-label">{t("MULAI DARI FONDASI")}</span>
          <Title as="h2">
            {t("Permainan hebat dimulai")}
            <br />
            {t("dari kebiasaan kecil.")}
          </Title>
          <p>
            {t(
              "Kuasai pusat, aktifkan buah, dan jaga raja. Jadikan tiga prinsip ini bagian dari setiap permainan.",
            )}
          </p>
          <button
            className="button primary"
            onClick={() =>
              setSelected(
                LESSONS.find((l) => !completed.includes(l.id)) ?? LESSONS[0],
              )
            }
          >
            {t("Lanjutkan belajar ")}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="academy-illustration" aria-hidden="true">
          <div className="illustration-board" />
          {t(
            ["wN", "wK", "wB"].map((p, i) => (
              <img
                className={`hero-piece piece-${i}`}
                key={p}
                src={pieceAsset(p[0], p[1], settings.pieceTheme)}
                alt={t("")}
              />
            )),
          )}
          <span className="illustration-spark spark-1">{t("✦")}</span>
          <span className="illustration-spark spark-2">{t("✦")}</span>
          <span className="illustration-note">
            <CheckCheck size={15} />
            {t(" Sedikit latihan, setiap hari.")}
          </span>
        </div>
      </div>
      <div className="catalog-toolbar">
        <div className="segmented wrap">
          {t(
            categories.map((c) => (
              <button
                className={category === c ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {t(c)}
              </button>
            )),
          )}
        </div>
        <span className="muted">{t("Belajar dengan ritmemu sendiri")}</span>
      </div>
      <div className="lesson-grid">
        {t(
          LESSONS.filter(
            (l) => category === "Semua" || l.category === category,
          ).map((l, i) => (
            <button
              key={l.id}
              className="lesson-card"
              onClick={() => setSelected(l)}
            >
              <div className="lesson-top">
                <span className={`lesson-icon tone-${i % 3}`}>
                  {t(
                    l.category === "Taktik" ? (
                      <Target size={24} />
                    ) : l.category === "Endgame" ? (
                      <Flag size={24} />
                    ) : l.category === "Skakmat" ? (
                      <Trophy size={24} />
                    ) : (
                      <GraduationCap size={24} />
                    ),
                  )}
                </span>
                {t(
                  completed.includes(l.id) ? (
                    <span className="lesson-done">
                      <Check size={14} />
                      {t(" Selesai")}
                    </span>
                  ) : (
                    <span className="lesson-number">
                      {t(String(LESSONS.indexOf(l) + 1).padStart(2, "0"))}
                    </span>
                  ),
                )}
              </div>
              <span className="small-label">
                {t(l.category)}
                {t(" · ")}
                {t(l.level)}
              </span>
              <Title as="h3">{t(l.title)}</Title>
              <p>{t(l.description)}</p>
              <div className="lesson-bottom">
                <span>
                  <Clock3 size={13} />
                  {t(l.minutes)}
                  {t(" menit")}
                </span>
                <span>
                  {t("Mulai pelajaran ")}
                  <ArrowRight size={14} />
                </span>
              </div>
            </button>
          )),
        )}
      </div>
      {t(
        selected && (
          <Modal
            title={t(selected.title)}
            onClose={() => setSelected(undefined)}
            wide
          >
            <div className="study-layout">
              <LineTrainer
                key={selected.id}
                fen={selected.fen}
                moves={selected.solution}
                color={selected.fen.split(" ")[1] as "w" | "b"}
                theme={settings.boardTheme}
                title={t(selected.description)}
                hint={selected.hint}
                explanation={selected.explanation}
                startTraining
                onComplete={() => {
                  const next = [...new Set([...completed, selected.id])];
                  setCompleted(next);
                  writeStorage("kuda-lessons", next);
                }}
                onAnalyze={(fen) => {
                  onAnalyze(fen, selected.title);
                  setSelected(undefined);
                }}
              />
              <div className="study-theory">
                <span className="subtle-pill">
                  {t(selected.category)}
                  {t(" · ")}
                  {t(selected.minutes)}
                  {t(" menit")}
                </span>
                <Title as="h3">{t("Ide yang perlu dibawa.")}</Title>
                <ol>
                  {t(
                    selected.theory.map((idea, i) => (
                      <li key={i}>
                        <span>{t(String(i + 1).padStart(2, "0"))}</span>
                        {t(idea)}
                      </li>
                    )),
                  )}
                </ol>
                <div className="study-tip">
                  <Lightbulb size={18} />
                  <p>
                    {t(
                      "Baca posisi, periksa ancaman, lalu coba langkahmu langsung di papan.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        ),
      )}
    </div>
  );
}

export function PuzzlesPage({
  settings,
  onSettingsChange,
  onAnalyze,
}: {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onAnalyze: (fen: string, name: string) => void;
}) {
  const { t } = useI18n();

  const [savedSession] = useState(() =>
    readStorage<PuzzleSessionSnapshot | undefined>(
      "kuda-puzzle-session",
      undefined,
    ),
  );
  const [tab, setTab] = useState("puzzle");
  const [theme, setTheme] = useState(savedSession?.theme ?? "mix");
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>(
    savedSession?.difficulty ?? "normal",
  );
  const [puzzle, setPuzzle] = useState<LichessPuzzle | undefined>(
    () =>
      cachedPuzzles(
        savedSession?.theme ?? "mix",
        savedSession?.difficulty ?? "normal",
      )[0],
  );
  const [completed, setCompleted] = useState<string[]>(() =>
    readStorage("kuda-lichess-completed", []),
  );
  const [puzzleHistory, setPuzzleHistory] = useState<PuzzleHistoryEntry[]>(() =>
    readStorage("kuda-puzzle-history", []),
  );
  const puzzleHistoryRef = useRef(puzzleHistory);
  const [streak, setStreak] = useState(() =>
    readStorage("kuda-puzzle-streak", 0),
  );
  const [started, setStarted] = useState(
    () => savedSession?.started ?? readStorage("kuda-puzzle-streak", 0) > 0,
  );
  const [paused, setPaused] = useState(() => !!savedSession?.started);
  const [best, setBest] = useState(() => readStorage("kuda-puzzle-best", 0));
  const [record, setRecord] = useState(() =>
    readStorage("kuda-puzzle-record", false),
  );
  const [autoNext, setAutoNext] = useState(() =>
    readStorage("kuda-puzzle-auto-next", true),
  );
  const [attempt, setAttempt] = useState(0);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [moveFeedback, setMoveFeedback] = useState<PuzzleMoveFeedback>({
    kind: "ready",
  });
  const [positionFen, setPositionFen] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const elapsedRef = useRef(0);
  const startedRef = useRef(started);
  const pausedRef = useRef(paused);
  const firstPuzzleLoad = useRef(true);
  const puzzleSession = useRef<PuzzleSessionSnapshot | undefined>(undefined);
  startedRef.current = started;
  pausedRef.current = paused;
  puzzleSession.current = puzzle
    ? { puzzleId: puzzle.id, theme, difficulty, elapsedMs, started }
    : undefined;
  const recordedPuzzleId = useRef<string | undefined>(undefined);
  const consumedPuzzleIds = useRef(new Set<string>());
  const autoNextTimer = useRef<number | undefined>(undefined);
  const { engine, status } = useEngine(settings.engine);
  const replyEngine = useRef<LocalEngine | null>(null);
  useEffect(
    () => () => {
      replyEngine.current?.destroy();
      replyEngine.current = null;
    },
    [settings.engine],
  );
  const getOpponentReply = useCallback(
    (fen: string) =>
      findPuzzleReply(fen, async (position) => {
        const instance = (replyEngine.current ??= new LocalEngine(
          settings.engine,
        ));
        try {
          return await instance.analyze(position, { ms: 350, multiPV: 1 });
        } catch (error) {
          if (replyEngine.current === instance) {
            instance.destroy();
            replyEngine.current = null;
          }
          throw error;
        }
      }),
    [settings.engine],
  );
  const consume = (current: LichessPuzzle) => {
    if (consumedPuzzleIds.current.has(current.id)) return;
    consumePuzzle(theme, difficulty, current.id);
    consumedPuzzleIds.current.add(current.id);
  };
  const recordAttempt = (
    outcome: PuzzleHistoryEntry["outcome"],
    clean?: boolean,
  ) => {
    if (!puzzle || recordedPuzzleId.current === puzzle.id) return;
    recordedPuzzleId.current = puzzle.id;
    const history = puzzleHistoryRef.current.map((item, index, entries) => ({
      ...item,
      number: item.number ?? entries.length - index,
    }));
    const entry: PuzzleHistoryEntry = {
      id: puzzle.id,
      number: (history[0]?.number ?? 0) + 1,
      clean,
      rating: puzzle.rating,
      elapsedMs: Math.max(0, elapsedRef.current),
      outcome,
    };
    setElapsedMs(entry.elapsedMs);
    const next = [entry, ...history].slice(0, 100);
    puzzleHistoryRef.current = next;
    setPuzzleHistory(next);
    writeStorage("kuda-puzzle-history", next);
  };
  const load = async (next = false) => {
    setShowSkipWarning(false);
    if (autoNextTimer.current !== undefined) {
      window.clearTimeout(autoNextTimer.current);
      autoNextTimer.current = undefined;
    }
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    if (next && puzzle) consume(puzzle);
    try {
      const available = await ensurePuzzles(theme, difficulty);
      if (id !== requestId.current) return;
      const nextPuzzle = available[0];
      setPuzzle(nextPuzzle);
      setPuzzleSolved(false);
      const restored =
        firstPuzzleLoad.current &&
        nextPuzzle &&
        savedSession?.puzzleId === nextPuzzle.id &&
        savedSession.theme === theme &&
        savedSession.difficulty === difficulty;
      const shouldStart = restored
        ? savedSession.started
        : firstPuzzleLoad.current
          ? streak > 0
          : startedRef.current;
      const shouldPause = restored
        ? true
        : firstPuzzleLoad.current
          ? !shouldStart
          : pausedRef.current;
      const restoredElapsed = restored ? savedSession.elapsedMs : 0;
      firstPuzzleLoad.current = false;
      elapsedRef.current = restoredElapsed;
      setElapsedMs(restoredElapsed);
      setStarted(shouldStart);
      setPaused(shouldPause);
      recordedPuzzleId.current = undefined;
      setAttempt(0);
      if (!available.length) setError("Belum ada puzzle baru. Coba tema lain.");
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };
  useEffect(() => {
    const available = cachedPuzzles(theme, difficulty);
    setPuzzle(available[0]);
    setPuzzleSolved(false);
    elapsedRef.current = 0;
    setElapsedMs(0);
    recordedPuzzleId.current = undefined;
    void load();
    return () => {
      requestId.current++;
    };
  }, [theme, difficulty]);
  useEffect(() => {
    if (!puzzle || !started || paused || puzzleSolved || busy) return;
    let lastTick = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;
      setElapsedMs((current) => {
        const next = current + delta;
        elapsedRef.current = next;
        return next;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [puzzle, started, paused, attempt, puzzleSolved, busy]);
  useEffect(
    () => () => {
      if (firstPuzzleLoad.current) return;
      const current = puzzleSession.current;
      if (current?.started) writeStorage("kuda-puzzle-session", current);
    },
    [],
  );
  useEffect(
    () => () => {
      if (autoNextTimer.current !== undefined)
        window.clearTimeout(autoNextTimer.current);
    },
    [],
  );
  const complete = (clean: boolean) => {
    if (!puzzle) return;
    setShowSkipWarning(false);
    setPuzzleSolved(true);
    recordAttempt("solved", clean);
    playBoardSound("success");
    const next = [...new Set([...completed, puzzle.id])];
    setCompleted(next);
    writeStorage("kuda-lichess-completed", next);
    consume(puzzle);
    void ensurePuzzles(theme, difficulty).catch((e) => {
      setError((e as Error).message);
    });
    if (autoNext) {
      autoNextTimer.current = window.setTimeout(() => {
        autoNextTimer.current = undefined;
        void load(true);
      }, 1300);
    }
  };
  const goToNextPuzzle = () => {
    if (!puzzle || busy) return;
    if (!puzzleSolved) {
      recordAttempt("skipped");
      breakStreak();
    }
    void load(true);
  };
  const requestNextPuzzle = () => {
    if (!puzzle || busy) return;
    if (!puzzleSolved && streak >= 1) {
      setShowSkipWarning(true);
      return;
    }
    goToNextPuzzle();
  };
  const retryPuzzle = () => {
    if (autoNextTimer.current !== undefined) {
      window.clearTimeout(autoNextTimer.current);
      autoNextTimer.current = undefined;
    }
    elapsedRef.current = 0;
    setElapsedMs(0);
    recordedPuzzleId.current = undefined;
    setPuzzleSolved(false);
    setAttempt((value) => value + 1);
  };
  const breakStreak = () => {
    setShowSkipWarning(false);
    setRecord(false);
    writeStorage("kuda-puzzle-record", false);
    if (streak <= 0) return;
    setStreak(0);
    writeStorage("kuda-puzzle-streak", 0);
  };
  const growStreak = () => {
    const next = streak + 1;
    setStreak(next);
    writeStorage("kuda-puzzle-streak", next);
    if (next > best) {
      setBest(next);
      writeStorage("kuda-puzzle-best", next);
      setRecord(true);
      writeStorage("kuda-puzzle-record", true);
    }
  };
  const startOrResumePuzzle = () => {
    if (!puzzle || puzzleSolved) return;
    startedRef.current = true;
    pausedRef.current = false;
    setStarted(true);
    setPaused(false);
    const snapshot = {
      puzzleId: puzzle.id,
      theme,
      difficulty,
      elapsedMs: elapsedRef.current,
      started: true,
    };
    puzzleSession.current = snapshot;
    writeStorage("kuda-puzzle-session", snapshot);
  };
  const togglePuzzlePause = () => {
    if (!puzzle || !startedRef.current || puzzleSolved) return;
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    const snapshot = {
      puzzleId: puzzle.id,
      theme,
      difficulty,
      elapsedMs: elapsedRef.current,
      started: true,
    };
    puzzleSession.current = snapshot;
    writeStorage("kuda-puzzle-session", snapshot);
  };
  const validEvaluation =
    evaluation?.fen === positionFen ? evaluation : undefined;
  useEffect(() => {
    if (
      !settings.showEvalBar ||
      status !== "ready" ||
      !engine.current ||
      !positionFen
    )
      return;
    const instance = engine.current;
    let active = true;
    const timer = setTimeout(() => {
      instance
        .analyze(positionFen, { ms: 350, multiPV: 1 })
        .then((value) => {
          if (active) setEvaluation(value);
        })
        .catch(() => {});
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
      instance.stop();
    };
  }, [positionFen, status, settings.showEvalBar, settings.engine, engine]);
  const color = (puzzle?.fen.split(" ")[1] as "w" | "b") ?? "w";
  const activeTheme = PUZZLE_THEMES.find(([id]) => id === theme)?.[1];
  const activeDifficulty = PUZZLE_DIFFICULTIES.find(
    ([id]) => id === difficulty,
  )?.[1];
  return (
    <div className="page analysis-page puzzle-page">
      <div className="workspace-toolbar">
        <div className="game-title-block">
          <Title as="strong">
            {t(puzzle ? "Puzzle Lichess #" + puzzle.id : "Puzzle Lichess")}
          </Title>
          <div className="game-players">
            {t(
              puzzle && (
                <span className="game-player">
                  <span
                    className={"player-color player-color-" + color}
                    aria-hidden="true"
                  />
                  <strong>{t(color === "w" ? "Putih" : "Hitam")}</strong>
                  <span>
                    {t("melangkah")}
                    {t(" · ")}
                    {t("Rating ")}
                    {t(puzzle.rating)}
                  </span>
                </span>
              ),
            )}
            <span className="game-player">
              <strong>{t(activeTheme ?? "Campuran")}</strong>
              <span>{t(activeDifficulty ?? "Normal")}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="analysis-grid">
        <section className="board-section">
          {t(
            puzzle ? (
              <LineTrainer
                key={`${puzzle.id}:${attempt}`}
                fen={puzzle.fen}
                moves={puzzle.solution}
                color={color}
                theme={settings.boardTheme}
                title={t(
                  "Temukan langkah terbaik. Periksa skak, tangkapan, dan ancaman.",
                )}
                hint="Cari langkah yang memaksa balasan lawan."
                startTraining
                puzzleMode
                started={started}
                paused={paused}
                onStart={startOrResumePuzzle}
                enableShortcuts={settings.enableShortcuts}
                evalBar={
                  settings.showEvalBar ? (
                    <EvalBar
                      cp={evaluation?.cp}
                      mate={evaluation?.mate}
                      active={!!evaluation}
                      pending={!!evaluation && !validEvaluation}
                      flipped={color === "b"}
                    />
                  ) : null
                }
                onPositionChange={setPositionFen}
                onFeedbackChange={setMoveFeedback}
                onFindReply={getOpponentReply}
                onMistake={breakStreak}
                onSolve={(clean) => {
                  if (clean) growStreak();
                }}
                onComplete={complete}
                onAnalyze={(fen) =>
                  onAnalyze(fen, "Puzzle Lichess #" + puzzle.id)
                }
              />
            ) : (
              <div className="board-and-eval">
                <div className="board-main">
                  <div className="puzzle-loading" role="status">
                    {t(
                      busy
                        ? "Mengambil puzzle dari Lichess…"
                        : "Pilih tema untuk memulai puzzle.",
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </section>
        <div className="analysis-sidebar">
          <div className="analysis-sidebar-content analysis-panel puzzle-sidebar-surface">
            <aside className="puzzle-sidebar-body">
              <div className="panel-tabs">
                {t(
                  (
                    [
                      ["puzzle", "Puzzle"],
                      ["options", "Opsi"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      className={tab === value ? "active" : ""}
                      key={value}
                      onClick={() => setTab(value)}
                    >
                      {t(label)}
                    </button>
                  )),
                )}
                <DashboardPopover>
                  <DashboardPopoverTrigger asChild>
                    <button
                      className="icon-button puzzle-guide-trigger"
                      aria-label={t("Panduan puzzle")}
                      title={t("Panduan puzzle")}
                    >
                      <CircleHelp size={15} aria-hidden="true" />
                    </button>
                  </DashboardPopoverTrigger>
                  <DashboardPopoverContent
                    className="shortcut-help-popover analysis-guide-popover puzzle-guide-popover"
                    align="end"
                    side="bottom"
                    aria-label={t("Panduan puzzle")}
                  >
                    <Title as="strong">{t("Panduan puzzle")}</Title>
                    <div className="analysis-guide-copy">
                      <p>
                        <strong>{t("Tujuan latihan")}</strong>
                        {t(
                          "Mainkan semua langkah solusi untuk sisi yang ditandai melangkah. Balasan lawan akan bergerak otomatis.",
                        )}
                      </p>
                      <p>
                        <strong>{t("Premove")}</strong>
                        {t(
                          "Saat lawan membalas, antrekan hingga lima langkah. Langkah dijalankan saat giliranmu jika masih legal dan tetap dinilai sesuai solusi puzzle. Klik kanan atau tekan Esc untuk membatalkan antrean.",
                        )}
                      </p>
                      <p>
                        <strong>{t("Streak dan rekor")}</strong>
                        {t(
                          "Penyelesaian tanpa langkah salah menambah streak. Langkah salah atau melewati puzzle mereset streak; rekor terbaik tetap tersimpan.",
                        )}
                      </p>
                      <p>
                        <strong>{t("Lanjut otomatis dan lewati")}</strong>
                        {t(
                          "Auto next memuat puzzle berikutnya setelah solusi selesai. Matikan di Opsi jika ingin tetap di posisi akhir. Skip puzzle mencatat durasi lalu mengambil puzzle lain.",
                        )}
                      </p>
                      <p>
                        <strong>{t("Riwayat dan waktu")}</strong>
                        {t(
                          "Riwayat di sidebar mencatat puzzle selesai atau dilewati serta waktu sejak puzzle dimuat sampai tindakan tersebut.",
                        )}
                      </p>
                      <p>
                        <strong>{t("Rating dan bar evaluasi")}</strong>
                        {t(
                          "Rating adalah perkiraan tingkat puzzle dari Lichess, bukan rating pemain. Bar evaluasi memakai Stockfish lokal dan bisa dimatikan di Opsi.",
                        )}
                      </p>
                      <p>
                        <strong>{t("Koleksi puzzle")}</strong>
                        {t(
                          "Hingga lima puzzle disimpan sementara di perangkat. Puzzle yang dipakai akan diganti agar antrean terisi kembali.",
                        )}
                      </p>
                      {puzzle && (
                        <a href={puzzle.url} target="_blank" rel="noreferrer">
                          {t("Lihat puzzle ini di Lichess ↗")}
                        </a>
                      )}
                      <a
                        href="https://database.lichess.org/#puzzles"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("Sumber: database puzzle Lichess · CC0 ↗")}
                      </a>
                    </div>
                  </DashboardPopoverContent>
                </DashboardPopover>
              </div>
              {t(
                tab === "puzzle" && (
                  <>
                    <div className="puzzle-stats">
                      <div className="puzzle-stat">
                        <Flame size={17} />
                        <strong>{t(streak)}</strong>
                        <span>{t("streak berjalan")}</span>
                      </div>
                      <div
                        className={`puzzle-stat${record ? " is-record" : ""}`}
                      >
                        <Trophy size={17} />
                        <strong>{t(best)}</strong>
                        <span>{t("rekor")}</span>
                      </div>
                      <div
                        className="puzzle-stat"
                        role="timer"
                        aria-label={t("Waktu puzzle")}
                      >
                        <Clock3 size={17} />
                        <strong>
                          <time>{formatPuzzleClock(elapsedMs)}</time>
                        </strong>
                        <span>{t("waktu puzzle")}</span>
                      </div>
                    </div>
                    <div className="puzzle-history">
                      <div className="notation-heading">
                        <span>{t("Riwayat Puzzle")}</span>
                        <span>
                          {t(puzzleHistory.length)} {t("entri")}
                        </span>
                      </div>
                      <div className="move-list puzzle-history-list">
                        {puzzleHistory.length ? (
                          puzzleHistory.map((entry, index) => (
                            <div
                              className="puzzle-history-row"
                              key={`${entry.id}-${index}`}
                            >
                              <span className="move-number">
                                {entry.number ?? puzzleHistory.length - index}.
                              </span>
                              <span
                                className={`puzzle-history-result ${entry.outcome}${entry.clean === false ? " with-mistakes" : ""}`}
                                aria-label={t(
                                  entry.outcome === "solved"
                                    ? entry.clean === false
                                      ? "Selesai dengan kesalahan"
                                      : "Puzzle terselesaikan"
                                    : "Puzzle dilewati",
                                )}
                              >
                                {entry.outcome === "solved"
                                  ? entry.clean === false
                                    ? "×"
                                    : "✓"
                                  : "↷"}
                              </span>
                              <span className="puzzle-history-id">
                                {t("Puzzle #")}
                                {entry.id}
                                <small>{t(entry.rating)}</small>
                              </span>
                              <time>
                                {formatPuzzleDuration(entry.elapsedMs)}
                              </time>
                            </div>
                          ))
                        ) : (
                          <div className="puzzle-history-empty">
                            {t(
                              "Puzzle yang selesai atau dilewati akan muncul di sini.",
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {t(
                      error && (
                        <div className="error-message" role="alert">
                          {t(error)}
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => void load()}
                          >
                            {t("Coba lagi")}
                          </button>
                        </div>
                      ),
                    )}
                  </>
                ),
              )}
              {t(
                tab === "options" && (
                  <div className="puzzle-options">
                    <div className="puzzle-filter">
                      <label htmlFor="puzzle-theme">{t("Tema puzzle")}</label>
                      <select
                        id="puzzle-theme"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                      >
                        {t(
                          PUZZLE_THEMES.map(([id, label]) => (
                            <option key={id} value={id}>
                              {t(label)}
                            </option>
                          )),
                        )}
                      </select>
                    </div>
                    <div className="puzzle-filter">
                      <label htmlFor="puzzle-difficulty">
                        {t("Kesulitan")}
                      </label>
                      <select
                        id="puzzle-difficulty"
                        value={difficulty}
                        onChange={(e) =>
                          setDifficulty(e.target.value as PuzzleDifficulty)
                        }
                      >
                        {t(
                          PUZZLE_DIFFICULTIES.map(([id, label]) => (
                            <option key={id} value={id}>
                              {t(label)}
                            </option>
                          )),
                        )}
                      </select>
                    </div>
                    <div className="puzzle-filter">
                      <label className="board-sound-setting">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={settings.showEvalBar}
                          onChange={(e) =>
                            onSettingsChange({
                              ...settings,
                              showEvalBar: e.target.checked,
                            })
                          }
                        />
                        {t("Bar evaluasi")}
                      </label>
                    </div>
                    <div className="puzzle-filter">
                      <label className="board-sound-setting">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={autoNext}
                          onChange={(e) => {
                            setAutoNext(e.target.checked);
                            if (
                              !e.target.checked &&
                              autoNextTimer.current !== undefined
                            ) {
                              window.clearTimeout(autoNextTimer.current);
                              autoNextTimer.current = undefined;
                            }
                            writeStorage(
                              "kuda-puzzle-auto-next",
                              e.target.checked,
                            );
                          }}
                        />
                        {t("Lanjut otomatis")}
                      </label>
                    </div>
                  </div>
                ),
              )}
            </aside>
            <div className="puzzle-sidebar-footer">
              <div
                className={`coach-card puzzle-feedback ${moveFeedback.kind}`}
                role="status"
              >
                <div className="coach-label">
                  <span className="coach-avatar" aria-hidden="true">
                    {moveFeedback.kind === "wrong" ? (
                      <X size={17} />
                    ) : moveFeedback.kind === "correct" ||
                      moveFeedback.kind === "complete" ? (
                      <Check size={17} />
                    ) : (
                      <Lightbulb size={17} />
                    )}
                  </span>
                  <strong>
                    {t(
                      moveFeedback.kind === "wrong"
                        ? "Langkah puzzle kurang tepat"
                        : moveFeedback.kind === "correct"
                          ? "Langkah puzzle tepat"
                          : moveFeedback.kind === "complete"
                            ? "Puzzle terselesaikan"
                            : moveFeedback.kind === "hint"
                              ? "Petunjuk"
                              : "Catatan pelatih",
                    )}
                  </strong>
                  {moveFeedback.move && (
                    <span className="coach-move">{moveFeedback.move}</span>
                  )}
                </div>
                <p>
                  {moveFeedback.kind === "wrong" ? (
                    moveFeedback.reply ? (
                      <>
                        {t("Balasan terbaik lawan: ")}
                        <strong>{moveFeedback.reply}</strong>
                        {t(". Coba langkah lain dari posisi semula.")}
                      </>
                    ) : (
                      t(
                        moveFeedback.replyStatus === "terminal"
                          ? "Permainan berakhir setelah langkah ini. Coba langkah lain untuk menemukan solusi puzzle."
                          : moveFeedback.replyStatus === "unavailable"
                            ? "Balasan engine belum tersedia. Coba langkah lain dari posisi semula."
                            : "Langkah ini belum menyelesaikan puzzle. Sedang mencari balasan terbaik lawan…",
                      )
                    )
                  ) : (
                    t(
                      moveFeedback.kind === "correct"
                        ? "Langkah tepat. Lanjutkan solusi Anda."
                        : moveFeedback.kind === "complete"
                          ? "Semua langkah solusi telah ditemukan."
                          : moveFeedback.kind === "hint"
                            ? "Cari langkah yang memaksa balasan lawan."
                            : "Temukan langkah terbaik. Periksa skak, tangkapan, dan ancaman.",
                    )
                  )}
                </p>
              </div>
              <div className="puzzle-footer-actions">
                <button
                  className="button secondary"
                  disabled={!puzzle || busy}
                  onClick={retryPuzzle}
                >
                  <RotateCcw size={14} />
                  {t("Coba lagi")}
                </button>
                <button
                  className="button secondary"
                  disabled={!positionFen}
                  onClick={() =>
                    positionFen &&
                    onAnalyze(
                      positionFen,
                      "Puzzle Lichess #" + (puzzle?.id ?? ""),
                    )
                  }
                >
                  <Search size={14} />
                  {t("Analisis posisi")}
                </button>
              </div>
              <div className="puzzle-footer-actions puzzle-footer-session-actions">
                <button
                  className="button secondary"
                  disabled={!puzzle || busy || puzzleSolved || !started}
                  onClick={togglePuzzlePause}
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                  {t(paused ? "Lanjutkan" : "Jeda")}
                </button>
                <button
                  className="button primary"
                  disabled={!puzzle || busy}
                  onClick={requestNextPuzzle}
                >
                  <SkipForward size={15} />
                  {t(puzzleSolved ? "Puzzle berikutnya" : "Lewati puzzle")}
                </button>
              </div>
            </div>
          </div>
        </div>
        {settings.enableShortcuts && (
          <div className="board-under puzzle-board-under">
            <div
              className="board-shortcut-hints"
              role="group"
              aria-label={t("Pintasan puzzle")}
            >
              <NavigationShortcutHint />
              <span>
                <kbd>F</kbd> {t("Balik papan")}
              </span>
              <span>
                <kbd>H</kbd> {t("Petunjuk")}
              </span>
            </div>
          </div>
        )}
      </div>
      {showSkipWarning && (
        <Modal
          title={t("Lewati puzzle ini?")}
          onClose={() => setShowSkipWarning(false)}
        >
          <p className="modal-description">
            {t(
              "Melewati puzzle ini akan memutus streak Anda. Rekor terbaik tetap tersimpan.",
            )}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setShowSkipWarning(false)}
            >
              {t("Batal")}
            </button>
            <button
              className="button primary"
              disabled={!puzzle || busy}
              onClick={goToNextPuzzle}
            >
              <SkipForward size={15} />
              {t("Tetap lewati")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function LineTrainer({
  fen,
  moves,
  color,
  theme,
  title,
  hint,
  explanation,
  startTraining = false,
  puzzleMode = false,
  started = true,
  paused = false,
  onStart,
  enableShortcuts = false,
  evalBar,
  onPositionChange,
  onFeedbackChange,
  onFindReply,
  onMistake,
  onSolve,
  onComplete,
  onAnalyze,
}: {
  fen: string;
  moves: string[];
  color: "w" | "b";
  theme: Settings["boardTheme"];
  title: string;
  hint?: string;
  explanation?: string;
  startTraining?: boolean;
  puzzleMode?: boolean;
  started?: boolean;
  paused?: boolean;
  onStart?: () => void;
  enableShortcuts?: boolean;
  evalBar?: ReactNode;
  onPositionChange?: (fen: string) => void;
  onFeedbackChange?: (feedback: PuzzleMoveFeedback) => void;
  onFindReply?: (fen: string) => Promise<PuzzleReply | undefined>;
  onMistake?: () => void;
  onSolve?: (clean: boolean) => void;
  onComplete: (clean: boolean) => void;
  onAnalyze: (fen: string) => void;
}) {
  const { t } = useI18n();

  const [step, setStep] = useState(0);
  const [training, setTraining] = useState(startTraining);
  const [feedback, setFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [alternateFen, setAlternateFen] = useState<string>();
  const [flipped, setFlipped] = useState(false);
  const [premoves, setPremoves] = useState<Premove[]>([]);
  const [moveFeedback, setMoveFeedback] = useState<PuzzleMoveFeedback>({
    kind: "ready",
  });
  const [preview, setPreview] = useState<
    Pick<PuzzleReply, "fen" | "from" | "to"> & { mistakeSquare: string }
  >();
  const [solvedSquare, setSolvedSquare] = useState<string>();
  const previewRequest = useRef(0);
  const previewBusy = useRef(false);
  const rollbackTimer = useRef<number | undefined>(undefined);
  const counted = useRef(false);
  const mistaken = useRef(false);
  const chess = useMemo(() => {
    if (alternateFen) return new Chess(alternateFen);
    const c = new Chess(fen);
    moves.slice(0, step).forEach((m) => c.move(m));
    return c;
  }, [fen, moves, step, alternateFen]);
  const done = step === moves.length;
  const isOpponent =
    training &&
    !done &&
    chess.turn() !== color &&
    (!puzzleMode || (started && !paused));
  const last = chess.history({ verbose: true }).at(-1);
  const displayedFen = preview?.fen ?? chess.fen();
  useEffect(
    () => () => {
      previewRequest.current++;
      previewBusy.current = false;
      window.clearTimeout(rollbackTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!puzzleMode) return;
    onFeedbackChange?.(showHint && !done ? { kind: "hint" } : moveFeedback);
  }, [moveFeedback, showHint, done, puzzleMode, onFeedbackChange]);
  useEffect(() => {
    if (!puzzleMode || !enableShortcuts || !started || paused) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;

      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Escape") {
        setPremoves([]);
        return;
      }
      const canNavigate = !training || done;
      if (event.key === "ArrowLeft" && canNavigate) {
        event.preventDefault();
        const jumpToStart = event.shiftKey;
        setStep((current) => (jumpToStart ? 0 : Math.max(0, current - 1)));
      } else if (event.key === "ArrowRight" && canNavigate) {
        event.preventDefault();
        const jumpToEnd = event.shiftKey;
        setStep((current) =>
          jumpToEnd ? moves.length : Math.min(moves.length, current + 1),
        );
      } else if (!event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFlipped((current) => !current);
      } else if (!event.shiftKey && event.key.toLowerCase() === "h" && !done) {
        event.preventDefault();
        setShowHint((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    done,
    enableShortcuts,
    moves.length,
    paused,
    puzzleMode,
    started,
    training,
  ]);
  useEffect(() => {
    onPositionChange?.(displayedFen);
  }, [displayedFen, onPositionChange]);
  useEffect(() => {
    if (isOpponent) {
      const timer = setTimeout(() => setStep((s) => s + 1), 550);
      return () => clearTimeout(timer);
    }
  }, [isOpponent, step]);
  useEffect(() => {
    if (done && training && !revealed && !counted.current) {
      counted.current = true;
      setMoveFeedback((value) => ({ ...value, kind: "complete" }));
      onComplete(!mistaken.current);
      onSolve?.(!mistaken.current);
    }
  }, [done, training, revealed, onComplete, onSolve]);
  const reset = (train: boolean) => {
    previewRequest.current++;
    previewBusy.current = false;
    window.clearTimeout(rollbackTimer.current);
    setPreview(undefined);
    setSolvedSquare(undefined);
    setMoveFeedback({ kind: "ready" });
    setTraining(train);
    setStep(0);
    setFeedback("");
    setShowHint(false);
    setRevealed(false);
    setAlternateFen(undefined);
    setPremoves([]);
    counted.current = false;
    mistaken.current = false;
  };
  const demonstrateMistake = (
    position: Chess,
    move: { from: string; to: string; san: string },
  ) => {
    const id = ++previewRequest.current;
    previewBusy.current = true;
    setPremoves([]);
    setShowHint(false);
    setPreview({
      fen: position.fen(),
      from: move.from,
      to: move.to,
      mistakeSquare: move.to,
    });
    setMoveFeedback({
      kind: "wrong",
      move: move.san,
      replyStatus: "searching",
    });
    void (async () => {
      try {
        const reply = position.isGameOver()
          ? undefined
          : await onFindReply?.(position.fen());
        if (id !== previewRequest.current) return;
        if (reply) setPreview({ ...reply, mistakeSquare: move.to });
        setMoveFeedback({
          kind: "wrong",
          move: move.san,
          reply: reply?.san,
          replyStatus: reply
            ? "shown"
            : position.isGameOver()
              ? "terminal"
              : "unavailable",
        });
      } catch {
        if (id !== previewRequest.current) return;
        setMoveFeedback({
          kind: "wrong",
          move: move.san,
          replyStatus: "unavailable",
        });
      }
      if (id !== previewRequest.current) return;
      rollbackTimer.current = window.setTimeout(() => {
        if (id !== previewRequest.current) return;
        setPreview(undefined);
        previewBusy.current = false;
        rollbackTimer.current = undefined;
      }, 1000);
    })();
  };
  const attempt = (from: string, to: string, promotion = "q") => {
    if (previewBusy.current) return "illegal";
    try {
      const copy = new Chess(chess.fen());
      const m = copy.move({ from, to, promotion });
      if (m.san === moves[step]) {
        setStep((s) => s + 1);
        if (puzzleMode && step + 1 === moves.length) setSolvedSquare(m.to);
        setShowHint(false);
        setMoveFeedback({
          kind: step + 1 === moves.length ? "complete" : "correct",
          move: m.san,
        });
        setFeedback(puzzleMode ? "" : "Tepat. Lanjutkan idemu!");
        return "correct";
      }
      // Accept any immediate checkmate when a single-move mate is the exercise objective.
      if (
        step === moves.length - 1 &&
        moves[step].endsWith("#") &&
        copy.isCheckmate()
      ) {
        setAlternateFen(copy.fen());
        setStep(moves.length);
        if (puzzleMode) setSolvedSquare(m.to);
        setShowHint(false);
        setMoveFeedback({ kind: "complete", move: m.san });
        setFeedback(puzzleMode ? "" : `Tepat! ${m.san} juga memberi skakmat.`);
        return "correct";
      }
      setFeedback(
        "Langkah legal, tetapi belum sesuai ide latihan. Periksa petunjuk dan coba lagi.",
      );
      mistaken.current = true;
      playBoardSound("error");
      onMistake?.();
      if (puzzleMode) demonstrateMistake(copy, m);
      return "wrong";
    } catch {
      return "illegal";
    }
  };
  useEffect(() => {
    if (!premoves.length) return;
    if (!puzzleMode || !training || done || preview) {
      setPremoves([]);
      return;
    }
    if (!started || paused || isOpponent) return;
    const timer = window.setTimeout(() => {
      const [move, ...remaining] = premoves;
      const position = new Chess(chess.fen());
      if (!executePremove(position, move, color)) {
        setPremoves([]);
        return;
      }
      const accepted =
        attempt(move.from, move.to, move.promotion) === "correct";
      setPremoves(accepted ? remaining : []);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [
    chess,
    color,
    done,
    isOpponent,
    paused,
    premoves,
    puzzleMode,
    started,
    training,
    preview,
  ]);
  const queuePremove = (from: string, to: string, promotion = "q") => {
    if (previewBusy.current) return false;
    if (!isOpponent && !premoves.length) return false;
    const next = appendPremove(
      chess.fen(),
      premoves,
      color,
      from,
      to,
      promotion,
    );
    if (!next) return false;
    setPremoves(next);
    return true;
  };
  const board = (
    <Board
      fen={displayedFen}
      flipped={puzzleMode ? flipped !== (color === "b") : color === "b"}
      theme={theme}
      lastMove={preview ?? last}
      moveBadge={
        preview
          ? {
              square: preview.mistakeSquare,
              symbol: "×",
              label: t("Langkah puzzle kurang tepat"),
              color: "#cc6464",
            }
          : solvedSquare
            ? {
                square: solvedSquare,
                symbol: "✓",
                label: t("Langkah puzzle benar"),
                color: "#4b9b68",
              }
            : undefined
      }
      onMove={
        training
          ? (from, to, promotion) => {
              const outcome = attempt(from, to, promotion);
              return (
                outcome === "correct" || (puzzleMode && outcome === "wrong")
              );
            }
          : undefined
      }
      disabled={
        !training ||
        (!puzzleMode && isOpponent) ||
        done ||
        !!preview ||
        (puzzleMode && (!started || paused))
      }
      premove={
        puzzleMode && training && !done && !preview
          ? {
              color,
              moves: premoves,
              onQueue: queuePremove,
              onCancel: () => setPremoves([]),
            }
          : undefined
      }
    />
  );
  const instructionBar = (
    <div className="trainer-instruction">
      <span className="status-dot" />
      {t(
        done
          ? revealed
            ? "Jawaban ditampilkan"
            : "Jalur selesai!"
          : isOpponent
            ? "Lawan membalas…"
            : training
              ? `${color === "w" ? "Putih" : "Hitam"} melangkah`
              : "Jelajahi urutan langkah",
      )}
      <span>
        {t(step)}
        {t("/")}
        {t(moves.length)}
      </span>
    </div>
  );
  const feedbackBar = (
    <div
      className={`exercise-feedback ${done && !revealed ? "success" : ""}`}
      aria-live="polite"
    >
      {t(
        done ? (
          <>
            <CheckCheck size={18} />
            <span>
              {t(
                explanation ||
                  "Kamu sudah mempelajari jalur ini. Ulangi beberapa kali sampai memahami idenya.",
              )}
            </span>
          </>
        ) : (
          feedback || title
        ),
      )}
    </div>
  );
  return (
    <div className="line-trainer">
      {t(
        !puzzleMode && (
          <div className="trainer-mode">
            <button
              className={!training ? "active" : ""}
              onClick={() => reset(false)}
            >
              <BookOpen size={14} />
              {t(" Pelajari")}
            </button>
            <button
              className={training ? "active" : ""}
              onClick={() => reset(true)}
            >
              <Target size={14} />
              {t(" Latihan")}
            </button>
          </div>
        ),
      )}
      {t(
        puzzleMode ? (
          <>
            <div className="board-and-eval">
              {evalBar}
              <div
                className={`board-main puzzle-board-stage${!started || paused ? " is-blurred" : ""}`}
              >
                {board}
                {(!started || paused) && (
                  <button
                    className="puzzle-board-overlay"
                    type="button"
                    onClick={onStart}
                    aria-label={
                      !started
                        ? t("Klik papan untuk memulai puzzle.")
                        : t("Puzzle dijeda. Klik papan untuk melanjutkan.")
                    }
                  >
                    <span>
                      {!started
                        ? t("Klik papan untuk memulai")
                        : t("Dijeda · klik untuk melanjutkan")}
                    </span>
                  </button>
                )}
              </div>
            </div>
            <NavigationControls
              ply={step}
              total={moves.length}
              showPosition={false}
              navigationDisabled={(training && !done) || !started || paused}
              onChange={setStep}
              onFlip={() => setFlipped((f) => !f)}
              enableShortcuts={
                enableShortcuts && (!training || done) && started && !paused
              }
              actions={
                <IconButton
                  label={t("Petunjuk")}
                  active={showHint}
                  disabled={done || !!preview || !started || paused}
                  onClick={() => setShowHint((v) => !v)}
                >
                  <Lightbulb size={16} />
                </IconButton>
              }
            />
          </>
        ) : (
          <>
            {instructionBar}
            {board}
            {t(
              !training && (
                <NavigationControls
                  ply={step}
                  total={moves.length}
                  onChange={setStep}
                />
              ),
            )}
            {feedbackBar}
          </>
        ),
      )}
      {t(
        !done && training && !puzzleMode && (
          <div className="trainer-actions">
            <button
              className="text-button"
              onClick={() => setShowHint((v) => !v)}
            >
              <Lightbulb size={15} />
              {t(" Petunjuk")}
            </button>
            <button
              className="text-button"
              onClick={() => {
                setRevealed(true);
                setTraining(false);
                setStep(moves.length);
                if (!mistaken.current) {
                  mistaken.current = true;
                  onMistake?.();
                }
              }}
            >
              {t("Lihat jawaban")}
            </button>
          </div>
        ),
      )}
      {t(
        showHint && !done && !puzzleMode && (
          <div className="hint-box">
            {t(
              hint ||
                `Langkah berikutnya: ${moves[step]}. Ingat ide perkembangan dan kontrol pusat.`,
            )}
          </div>
        ),
      )}
      {t(
        done && !puzzleMode && (
          <div className="trainer-actions">
            <button className="button secondary" onClick={() => reset(true)}>
              <RotateCcw size={14} />
              {t(" Ulangi latihan")}
            </button>
            <button
              className="text-button"
              onClick={() => onAnalyze(chess.fen())}
            >
              {t("Analisis posisi ")}
              <ArrowRight size={14} />
            </button>
          </div>
        ),
      )}
    </div>
  );
}
