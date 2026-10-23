import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  Clock3,
  CornerUpLeft,
  GitBranch,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Search,
  CircleHelp,
  Target,
} from "lucide-react";
import type { Settings } from "../App";
import type { Opening } from "../data/content";
import Board from "../components/Board";
import {
  DashboardPopover,
  DashboardPopoverTrigger,
  DashboardPopoverContent,
} from "../components/block/dashboard-shell";
import { IconButton, MoveList, NavigationControls } from "../components/Common";
import { NotationMove } from "../components/Notation";
import { useI18n } from "../lib/i18n";
import { readStorage, writeStorage } from "../lib/chess";
import {
  dueOpeningLines,
  isOpeningLineUnlocked,
  nextOpeningLine,
  openingLines,
  openingMoveIdea,
  openingPositions,
  recordOpeningAttempt,
} from "../lib/opening-training";
import type {
  LineProgress,
  OpeningLine,
  OpeningMode,
  OpeningProgress,
} from "../lib/opening-training";
import OpeningOverview from "./OpeningOverview";
import { playBoardSound } from "../lib/board-sound";
import "./opening-study.css";

const MODES = [
  {
    id: "learn",
    label: "Belajar",
    icon: BookOpen,
    description:
      "Pelajari langkah dan ide opening dengan panduan di papan. Panah langkah dapat diatur melalui Options dan hanya muncul dalam Learn. Selesaikan line ini untuk membuka Practice, lalu lanjutkan Learn line berikutnya secara berurutan.",
  },
  {
    id: "practice",
    label: "Latihan",
    icon: Target,
    description:
      "Mainkan line dari ingatan setelah menyelesaikan Learn pada line tersebut. Tidak ada panah panduan. Langkah yang salah perlu dicoba kembali; penggunaan Hint dicatat. Practice baru dinyatakan selesai setelah satu percobaan tanpa kesalahan dan tanpa Hint. Next practice tersedia jika line berikutnya sudah terbuka.",
  },
  {
    id: "review",
    label: "Review",
    icon: Clock3,
    description:
      "Ulangi line yang sudah jatuh tempo untuk memperkuat ingatan. Jadwal pengulangan mengikuti hasil latihan: jawaban bersih membuat interval lebih panjang, sedangkan kesalahan atau Hint membuat line perlu diulang lebih cepat. Line yang belum jatuh tempo tidak masuk antrean Review.",
  },
] as const;

export default function OpeningStudy({
  opening,
  settings,
}: {
  opening: Opening;
  settings: Settings;
}) {
  const { t, language } = useI18n();
  const lines = useMemo(() => openingLines(opening), [opening]);
  const storageKey = `kuda-opening-progress-${opening.id}`;
  const [progress, setProgress] = useState<OpeningProgress>(() =>
    readStorage(storageKey, {}),
  );
  const [lineId, setLineId] = useState(() => {
    const saved = readStorage(`kuda-opening-line-${opening.id}`, lines[0].id);
    return isOpeningLineUnlocked(lines, progress, saved, "learn")
      ? saved
      : (nextOpeningLine(lines, progress, "learn") || lines[0]).id;
  });
  const line = lines.find((item) => item.id === lineId) || lines[0];
  const { positions, moves } = useMemo(() => openingPositions(line), [line]);
  const [mode, setMode] = useState<OpeningMode>("learn");
  const [tab, setTab] = useState<"overview" | "lesson" | "lines" | "options">(
    "lesson",
  );
  const [step, setStep] = useState(0);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(opening.side === "b");
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [showLearnArrows, setShowLearnArrows] = useState(() =>
    readStorage("kuda-opening-learn-arrows", true),
  );
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<LineProgress>();
  const [reviewEmpty, setReviewEmpty] = useState(false);
  const [search, setSearch] = useState("");
  const [listLimit, setListLimit] = useState(50);
  const completionRecorded = useRef(false);
  const visiblePly = viewPly ?? step;
  const fen = positions[visiblePly];
  const expected = moves[step];
  const userTurn = expected?.color === opening.side;
  const browsing = viewPly !== null;
  const finished = step === moves.length;
  const challengeLocked = !isOpeningLineUnlocked(
    lines,
    progress,
    line.id,
    mode,
  );
  const lineIndex = lines.indexOf(line);
  const followingLine = lines[lineIndex + 1];
  const learnedCount = lines.filter(
    (item) => progress[item.id]?.learned,
  ).length;
  const masteredCount = lines.filter(
    (item) => progress[item.id]?.cleanStreak >= 2,
  ).length;
  const due = dueOpeningLines(lines, progress);
  const visibleMoves =
    mode === "learn" || finished ? line.moves : line.moves.slice(0, step);
  const filteredLines = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lines.filter((item) =>
      `${item.name} ${item.eco} ${item.moves.join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [lines, search]);

  useEffect(() => {
    writeStorage(storageKey, progress);
  }, [storageKey, progress]);
  useEffect(() => {
    writeStorage("kuda-opening-learn-arrows", showLearnArrows);
  }, [showLearnArrows]);
  useEffect(() => {
    writeStorage(`kuda-opening-line-${opening.id}`, line.id);
  }, [opening.id, line.id]);
  useEffect(() => {
    if (browsing || reviewEmpty || challengeLocked || finished || userTurn)
      return;
    const timer = setTimeout(() => {
      setStep((value) => value + 1);
      setHintShown(false);
    }, 380);
    return () => clearTimeout(timer);
  }, [
    step,
    line.id,
    browsing,
    reviewEmpty,
    challengeLocked,
    finished,
    userTurn,
  ]);
  useEffect(() => {
    if (
      !finished ||
      browsing ||
      reviewEmpty ||
      challengeLocked ||
      completionRecorded.current
    )
      return;
    completionRecorded.current = true;
    if (
      mode === "learn" ||
      (mode === "practice" && mistakes === 0 && hints === 0)
    ) {
      playBoardSound("success");
    }
    const next = recordOpeningAttempt(progress[line.id], mode, mistakes, hints);
    setProgress((value) => ({ ...value, [line.id]: next }));
    setResult(next);
    const completed = readStorage<string[]>("kuda-openings", []);
    writeStorage("kuda-openings", [...new Set([...completed, opening.id])]);
  }, [
    finished,
    browsing,
    reviewEmpty,
    challengeLocked,
    line.id,
    mode,
    mistakes,
    hints,
    progress,
    opening.id,
  ]);

  function begin(nextLine: OpeningLine, nextMode = mode) {
    completionRecorded.current = false;
    setLineId(nextLine.id);
    setMode(nextMode);
    setStep(0);
    setViewPly(null);
    setMistakes(0);
    setHints(0);
    setHintShown(false);
    setFeedback("");
    setResult(undefined);
    setReviewEmpty(false);
  }
  function changeMode(nextMode: OpeningMode) {
    const next =
      nextMode !== "review" &&
      isOpeningLineUnlocked(lines, progress, line.id, "learn")
        ? line
        : nextOpeningLine(lines, progress, nextMode);
    const target =
      next || nextOpeningLine(lines, progress, "learn") || lines[0];
    openLine(target, nextMode);
    if (!next && nextMode === "review") setReviewEmpty(true);
  }
  function openLine(target: OpeningLine, nextMode: OpeningMode) {
    begin(target, nextMode);
    const completed =
      nextMode !== "review"
        ? progress[target.id]?.completed?.[nextMode]
        : undefined;
    if (completed || (nextMode === "learn" && progress[target.id]?.learned)) {
      // Switching modes restores the result without adding an attempt or changing its review schedule.
      completionRecorded.current = true;
      setStep(target.moves.length);
      setMistakes(completed?.mistakes || 0);
      setHints(completed?.hints || 0);
      setResult(progress[target.id]);
    }
  }
  function navigate(next: number) {
    if (challengeLocked || reviewEmpty) return;
    const target = Math.max(0, Math.min(visibleMoves.length, next));
    setViewPly(target === step ? null : target);
    setHintShown(false);
    setFeedback("");
  }
  function hint() {
    if (
      finished ||
      browsing ||
      reviewEmpty ||
      challengeLocked ||
      !userTurn ||
      hintShown
    )
      return;
    setHintShown(true);
    setHints((value) => value + 1);
  }
  function playMove(from: string, to: string, promotion = "q") {
    if (finished || browsing || reviewEmpty || challengeLocked || !userTurn)
      return false;
    const chess = new Chess(fen);
    try {
      const candidate = chess.move({ from, to, promotion });
      if (candidate.san !== expected.san) {
        setMistakes((value) => value + 1);
        setFeedback(
          "Langkah ini berada di luar variasi yang dilatih. Coba lagi.",
        );
        return false;
      }
    } catch {
      return false;
    }
    setStep((value) => value + 1);
    setHintShown(false);
    setFeedback("");
    return true;
  }
  useEffect(() => {
    if (!settings.enableShortcuts) return;
    const handler = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]',
        ) ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input, select, textarea, [contenteditable=true]",
          ))
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "arrowleft") {
        event.preventDefault();
        navigate(event.shiftKey ? 0 : visiblePly - 1);
      } else if (key === "arrowright") {
        event.preventDefault();
        navigate(event.shiftKey ? visibleMoves.length : visiblePly + 1);
      } else if (!event.shiftKey && key === "f") {
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (!event.shiftKey && key === "h") {
        event.preventDefault();
        hint();
      } else if (!event.shiftKey && key === "r" && browsing) {
        event.preventDefault();
        setViewPly(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const nextReview = lines
    .map((item) => progress[item.id]?.dueAt)
    .filter((value): value is number => !!value)
    .sort((a, b) => a - b)[0];
  const accuracy = Math.round(
    (moves.filter((move) => move.color === opening.side).length /
      (moves.filter((move) => move.color === opening.side).length + mistakes)) *
      100,
  );
  const studyMove = browsing ? moves[Math.max(0, visiblePly - 1)] : expected;
  const showAnswer = mode === "learn" || hintShown || browsing || finished;
  const perfectPractice = mode === "practice" && mistakes === 0 && hints === 0;
  const nextPracticeUnlocked =
    !!followingLine &&
    isOpeningLineUnlocked(lines, progress, followingLine.id, "practice");
  const completedPractice = progress[line.id]?.completed?.practice;
  const practiceMastered =
    !!completedPractice &&
    completedPractice.mistakes === 0 &&
    completedPractice.hints === 0;
  const statusComplete =
    mode === "learn"
      ? !!progress[line.id]?.learned
      : mode === "practice"
        ? practiceMastered
        : !!result;
  const lineStatus =
    mode === "learn"
      ? statusComplete
        ? "Line ini sudah dipelajari."
        : "Selesaikan Learn untuk membuka Practice."
      : mode === "practice"
        ? practiceMastered
          ? "Practice line ini sudah selesai dengan akurasi 100%."
          : challengeLocked
            ? "Selesaikan Learn line ini terlebih dahulu untuk membuka Practice."
            : completedPractice
              ? "Practice belum 100%. Ulangi tanpa bantuan untuk menyelesaikannya."
              : "Practice line ini belum selesai."
        : result
          ? "Review line ini sudah selesai."
          : "Ulangi line ini sesuai jadwal review.";
  function continueTraining() {
    if (mode === "learn") {
      changeMode("practice");
      return;
    }
    if (mistakes > 0 || hints > 0) {
      begin(line);
      return;
    }
    if (mode === "practice") {
      if (followingLine && nextPracticeUnlocked)
        begin(followingLine, "practice");
      return;
    }
    const next = nextOpeningLine(lines, progress, mode, line.id);
    if (next) begin(next);
    else setReviewEmpty(true);
  }

  const nextLearnButton = (
    <button
      className={`button ${mode === "practice" ? "primary" : "secondary"}`}
      disabled={
        !followingLine ||
        challengeLocked ||
        !progress[line.id]?.learned ||
        (mode === "practice" && (!result || !perfectPractice))
      }
      onClick={() => followingLine && begin(followingLine, "learn")}
    >
      <BookOpen size={15} aria-hidden="true" />
      {t(
        followingLine
          ? mode === "practice"
            ? "Pelajari line berikutnya"
            : "Line berikutnya"
          : "Semua line selesai",
      )}
    </button>
  );

  return (
    <div className="page analysis-page opening-study-page">
      <div className="workspace-toolbar opening-study-heading">
        <div className="game-title-block">
          <strong>{opening.name}</strong>
          <span className="opening-repertoire">
            {t(opening.side === "w" ? "Repertoar putih" : "Repertoar hitam")} ·{" "}
            {lines.length} {t("variasi")}
          </span>
        </div>
        <div
          className="opening-study-progress"
          aria-label={t("Progres opening")}
        >
          <span>
            <BookOpen size={14} /> {learnedCount}/{lines.length}{" "}
            {t("dipelajari")}
          </span>
          <span>
            <CheckCheck size={14} /> {masteredCount} {t("dikuasai")}
          </span>
          <span>
            <Clock3 size={14} /> {due.length} {t("perlu review")}
          </span>
        </div>
      </div>
      <div className="analysis-grid opening-study-grid">
        <section className="board-section">
          <div className="board-and-eval">
            <div className="board-main">
              <Board
                fen={fen}
                flipped={flipped}
                theme={settings.boardTheme}
                onMove={playMove}
                lastMove={moves[visiblePly - 1]}
                disabled={
                  browsing ||
                  finished ||
                  reviewEmpty ||
                  challengeLocked ||
                  !userTurn
                }
                arrow={
                  mode === "learn" &&
                  showLearnArrows &&
                  !browsing &&
                  !finished &&
                  !reviewEmpty &&
                  !challengeLocked &&
                  userTurn &&
                  expected
                    ? `${expected.from}${expected.to}`
                    : undefined
                }
              />
            </div>
          </div>
          <NavigationControls
            ply={visiblePly}
            total={line.moves.length}
            navigationLimit={
              challengeLocked || reviewEmpty ? 0 : visibleMoves.length
            }
            enableShortcuts={settings.enableShortcuts}
            onChange={navigate}
            onFlip={() => setFlipped((value) => !value)}
            actions={
              <>
                <IconButton
                  label="Ulangi variasi"
                  onClick={() => begin(line)}
                  disabled={reviewEmpty || challengeLocked}
                >
                  <RotateCcw size={16} />
                </IconButton>
                <IconButton
                  label="Petunjuk"
                  shortcut={settings.enableShortcuts ? "H" : undefined}
                  onClick={hint}
                  disabled={
                    finished ||
                    browsing ||
                    reviewEmpty ||
                    challengeLocked ||
                    !userTurn ||
                    hintShown
                  }
                >
                  <Lightbulb size={16} />
                </IconButton>
              </>
            }
          />
        </section>
        <div className="analysis-sidebar opening-study-sidebar">
          <aside className="analysis-panel opening-study-panel">
            <div
              className="panel-tabs"
              role="tablist"
              aria-label={t("Materi opening")}
            >
              <button
                role="tab"
                id="opening-overview-tab"
                aria-controls="opening-overview-panel"
                aria-selected={tab === "overview"}
                className={tab === "overview" ? "active" : ""}
                onClick={() => setTab("overview")}
              >
                {t("Ikhtisar")}
              </button>
              <button
                role="tab"
                id="opening-lesson-tab"
                aria-controls="opening-lesson-panel"
                aria-selected={tab === "lesson"}
                className={tab === "lesson" ? "active" : ""}
                onClick={() => setTab("lesson")}
              >
                {t("Pelajaran")}
              </button>
              <button
                role="tab"
                id="opening-lines-tab"
                aria-controls="opening-lines-panel"
                aria-selected={tab === "lines"}
                className={tab === "lines" ? "active" : ""}
                onClick={() => setTab("lines")}
              >
                {t("Variasi")} <small>{lines.length}</small>
              </button>
              <button
                role="tab"
                id="opening-options-tab"
                aria-controls="opening-options-panel"
                aria-selected={tab === "options"}
                className={tab === "options" ? "active" : ""}
                onClick={() => setTab("options")}
              >
                {t("Opsi")}
              </button>
              <DashboardPopover>
                <DashboardPopoverTrigger asChild>
                  <button
                    className="icon-button shortcut-help-button opening-mode-help"
                    aria-label={t("Panduan mode opening")}
                    title={t("Panduan mode opening")}
                  >
                    <CircleHelp size={16} aria-hidden="true" />
                  </button>
                </DashboardPopoverTrigger>
                <DashboardPopoverContent
                  className="shortcut-help-popover opening-mode-popover"
                  align="end"
                  side="bottom"
                  aria-label={t("Panduan mode opening")}
                >
                  <strong>{t("Panduan mode opening")}</strong>
                  {MODES.map((item) => (
                    <section key={item.id}>
                      <strong>{t(item.label)}</strong>
                      <p>{t(item.description)}</p>
                    </section>
                  ))}
                </DashboardPopoverContent>
              </DashboardPopover>
            </div>
            {tab === "lesson" && (
              <div className="opening-mode-picker">
                <div
                  className="segmented"
                  role="group"
                  aria-label={t("Mode latihan opening")}
                >
                  {MODES.map((item) => (
                    <button
                      key={item.id}
                      className={mode === item.id ? "active" : ""}
                      aria-pressed={mode === item.id}
                      onClick={() => changeMode(item.id)}
                    >
                      <item.icon size={14} /> {t(item.label)}
                      {item.id === "review" && due.length > 0 && (
                        <small>{due.length}</small>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === "overview" ? (
              <OpeningOverview opening={opening} />
            ) : tab === "options" ? (
              <div
                className="opening-options-panel"
                role="tabpanel"
                id="opening-options-panel"
                aria-labelledby="opening-options-tab"
              >
                <label className="opening-learn-arrow-setting board-sound-setting">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={showLearnArrows}
                    onChange={(event) =>
                      setShowLearnArrows(event.target.checked)
                    }
                  />
                  {t("Tampilkan panah langkah untuk Learn")}
                </label>
              </div>
            ) : tab === "lines" ? (
              <div
                className="opening-variations-panel"
                role="tabpanel"
                id="opening-lines-panel"
                aria-labelledby="opening-lines-tab"
              >
                <label className="search-input">
                  <Search size={15} />
                  <input
                    aria-label={t("Cari variasi")}
                    placeholder={t("Cari nama, ECO, atau langkah…")}
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setListLimit(50);
                    }}
                  />
                </label>
                <div className="opening-variation-list">
                  {filteredLines.slice(0, listLimit).map((item) => {
                    const state = progress[item.id];
                    const practice = state?.completed?.practice;
                    const practiceComplete =
                      !!practice &&
                      practice.mistakes === 0 &&
                      practice.hints === 0;
                    const unlocked = isOpeningLineUnlocked(
                      lines,
                      progress,
                      item.id,
                      "learn",
                    );
                    const lockReason =
                      "Selesaikan Learn line sebelumnya terlebih dahulu.";
                    return (
                      <button
                        key={item.id}
                        disabled={!unlocked}
                        title={!unlocked ? t(lockReason) : undefined}
                        className={`opening-variation-item${item.id === line.id ? " active" : ""}`}
                        aria-current={item.id === line.id ? "true" : undefined}
                        onClick={() => {
                          openLine(
                            item,
                            state?.learned && mode !== "learn"
                              ? "practice"
                              : "learn",
                          );
                          setTab("lesson");
                        }}
                      >
                        <span className="opening-variation-icon">
                          {!unlocked ? (
                            <LockKeyhole size={16} />
                          ) : practiceComplete ? (
                            <CheckCheck size={16} />
                          ) : state?.learned ? (
                            <Check size={16} />
                          ) : (
                            <GitBranch size={16} />
                          )}
                        </span>
                        <span>
                          <strong>{t(item.name)}</strong>
                          <small>
                            Challenge {lines.indexOf(item) + 1} · {item.eco} ·{" "}
                            {Math.ceil(item.moves.length / 2)} {t("langkah")}
                            {state?.learned && state.dueAt <= Date.now()
                              ? ` · ${t("Perlu review")}`
                              : ""}
                          </small>
                          {!unlocked && (
                            <small className="opening-lock-reason">
                              {t(lockReason)}
                            </small>
                          )}
                        </span>
                        <ChevronRightIcon />
                      </button>
                    );
                  })}
                  {!filteredLines.length && (
                    <p className="opening-list-empty">
                      {t("Variasi tidak ditemukan.")}
                    </p>
                  )}
                  {filteredLines.length > listLimit && (
                    <button
                      className="text-button opening-load-more"
                      onClick={() => setListLimit((value) => value + 50)}
                    >
                      {t("Tampilkan lebih banyak")} (
                      {filteredLines.length - listLimit})
                    </button>
                  )}
                </div>
                <a
                  className="opening-data-credit"
                  href="https://github.com/lichess-org/chess-openings"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Variasi dari Lichess · CC0")}
                </a>
              </div>
            ) : (
              <div
                className="opening-lesson-panel"
                role="tabpanel"
                id="opening-lesson-panel"
                aria-labelledby="opening-lesson-tab"
              >
                {reviewEmpty ? (
                  <div className="opening-review-empty">
                    <CheckCheck size={30} />
                    <h2>{t("Review selesai")}</h2>
                    <p>
                      {t(
                        "Belum ada variasi yang perlu diulang. Pelajari variasi baru atau lanjutkan latihan.",
                      )}
                    </p>
                    {nextReview && (
                      <p>
                        {t("Review berikutnya")}:{" "}
                        {new Date(nextReview).toLocaleDateString(
                          language === "en" ? "en-GB" : "id-ID",
                          { day: "numeric", month: "short" },
                        )}
                      </p>
                    )}
                    <button
                      className="button primary"
                      onClick={() => changeMode("learn")}
                    >
                      {t("Pelajari variasi baru")} <ArrowRight size={15} />
                    </button>
                  </div>
                ) : challengeLocked ? (
                  <div className="opening-review-empty" role="status">
                    <LockKeyhole size={30} />
                    <h2>{t("Challenge terkunci")}</h2>
                    <p>
                      Challenge {lineIndex + 1} · {t(line.name)}
                    </p>
                    <p>
                      {t(
                        "Selesaikan Learn line ini terlebih dahulu untuk membuka Practice.",
                      )}
                    </p>
                    <button
                      className="button primary"
                      onClick={() => {
                        begin(
                          isOpeningLineUnlocked(
                            lines,
                            progress,
                            line.id,
                            "learn",
                          )
                            ? line
                            : nextOpeningLine(lines, progress, "learn") ||
                                lines[0],
                          "learn",
                        );
                      }}
                    >
                      {t("Mulai Learn")} <ArrowRight size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="opening-current-line">
                      <span className="subtle-pill">{line.eco}</span>
                      <h2>{t(line.name)}</h2>
                      <span>
                        Challenge {lineIndex + 1}/{lines.length}
                      </span>
                    </div>
                    {browsing && (
                      <div className="opening-browse-banner">
                        <span>{t("Menjelajahi langkah")}</span>
                        <button
                          className="text-button"
                          onClick={() => setViewPly(null)}
                        >
                          <CornerUpLeft size={14} /> {t("Kembali ke latihan")}
                        </button>
                      </div>
                    )}
                    {result && !browsing ? (
                      mode !== "learn" && (
                        <div className="opening-result">
                          <div className="opening-result-stats">
                            <span>
                              <strong>{accuracy}%</strong>
                              {t("Akurasi")}
                            </span>
                            <span>
                              <strong>{mistakes}</strong>
                              {t("Percobaan ulang")}
                            </span>
                            <span>
                              <strong>{hints}</strong>
                              {t("Petunjuk")}
                            </span>
                          </div>
                          <p>
                            {t(
                              result.intervalDays
                                ? "Variasi tersimpan dalam jadwal review."
                                : "Ulangi tanpa petunjuk agar variasi ini semakin melekat.",
                            )}
                          </p>
                          {result.intervalDays > 0 && (
                            <small>
                              {t("Review berikutnya")}:{" "}
                              {new Date(result.dueAt).toLocaleDateString(
                                language === "en" ? "en-GB" : "id-ID",
                                { day: "numeric", month: "short" },
                              )}
                            </small>
                          )}
                        </div>
                      )
                    ) : (
                      <div
                        className={`opening-coach${feedback ? " retry" : ""}`}
                        aria-live="polite"
                      >
                        <span className="small-label">
                          {t(
                            browsing
                              ? "Posisi pilihan"
                              : userTurn
                                ? "Giliranmu"
                                : "Lawan melangkah",
                          )}
                        </span>
                        {showAnswer && studyMove ? (
                          <h3>
                            {browsing
                              ? `${Math.ceil(visiblePly / 2)}${studyMove.color === "w" ? "." : "…"} `
                              : `${Math.ceil((step + 1) / 2)}${studyMove.color === "w" ? "." : "…"} `}
                            <NotationMove
                              san={studyMove.san}
                              color={studyMove.color}
                            />
                          </h3>
                        ) : (
                          <h3>
                            {t(
                              opening.side === "w"
                                ? "Mainkan langkah putih"
                                : "Mainkan langkah hitam",
                            )}
                          </h3>
                        )}
                        <p>
                          {feedback
                            ? t(feedback)
                            : showAnswer
                              ? t(openingMoveIdea(studyMove))
                              : t(
                                  "Ingat rencana opening dan tentukan langkah berikutnya. Gunakan petunjuk jika perlu.",
                                )}
                        </p>
                        {feedback && (
                          <small>
                            {t(
                              "Langkah lain tetap bisa valid; latihan ini mengikuti variasi yang dipilih.",
                            )}
                          </small>
                        )}
                      </div>
                    )}
                    <div
                      className="opening-training-progress"
                      aria-label={t("Progres variasi")}
                    >
                      <span
                        style={{ width: `${(step / moves.length) * 100}%` }}
                      />
                    </div>
                    <div className="notation-heading">
                      <span>{t("Notasi variasi")}</span>
                      <span>
                        {Math.ceil(visiblePly / 2)}/
                        {Math.ceil(line.moves.length / 2)}
                      </span>
                    </div>
                    <MoveList
                      moves={visibleMoves}
                      ply={visiblePly}
                      onChange={navigate}
                      startFen={DEFAULT_POSITION}
                    />
                  </>
                )}
              </div>
            )}
            {tab === "lesson" && !reviewEmpty && (
              <div
                className={`notation-heading opening-study-footer${statusComplete ? " completed" : ""}`}
                role="status"
              >
                {statusComplete ? (
                  <CheckCheck size={16} aria-hidden="true" />
                ) : (
                  <BookOpen size={16} aria-hidden="true" />
                )}
                <span>{t(lineStatus)}</span>
              </div>
            )}
            {tab === "lesson" &&
              (mode !== "review" || (result && !reviewEmpty)) && (
                <div
                  className="opening-action-dock"
                  role="group"
                  aria-label={t("Kontrol latihan opening")}
                >
                  <div className="opening-result-actions">
                    {mode === "practice" && nextLearnButton}
                    {mode === "learn" ? (
                      <button
                        className="button primary"
                        disabled={
                          challengeLocked || !progress[line.id]?.learned
                        }
                        onClick={() => changeMode("practice")}
                      >
                        <Target size={15} aria-hidden="true" />
                        {t("Latih line ini")}
                      </button>
                    ) : mode === "practice" ? (
                      <button
                        className="button secondary"
                        disabled={
                          !result || !perfectPractice || !nextPracticeUnlocked
                        }
                        title={
                          followingLine && !nextPracticeUnlocked
                            ? t("Selesaikan Learn line ini terlebih dahulu.")
                            : undefined
                        }
                        onClick={continueTraining}
                      >
                        <Target size={15} aria-hidden="true" />
                        {t("Practice berikutnya")}
                      </button>
                    ) : (
                      <button
                        className="button primary"
                        onClick={continueTraining}
                      >
                        {mistakes > 0 || hints > 0 ? (
                          <RotateCcw size={15} aria-hidden="true" />
                        ) : (
                          <Clock3 size={15} aria-hidden="true" />
                        )}
                        {t(
                          mistakes > 0 || hints > 0
                            ? "Ulangi variasi"
                            : "Review berikutnya",
                        )}
                      </button>
                    )}
                    {mode === "learn" && nextLearnButton}
                    {mode !== "review" && (
                      <button
                        className="button secondary"
                        disabled={challengeLocked}
                        onClick={() => begin(line)}
                      >
                        <RotateCcw size={14} aria-hidden="true" />{" "}
                        {t("Ulangi variasi")}
                      </button>
                    )}
                  </div>
                </div>
              )}
          </aside>
        </div>
        {settings.enableShortcuts && (
          <div className="board-under opening-study-shortcuts">
            <div className="board-shortcut-hints">
              <span>{t("← → Navigasi")}</span>
              <span>
                <kbd>F</kbd> {t("Balik papan")}
              </span>
              <span>
                <kbd>H</kbd> {t("Petunjuk")}
              </span>
              {browsing && (
                <span>
                  <kbd>R</kbd> {t("Kembali ke latihan")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return <ArrowRight size={14} aria-hidden="true" />;
}
