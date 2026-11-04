import { NotationMove, NotationText } from "../components/Notation";
import { useDesktopBoardSize } from "../hooks/useDesktopBoardSize";
import { openingLines } from "../lib/opening-training";
import type { OpeningProgress } from "../lib/opening-training";
import Title from "../components/Title";
// i18n: rendered text
import { useI18n } from "@/lib/i18n";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
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
  Star,
  Target,
  Trophy,
  X,
} from "lucide-react";
import Board from "../components/Board";
import {
  IconButton,
  Modal,
  NavigationControls,
  NavigationShortcutHint,
} from "../components/Common";
import { LESSONS, OPENINGS } from "../data/content";
import { ACADEMY_MODULES } from "../data/academy";
import type { Exercise } from "../data/content";
import { readStorage, writeStorage } from "../lib/chess";
import { playBoardSound } from "../lib/board-sound";
import { LocalEngine } from "../lib/engine";
import { findPuzzleReply } from "../lib/puzzle-reply";
import type { PuzzleReply } from "../lib/puzzle-reply";
import { appendPremove, executePremove } from "../lib/premove";
import type { Premove } from "../lib/premove";
import {
  cachedPuzzles,
  consumePuzzle,
  ensurePuzzles,
  puzzleById,
} from "../lib/lichess-puzzles";
import type { LichessPuzzle, PuzzleDifficulty } from "../lib/lichess-puzzles";
import {
  appendPuzzleHistory,
  normalizePuzzleHistory,
} from "../lib/puzzle-history";
import type { PuzzleHistoryEntry } from "../lib/puzzle-history";
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

function CatalogToolbar({ children, search, onSearch, placeholder, label, className = "" }: {
  children: ReactNode;
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => { if (expanded) input.current?.focus(); }, [expanded]);
  function closeSearch() { setExpanded(false); trigger.current?.focus(); }
  return <div className={`catalog-toolbar catalog-search-toolbar ${className}${expanded ? " is-search-expanded" : ""}`}>
    {children}
    <div className="catalog-search-actions">
      <button type="button" ref={trigger} className="button secondary catalog-search-toggle" aria-label={label} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(true)}><Search size={16} /></button>
      <div className="search-input"><Search size={16} /><input id={id} ref={input} value={search} onChange={event => onSearch(event.target.value)} placeholder={placeholder} aria-label={label} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeSearch(); } }} /><button type="button" className="icon-button catalog-search-close" aria-label={t("Tutup")} onClick={closeSearch}><X size={16} /></button></div>
    </div>
  </div>;
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
  const [favorites, setFavorites] = useState<string[]>(() => readStorage("kuda-opening-favorites", []));
  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(next);
    writeStorage("kuda-opening-favorites", next);
  }
  const openings = OPENINGS.filter(
    (o) =>
      (filter === "all" || o.side === filter) &&
      `${o.name} ${o.eco} ${o.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  ).sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  return (
    <div className="page learning-page">
      <CatalogToolbar search={search} onSearch={setSearch} placeholder={t("Cari opening atau kode ECO…")} label={t("Cari opening")}>
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
                <Title>{t(label)}</Title>
              </button>
            )),
          )}
        </div>
      </CatalogToolbar>
      <div className="opening-grid">
        {t(
          openings.map((o) => {
            const lines = openingLines(o);
            const progress = readStorage<OpeningProgress>(`kuda-opening-progress-${o.id}`, {});
            const learned = lines.filter(line => progress[line.id]?.learned).length;
            const practiced = lines.filter(line => {
              const result = progress[line.id]?.completed?.practice;
              return result?.mistakes === 0 && result.hints === 0;
            }).length;
            const c = new Chess();
            o.moves.slice(0, 6).forEach((m) => c.move(m));
            return (
              <article
                className="opening-card"
                key={o.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenOpening(o.id);
                  }
                }}
                onClick={() => onOpenOpening(o.id)}
              >
                <div className="opening-card-art">
                  <div className="opening-mini-board" inert>
                    <Board
                      fen={c.fen()}
                      flipped={o.side === "b"}
                      compact
                      theme={settings.boardTheme}
                      disabled
                    />
                  </div>
                </div>
                <div className="opening-card-content">
                  <div className="opening-card-meta">
                    <span className="opening-card-labels"><span className="eco-label">{t(o.eco)}</span><span>{t(o.side === "w" ? "Putih" : "Hitam")}</span></span>
                    <span className="opening-card-meta-actions">
                      <span>{t(o.level)}</span>
                      <button type="button" className={`icon-button opening-favorite${favorites.includes(o.id) ? " is-favorite" : ""}`} aria-label={t(favorites.includes(o.id) ? "Hapus dari favorit" : "Tambah ke favorit")} aria-pressed={favorites.includes(o.id)} onClick={event => { event.stopPropagation(); toggleFavorite(o.id); }}>
                        <Star size={16} fill={favorites.includes(o.id) ? "currentColor" : "none"} />
                      </button>
                    </span>
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
                          <NotationMove san={m} color={j % 2 ? "b" : "w"} />
                        </span>
                      )),
                    )}
                  </div>
                  <div className="opening-card-progress">
                    <div className="opening-card-progress-counts">
                      <span>Learn: {learned}/{lines.length}</span>
                      <span>Practice: {practiced}/{lines.length}</span>
                    </div>
                    <div className="opening-card-progress-track" role="img" aria-label={`Learn: ${learned}/${lines.length}, Practice: ${practiced}/${lines.length}`}>
                      <span className="opening-card-practiced" style={{ width: `${practiced / lines.length * 100}%` }} />
                      <span className="opening-card-learned" style={{ width: `${Math.max(0, learned - practiced) / lines.length * 100}%` }} />
                    </div>
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
export function AcademyPage({
  settings,
  onOpenLesson,
}: {
  settings: Settings;
  onOpenLesson: (id: string) => void;
}) {
  const { t } = useI18n();

  const [completed] = useState<string[]>(() =>
    readStorage("kuda-lessons", []),
  );
  const [search, setSearch] = useState("");
  const [lessonStatus, setLessonStatus] = useState("all");
  const visibleLessons = LESSONS.filter(
    (lesson) =>
      (lessonStatus === "all" ||
        (lessonStatus === "completed") === completed.includes(lesson.id)) &&
      `${t(lesson.title)} ${t(lesson.description)} ${t(lesson.category)}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const openLesson = (lesson: Exercise) => {
    onOpenLesson(lesson.id);
  };
  return (
    <div className="page learning-page">
      <CatalogToolbar className="academy-toolbar" search={search} onSearch={setSearch} placeholder={t("Cari topik atau pelajaran…")} label={t("Cari pelajaran")}>
        <div className="segmented academy-status-filter" role="group" aria-label={t("Status pelajaran")}>
          {[["all", "Semua status"], ["new", "Belum selesai"], ["completed", "Selesai"]].map(([id, label]) => <button key={id} type="button" className={lessonStatus === id ? "active" : ""} aria-pressed={lessonStatus === id} onClick={() => setLessonStatus(id)}>{t(label)}</button>)}
        </div>
      </CatalogToolbar>
      <div className="lesson-grid">
        {t(
          visibleLessons.map((l) => (
            <button
              key={l.id}
              className="lesson-card"
              onClick={() => openLesson(l)}
            >
              <div className="lesson-top">
                <span className="small-label">{t(l.category)}</span>
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
              <Title as="h3">{t(l.title)}</Title>
              <p>{t(l.description)}</p>
            </button>
          )),
        )}
      </div>
      {!visibleLessons.length && (
        <p className="academy-empty">
          {t("Tidak ada pelajaran yang cocok. Coba ubah filter pencarian.")}
        </p>
      )}
    </div>
  );
}

export function AcademyStudy({
  lesson,
  settings,
  onBack,
  onOpenLesson,
  onAnalyze,
}: {
  lesson: Exercise;
  settings: Settings;
  onBack: () => void;
  onOpenLesson: (id: string) => void;
  onAnalyze: (fen: string, name: string) => void;
}) {
  const { t } = useI18n();
  const pageRef = useDesktopBoardSize();
  const [tab, setTab] = useState("lesson");
  const [completedLessons, setCompletedLessons] = useState<string[]>(() =>
    readStorage("kuda-lessons", []),
  );
  const nextLesson =
    LESSONS[LESSONS.findIndex((item) => item.id === lesson.id) + 1];
  return (
    <div
      ref={pageRef}
      className="page analysis-page academy-study-page viewport-board-layout"
    >
      <div className="workspace-toolbar board-page-header">
        <div className="game-title-block">
          <Title as="strong">{t(lesson.title)}</Title>
          <span className="opening-repertoire">
            {t(lesson.category)}
          </span>
        </div>
        <div className="workspace-actions study-page-actions">
          <button
            className="icon-button back-icon"
            onClick={onBack}
            aria-label={t("Kembali ke akademi")}
            title={t("Kembali ke akademi")}
          >
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>
      <LineTrainer
        key={lesson.id}
        fen={lesson.fen}
        moves={lesson.solution}
        color={lesson.fen.split(" ")[1] as "w" | "b"}
        theme={settings.boardTheme}
        title={t(lesson.description)}
        hint={lesson.hint}
        explanation={lesson.explanation}
        startTraining
        enableShortcuts={settings.enableShortcuts}
        onComplete={() => {
          const completed = readStorage<string[]>("kuda-lessons", []);
          const next = [...new Set([...completed, lesson.id])];
          writeStorage("kuda-lessons", next);
          setCompletedLessons(next);
          playBoardSound("success");
        }}
        onAnalyze={(fen) => onAnalyze(fen, lesson.title)}
        workspace={({ board, content, actions, complete }) => (
          <div className="analysis-grid academy-study-grid">
            <section className="board-section">{board}</section>
            <div className="analysis-sidebar academy-study-sidebar">
              <aside className="analysis-panel academy-study-panel">
                <div
                  className="panel-tabs"
                  role="tablist"
                  aria-label={t("Materi pelajaran")}
                >
                  <button
                    id="academy-lesson-tab"
                    role="tab"
                    aria-controls="academy-lesson-panel"
                    aria-selected={tab === "lesson"}
                    className={tab === "lesson" ? "active" : ""}
                    onClick={() => setTab("lesson")}
                  >
                    {t("Pelajaran")}
                  </button>
                  <button
                    id="academy-menu-tab"
                    role="tab"
                    aria-controls="academy-menu-panel"
                    aria-selected={tab === "menu"}
                    className={tab === "menu" ? "active" : ""}
                    onClick={() => setTab("menu")}
                  >
                    {t("Menu")}
                  </button>
                </div>
                <div
                  className="academy-study-content"
                  role="tabpanel"
                  id={`academy-${tab}-panel`}
                  aria-labelledby={`academy-${tab}-tab`}
                >
                  {tab === "lesson" ? (
                    <>
                      <div className="study-theory">
                        <Title as="h3">{t(lesson.title)}</Title>
                        <p className="academy-lesson-intro">
                          {t(lesson.description)}
                        </p>
                        <Title as="h3">{t("Ide yang perlu dibawa.")}</Title>
                        <ol>
                          {lesson.theory.map((idea, index) => (
                            <li key={index}>
                              <span>{String(index + 1).padStart(2, "0")}</span>
                              {t(idea)}
                            </li>
                          ))}
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
                      {content}
                    </>
                  ) : (
                    <div className="academy-lesson-menu">
                      {ACADEMY_MODULES.map((module) => (
                        <section key={module.category}>
                          <Title as="h3">{t(module.title)}</Title>
                          {LESSONS.filter(
                            (item) => item.category === module.category,
                          ).map((item) => (
                            <button
                              key={item.id}
                              className={`academy-menu-lesson${item.id === lesson.id ? " active" : ""}`}
                              aria-current={
                                item.id === lesson.id ? "page" : undefined
                              }
                              onClick={() => onOpenLesson(item.id)}
                            >
                              <span className="academy-menu-number">
                                {String(LESSONS.indexOf(item) + 1).padStart(
                                  2,
                                  "0",
                                )}
                              </span>
                              <span>{t(item.title)}</span>
                              {completedLessons.includes(item.id) ? (
                                <Check size={15} />
                              ) : (
                                <ArrowRight size={15} />
                              )}
                            </button>
                          ))}
                        </section>
                      ))}
                    </div>
                  )}
                </div>
                <div className="academy-study-footer">
                  <div className="academy-study-actions">{actions}</div>
                  <button
                    className="button primary"
                    disabled={!complete}
                    onClick={() =>
                      nextLesson ? onOpenLesson(nextLesson.id) : onBack()
                    }
                  >
                    {t(
                      nextLesson
                        ? "Pelajaran berikutnya"
                        : "Kembali ke akademi",
                    )}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </aside>
            </div>
            {settings.enableShortcuts && (
              <div className="board-under academy-study-shortcuts">
                <NavigationShortcutHint />
                <span>
                  <kbd>F</kbd> {t("Balik papan")}
                </span>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}

export function PuzzlesPage({
  settings,
  onAnalyze,
}: {
  settings: Settings;
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
    normalizePuzzleHistory(readStorage("kuda-puzzle-history", [])),
  );
  const [historyEntry, setHistoryEntry] = useState<PuzzleHistoryEntry>();
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const historyRequest = useRef<AbortController | undefined>(undefined);
  const puzzleHistoryRef = useRef(puzzleHistory);
  const [streak, setStreak] = useState(() =>
    readStorage("kuda-puzzle-streak", 0),
  );
  const [started, setStarted] = useState(true);
  const [paused, setPaused] = useState(false);
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
  const [positionFen, setPositionFen] = useState("");
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
    const entry: PuzzleHistoryEntry = {
      id: puzzle.id,
      clean,
      rating: puzzle.rating,
      elapsedMs: Math.max(0, elapsedRef.current),
      outcome,
      puzzle,
    };
    setElapsedMs(entry.elapsedMs);
    const next = appendPuzzleHistory(puzzleHistoryRef.current, entry);
    puzzleHistoryRef.current = next;
    setPuzzleHistory(next);
    writeStorage("kuda-puzzle-history", next);
  };
  const openHistory = async (entry: PuzzleHistoryEntry) => {
    historyRequest.current?.abort();
    if (autoNextTimer.current !== undefined) {
      window.clearTimeout(autoNextTimer.current);
      autoNextTimer.current = undefined;
    }
    setShowSkipWarning(false);
    setError("");
    setHistoryEntry(entry);
    setHistoryAttempt(0);
    if (entry.puzzle) return;
    const controller = new AbortController();
    historyRequest.current = controller;
    try {
      const snapshot = await puzzleById(entry.id, controller.signal);
      if (controller.signal.aborted) return;
      const next = puzzleHistoryRef.current.map((item) =>
        item.id === entry.id ? { ...item, puzzle: snapshot } : item,
      );
      puzzleHistoryRef.current = next;
      setPuzzleHistory(next);
      writeStorage("kuda-puzzle-history", next);
      setHistoryEntry({ ...entry, puzzle: snapshot });
    } catch (error) {
      if (!controller.signal.aborted) setError((error as Error).message);
    }
  };
  const returnToActivePuzzle = () => {
    historyRequest.current?.abort();
    setHistoryEntry(undefined);
    setError("");
  };
  const load = async (next = false) => {
    historyRequest.current?.abort();
    setHistoryEntry(undefined);
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
      const shouldStart = true;
      const shouldPause = firstPuzzleLoad.current ? false : pausedRef.current;
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
    if (!puzzle || !started || paused || puzzleSolved || busy || historyEntry)
      return;
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
  }, [puzzle, started, paused, attempt, puzzleSolved, busy, historyEntry]);
  useEffect(
    () => () => {
      historyRequest.current?.abort();
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
    if (autoNext && !historyEntry) {
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
    if (historyEntry) {
      setHistoryAttempt((value) => value + 1);
      return;
    }
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
  const pageRef = useDesktopBoardSize(`${puzzle?.id}:${attempt}:${historyEntry?.number}:${historyAttempt}`);
  const viewedPuzzle = historyEntry ? historyEntry.puzzle : puzzle;
  const color = (viewedPuzzle?.fen.split(" ")[1] as "w" | "b") ?? "w";
  const activeColor = (puzzle?.fen.split(" ")[1] as "w" | "b") ?? "w";
  const activeTheme = PUZZLE_THEMES.find(([id]) => id === theme)?.[1];
  const activeDifficulty = PUZZLE_DIFFICULTIES.find(([id]) => id === difficulty)?.[1];
  return (
    <div ref={pageRef} className="page analysis-page puzzle-page viewport-board-layout">
      <div className="workspace-toolbar board-page-header">
        <div className="game-title-block">
          <Title as="strong">{t(historyEntry ? "Puzzle Lichess #" + historyEntry.id : puzzle ? "Puzzle Lichess #" + puzzle.id : "Puzzle Lichess")}</Title>
          <div className="game-players">
            {viewedPuzzle && <span className="game-player"><strong>{t(color === "w" ? "Putih" : "Hitam")}</strong><span>{t("melangkah")}{t(" · ")}{t("Rating ")}{t(viewedPuzzle.rating)}</span></span>}
            <span className="game-player"><strong>{t(activeTheme ?? "Campuran")}</strong><span>{t(activeDifficulty ?? "Normal")}</span></span>
          </div>
        </div>
      </div>
      <div className="analysis-grid">
        <section className="board-section">
          {historyEntry &&
            (historyEntry.puzzle ? (
              <LineTrainer
                key={`history:${historyEntry.number}:${historyEntry.id}:${historyAttempt}`}
                fen={historyEntry.puzzle.fen}
                moves={historyEntry.puzzle.solution}
                color={color}
                theme={settings.boardTheme}
                title={t("Mainkan ulang puzzle")}
                startTraining
                puzzleMode
                enableShortcuts={settings.enableShortcuts}
                onPositionChange={setPositionFen}
                onFindReply={getOpponentReply}
                onComplete={() => playBoardSound("success")}
                onAnalyze={(fen) =>
                  onAnalyze(fen, "Puzzle Lichess #" + historyEntry.id)
                }
              />
            ) : (
              <div className="board-main puzzle-loading" role="status">
                {t(error || "Mengambil puzzle dari Lichess…")}
              </div>
            ))}
          <div hidden={!!historyEntry}>
            {t(
              puzzle ? (
                <LineTrainer
                  key={`${puzzle.id}:${attempt}`}
                  fen={puzzle.fen}
                  moves={puzzle.solution}
                  color={activeColor}
                  theme={settings.boardTheme}
                  title={t(
                    "Temukan langkah terbaik. Periksa skak, tangkapan, dan ancaman.",
                  )}
                  hint="Cari langkah yang memaksa balasan lawan."
                  startTraining
                  puzzleMode
                  started={started}
                  paused={paused || !!historyEntry}
                  onStart={startOrResumePuzzle}
                  enableShortcuts={settings.enableShortcuts && !historyEntry}
                    onPositionChange={historyEntry ? undefined : setPositionFen}
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
          </div>
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
                          <time>
                            {formatPuzzleClock(
                              historyEntry?.elapsedMs ?? elapsedMs,
                            )}
                          </time>
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
                              <a
                                className="puzzle-history-id puzzle-history-link"
                                href="#puzzles"
                                aria-current={
                                  historyEntry?.number === entry.number
                                    ? "true"
                                    : undefined
                                }
                                onClick={(event) => {
                                  event.preventDefault();
                                  void openHistory(entry);
                                }}
                              >
                                {t("Puzzle #")}
                                {entry.id}
                                <small>{t(entry.rating)}</small>
                              </a>
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
                            onClick={() =>
                              historyEntry
                                ? void openHistory(historyEntry)
                                : void load()
                            }
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
              <div className="puzzle-footer-actions">
                <button
                  className="button secondary"
                  disabled={historyEntry ? !historyEntry.puzzle : !puzzle || busy}
                  onClick={retryPuzzle}
                >
                  <RotateCcw size={14} />
                  {t("Coba lagi")}
                </button>
                <button
                  className="button secondary"
                  disabled={!positionFen || (!!historyEntry && !historyEntry.puzzle)}
                  onClick={() =>
                    positionFen &&
                    onAnalyze(
                      positionFen,
                      "Puzzle Lichess #" +
                        (historyEntry?.id ?? puzzle?.id ?? ""),
                    )
                  }
                >
                  <Search size={14} />
                  {t("Analisis posisi")}
                </button>
              </div>
              <div
                className={`puzzle-footer-actions puzzle-footer-session-actions${historyEntry ? " is-history" : ""}`}
              >
                {historyEntry ? (
                  <button
                    className="button primary"
                    onClick={returnToActivePuzzle}
                  >
                    <ArrowRight size={15} />
                    {t("Kembali ke puzzle aktif")}
                  </button>
                ) : (
                  <>
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
                  </>
                )}
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
  workspace,
}: {
  workspace?: (parts: {
    board: ReactNode;
    content: ReactNode;
    actions: ReactNode;
    complete: boolean;
  }) => ReactNode;
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
  const [browsePly, setBrowsePly] = useState<number>();
  const browsing = !!workspace && browsePly !== undefined && browsePly !== step;
  const visibleStep = browsing ? browsePly! : step;
  const navigateLesson = (ply: number) =>
    setBrowsePly(ply === step ? undefined : Math.max(0, Math.min(step, ply)));
  const [training, setTraining] = useState(startTraining);
  const [feedback, setFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showHintWarning, setShowHintWarning] = useState(false);
  const hintUsed = useRef(false);
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
    if (alternateFen && !browsing) return new Chess(alternateFen);
    const c = new Chess(fen);
    moves.slice(0, visibleStep).forEach((m) => c.move(m));
    return c;
  }, [fen, moves, visibleStep, alternateFen, browsing]);
  const done = step === moves.length;
  const isOpponent =
    !browsing &&
    training &&
    !done &&
    chess.turn() !== color &&
    (!puzzleMode || (started && !paused));
  const last = chess.history({ verbose: true }).at(-1);
  const displayedFen = preview?.fen ?? chess.fen();
  const revealHint = () => {
    if (done || preview || !started || paused || isOpponent) return;
    if (puzzleMode && !hintUsed.current) {
      hintUsed.current = true;
      mistaken.current = true;
      onMistake?.();
    }
    setShowHintWarning(false);
    setShowHint(true);
  };
  const requestHint = () => {
    if (done || preview || !started || paused || isOpponent) return;
    if (showHint) { setShowHint(false); return; }
    if (puzzleMode && onMistake && !hintUsed.current) { setShowHintWarning(true); return; }
    revealHint();
  };
  useEffect(() => { if (paused || !started || done) setShowHintWarning(false); }, [paused, started, done]);
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
    if ((!puzzleMode && !workspace) || !enableShortcuts || !started || paused || showHintWarning)
      return;
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
      if (workspace && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        navigateLesson(
          event.key === "ArrowLeft"
            ? event.shiftKey
              ? 0
              : visibleStep - 1
            : event.shiftKey
              ? step
              : visibleStep + 1,
        );
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
        requestHint();
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
    browsing,
    visibleStep,
    step,
    !!workspace,
    showHintWarning,
    showHint,
    onMistake,
    isOpponent,
    preview,
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
    setShowHintWarning(false);
    hintUsed.current = false;
    setBrowsePly(undefined);
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
  let guidedMove: ReturnType<Chess["move"]> | undefined;
  if ((workspace || (puzzleMode && showHint)) && moves[visibleStep]) {
    try {
      guidedMove = new Chess(chess.fen()).move(moves[visibleStep]);
    } catch {
      /* End of a lesson or an alternate mate. */
    }
  }
  const board = (
    <Board
      fen={displayedFen}
      flipped={
        puzzleMode || workspace ? flipped !== (color === "b") : color === "b"
      }
      arrow={
        (workspace || (puzzleMode && showHint && started && !paused)) && guidedMove && !done && !browsing && !isOpponent && !preview
          ? `${guidedMove.from}${guidedMove.to}`
          : undefined
      }
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
        browsing ||
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
  if (workspace)
    return workspace({
      board: (
        <>
          <div className="board-and-eval">
            {evalBar}
            <div className="board-main">{board}</div>
          </div>
          <NavigationControls
            ply={visibleStep}
            total={moves.length}
            navigationLimit={step}
            outsideNotation={browsing}
            onReturnToMain={() => setBrowsePly(undefined)}
            onChange={navigateLesson}
            onFlip={() => setFlipped((value) => !value)}
            enableShortcuts={false}
          />
        </>
      ),
      content: (
        <>
          <div
            className={`academy-step-coach${feedback && !done ? " has-feedback" : ""}`}
            aria-live="polite"
          >
            <span className="small-label">
              {t(
                browsing
                  ? "Posisi pilihan"
                  : done
                    ? "Pelajaran selesai"
                    : isOpponent
                      ? "Lawan melangkah"
                      : "Langkah berikutnya",
              )}
            </span>
            {guidedMove && !done && (
              <Title as="h3">
                {Math.ceil((visibleStep + 1) / 2)}
                {guidedMove.color === "w" ? ". " : "… "}
                <NotationMove san={guidedMove.san} color={guidedMove.color} />
              </Title>
            )}
            <p><NotationText text={t(done ? explanation || title : feedback || title)} moves={[{ san: last?.san, color }]} /></p>
            {!done && hint && <p className="academy-step-hint">{t(hint)}</p>}
          </div>
        </>
      ),
      actions: (
        <button className="button secondary" onClick={() => reset(true)}>
          <RotateCcw size={14} />
          {t("Ulangi pelajaran")}
        </button>
      ),
      complete: done && !browsing,
    });
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
                  disabled={done || !!preview || !started || paused || isOpponent}
                  onClick={requestHint}
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
      {showHintWarning && <Modal title={t("Gunakan petunjuk?")} onClose={() => setShowHintWarning(false)}>
        <p className="modal-description">{t("Menggunakan petunjuk akan memutus streak. Puzzle ini tidak dihitung sebagai penyelesaian tanpa bantuan, meskipun akhirnya berhasil.")}</p>
        <div className="modal-actions"><button className="button secondary" onClick={() => setShowHintWarning(false)}>{t("Batal")}</button><button className="button primary" onClick={revealHint}>{t("Gunakan petunjuk")}</button></div>
      </Modal>}
    </div>
  );
}
