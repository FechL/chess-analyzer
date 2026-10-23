import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
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
  OpeningProgress,
} from "../lib/opening-training";
import {
  reviewCandidates,
  reviewInitialTimeMs,
  reviewModeKey,
  reviewTimeBonusMs,
  shuffleReviewLines,
} from "../lib/opening-review";
import type { ReviewOptions } from "../lib/opening-review";
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
] as const;

type LessonMode = (typeof MODES)[number]["id"];
type ReviewRun = {
  status: "idle" | "active" | "transition" | "finished" | "failed";
  modeKey: string;
  queue: string[];
  index: number;
  step: number;
  mistakes: number;
  score: number;
  deadline: number;
  remainingMs: number;
  failure?: "lives" | "timer";
};
const EMPTY_REVIEW: ReviewRun = {
  status: "idle",
  modeKey: "",
  queue: [],
  index: 0,
  step: 0,
  mistakes: 0,
  score: 0,
  deadline: 0,
  remainingMs: 0,
};

export default function OpeningStudy({
  opening,
  settings,
}: {
  opening: Opening;
  settings: Settings;
}) {
  const { t } = useI18n();
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
  const [mode, setMode] = useState<LessonMode>("learn");
  const [tab, setTab] = useState<
    "overview" | "lesson" | "review" | "lines" | "options"
  >("lesson");
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
  const [reviewOptions, setReviewOptions] = useState<ReviewOptions>(() =>
    readStorage(`kuda-opening-review-options-${opening.id}`, {
      lives: false,
      timer: false,
    }),
  );
  const [reviewRun, setReviewRun] = useState<ReviewRun>(EMPTY_REVIEW);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewHighscores, setReviewHighscores] = useState<
    Record<string, number>
  >(() => readStorage(`kuda-opening-review-highscores-${opening.id}`, {}));
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
  const eligibleReviewLines = useMemo(
    () => reviewCandidates(lines, progress),
    [lines, progress],
  );
  const reviewLine = lines.find(
    (item) => item.id === reviewRun.queue[reviewRun.index],
  );
  const reviewPositions = useMemo(
    () => (reviewLine ? openingPositions(reviewLine) : null),
    [reviewLine],
  );
  const reviewMode = reviewModeKey(reviewOptions);
  const reviewHighscore = reviewHighscores[reviewMode] || 0;
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
    writeStorage(`kuda-opening-review-options-${opening.id}`, reviewOptions);
  }, [opening.id, reviewOptions]);
  useEffect(() => {
    writeStorage(
      `kuda-opening-review-highscores-${opening.id}`,
      reviewHighscores,
    );
  }, [opening.id, reviewHighscores]);
  useEffect(() => {
    if (
      !reviewRun.modeKey ||
      reviewRun.score <= (reviewHighscores[reviewRun.modeKey] || 0)
    )
      return;
    setReviewHighscores((value) => ({
      ...value,
      [reviewRun.modeKey]: Math.max(
        value[reviewRun.modeKey] || 0,
        reviewRun.score,
      ),
    }));
  }, [reviewRun.score, reviewRun.modeKey, reviewHighscores]);
  useEffect(() => {
    if (browsing || challengeLocked || finished || userTurn) return;
    const timer = setTimeout(() => {
      setStep((value) => value + 1);
      setHintShown(false);
    }, 380);
    return () => clearTimeout(timer);
  }, [step, line.id, browsing, challengeLocked, finished, userTurn]);
  useEffect(() => {
    if (!finished || browsing || challengeLocked || completionRecorded.current)
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
  }
  function changeMode(nextMode: LessonMode) {
    const next = isOpeningLineUnlocked(lines, progress, line.id, "learn")
      ? line
      : nextOpeningLine(lines, progress, nextMode);
    const target =
      next || nextOpeningLine(lines, progress, "learn") || lines[0];
    openLine(target, nextMode);
  }
  function openLine(target: OpeningLine, nextMode: LessonMode) {
    begin(target, nextMode);
    const completed = progress[target.id]?.completed?.[nextMode];
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
    if (challengeLocked) return;
    const target = Math.max(0, Math.min(visibleMoves.length, next));
    setViewPly(target === step ? null : target);
    setHintShown(false);
    setFeedback("");
  }
  function hint() {
    if (finished || browsing || challengeLocked || !userTurn || hintShown)
      return;
    setHintShown(true);
    setHints((value) => value + 1);
  }
  function playMove(from: string, to: string, promotion = "q") {
    if (finished || browsing || challengeLocked || !userTurn) return false;
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
  function startReview() {
    if (!eligibleReviewLines.length) return;
    const remainingMs = reviewOptions.timer
      ? reviewInitialTimeMs(eligibleReviewLines)
      : 0;
    setReviewRun({
      ...EMPTY_REVIEW,
      status: "active",
      modeKey: reviewMode,
      queue: shuffleReviewLines(eligibleReviewLines),
      deadline: reviewOptions.timer ? Date.now() + remainingMs : 0,
      remainingMs,
    });
    setReviewFeedback("");
  }
  function playReviewMove(from: string, to: string, promotion = "q") {
    const expectedMove = reviewPositions?.moves[reviewRun.step];
    const position = reviewPositions?.positions[reviewRun.step];
    if (
      reviewRun.status !== "active" ||
      !expectedMove ||
      !position ||
      expectedMove.color !== opening.side
    )
      return false;
    if (reviewOptions.timer && Date.now() >= reviewRun.deadline) {
      setReviewRun((current) => ({
        ...current,
        status: "failed",
        failure: "timer",
        remainingMs: 0,
      }));
      return false;
    }
    try {
      const candidate = new Chess(position).move({ from, to, promotion });
      if (candidate.san !== expectedMove.san) {
        setReviewRun((current) => {
          if (current.status !== "active") return current;
          const mistakes = current.mistakes + 1;
          return {
            ...current,
            mistakes,
            status: reviewOptions.lives && mistakes > 3 ? "failed" : "active",
            failure: reviewOptions.lives && mistakes > 3 ? "lives" : undefined,
          };
        });
        setReviewFeedback("Langkah kurang tepat. Coba lagi.");
        return false;
      }
    } catch {
      return false;
    }
    setReviewRun((current) =>
      current.status === "active"
        ? { ...current, step: current.step + 1 }
        : current,
    );
    setReviewFeedback("");
    return true;
  }
  useEffect(() => {
    const expectedMove = reviewPositions?.moves[reviewRun.step];
    if (
      reviewRun.status !== "active" ||
      !expectedMove ||
      expectedMove.color === opening.side
    )
      return;
    const timer = window.setTimeout(() => {
      setReviewRun((current) =>
        current.status === "active" && current.step === reviewRun.step
          ? { ...current, step: current.step + 1 }
          : current,
      );
    }, 380);
    return () => window.clearTimeout(timer);
  }, [reviewRun.status, reviewRun.step, reviewPositions, opening.side]);
  useEffect(() => {
    if (
      reviewRun.status !== "active" ||
      !reviewLine ||
      reviewRun.step !== reviewLine.moves.length
    )
      return;
    if (reviewOptions.timer && Date.now() >= reviewRun.deadline) {
      setReviewRun((current) => ({
        ...current,
        status: "failed",
        failure: "timer",
        remainingMs: 0,
      }));
      return;
    }
    playBoardSound("success");
    setReviewRun((current) => {
      if (
        current.status !== "active" ||
        current.step !== reviewLine.moves.length
      )
        return current;
      const remainingMs = reviewOptions.timer
        ? Math.max(0, current.deadline - Date.now()) +
          reviewTimeBonusMs(reviewLine)
        : 0;
      return {
        ...current,
        score: current.score + 1,
        status:
          current.index + 1 === current.queue.length
            ? "finished"
            : "transition",
        deadline: reviewOptions.timer ? Date.now() + remainingMs : 0,
        remainingMs,
      };
    });
  }, [reviewRun.status, reviewRun.step, reviewLine, reviewOptions.timer]);
  useEffect(() => {
    if (reviewRun.status !== "transition") return;
    const timer = window.setTimeout(() => {
      setReviewRun((current) =>
        current.status === "transition"
          ? { ...current, status: "active", index: current.index + 1, step: 0 }
          : current,
      );
      setReviewFeedback("");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [reviewRun.status]);
  useEffect(() => {
    if (
      !reviewOptions.timer ||
      (reviewRun.status !== "active" && reviewRun.status !== "transition")
    )
      return;
    const timer = window.setInterval(() => {
      setReviewRun((current) => {
        if (current.status !== "active" && current.status !== "transition")
          return current;
        const remainingMs = Math.max(0, current.deadline - Date.now());
        if (remainingMs === current.remainingMs) return current;
        return remainingMs
          ? { ...current, remainingMs }
          : { ...current, remainingMs: 0, status: "failed", failure: "timer" };
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [reviewRun.status, reviewOptions.timer]);
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
      if (tab === "review") {
        if (!event.shiftKey && key === "f") {
          event.preventDefault();
          setFlipped((value) => !value);
        }
        return;
      }
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
    mode === "learn" ? !!progress[line.id]?.learned : practiceMastered;
  const lineStatus =
    mode === "learn"
      ? statusComplete
        ? "Line ini sudah dipelajari."
        : "Selesaikan Learn untuk membuka Practice."
      : practiceMastered
        ? "Practice line ini sudah selesai dengan akurasi 100%."
        : challengeLocked
          ? "Selesaikan Learn line ini terlebih dahulu untuk membuka Practice."
          : completedPractice
            ? "Practice belum 100%. Ulangi tanpa bantuan untuk menyelesaikannya."
            : "Practice line ini belum selesai.";
  function continueTraining() {
    if (mode === "learn") {
      changeMode("practice");
      return;
    }
    if (mistakes > 0 || hints > 0) {
      begin(line);
      return;
    }
    if (followingLine && nextPracticeUnlocked) begin(followingLine, "practice");
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

  const reviewing = tab === "review";
  const reviewMoves = reviewPositions?.moves || [];
  const reviewExpected = reviewMoves[reviewRun.step];
  const reviewCanMove =
    reviewRun.status === "active" && reviewExpected?.color === opening.side;
  const reviewTotal = reviewLine?.moves.length || 0;

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
      </div>
      <div className="analysis-grid opening-study-grid">
        <section className="board-section">
          <div className="board-and-eval">
            <div className="board-main">
              <Board
                fen={
                  reviewing
                    ? reviewPositions?.positions[reviewRun.step] ||
                      DEFAULT_POSITION
                    : fen
                }
                flipped={flipped}
                theme={settings.boardTheme}
                onMove={reviewing ? playReviewMove : playMove}
                lastMove={
                  reviewing
                    ? reviewMoves[reviewRun.step - 1]
                    : moves[visiblePly - 1]
                }
                disabled={
                  reviewing
                    ? !reviewCanMove
                    : browsing || finished || challengeLocked || !userTurn
                }
                arrow={
                  !reviewing &&
                  mode === "learn" &&
                  showLearnArrows &&
                  !browsing &&
                  !finished &&
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
            ply={reviewing ? reviewRun.step : visiblePly}
            total={reviewing ? reviewTotal : line.moves.length}
            navigationLimit={
              reviewing || challengeLocked ? 0 : visibleMoves.length
            }
            navigationDisabled={reviewing}
            enableShortcuts={settings.enableShortcuts && !reviewing}
            onChange={reviewing ? () => {} : navigate}
            onFlip={() => setFlipped((value) => !value)}
            actions={
              reviewing ? (
                <IconButton
                  label="Ulangi tes"
                  onClick={startReview}
                  disabled={!eligibleReviewLines.length}
                >
                  <RotateCcw size={16} />
                </IconButton>
              ) : (
                <>
                  <IconButton
                    label="Ulangi variasi"
                    onClick={() => begin(line)}
                    disabled={challengeLocked}
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
                      challengeLocked ||
                      !userTurn ||
                      hintShown
                    }
                  >
                    <Lightbulb size={16} />
                  </IconButton>
                </>
              )
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
                id="opening-review-tab"
                aria-controls="opening-review-panel"
                aria-selected={tab === "review"}
                className={tab === "review" ? "active" : ""}
                onClick={() => setTab("review")}
              >
                {t("Review")}
              </button>
              <button
                role="tab"
                id="opening-lines-tab"
                aria-controls="opening-lines-panel"
                aria-selected={tab === "lines"}
                className={tab === "lines" ? "active" : ""}
                onClick={() => setTab("lines")}
              >
                {t("Variasi")}
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
                  <section>
                    <strong>{t("Review")}</strong>
                    <p>
                      {t(
                        "Tes acak dari line yang sudah dipelajari dan diselesaikan dengan Practice 100%. Setiap line muncul sekali per sesi. Nyawa dan timer bisa diaktifkan bersama atau terpisah; rekor disimpan untuk tiap kombinasi mode.",
                      )}
                    </p>
                  </section>
                </DashboardPopoverContent>
              </DashboardPopover>
            </div>
            {tab === "lesson" && (
              <div className="opening-mode-picker">
                <div className="opening-current-line">
                  <span className="subtle-pill">{line.eco}</span>
                  <h2>{t(line.name)}</h2>
                  <span>
                    Challenge {lineIndex + 1}/{lines.length}
                  </span>
                </div>
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
            ) : tab === "review" ? (
              <div
                className="opening-review-panel"
                role="tabpanel"
                id="opening-review-panel"
                aria-labelledby="opening-review-tab"
              >
                <div className="opening-review-summary">
                  <span className="small-label">{t("Tes acak")}</span>
                  <h2>{t("Review opening")}</h2>
                  <p>
                    {t(
                      "Mainkan line acak yang sudah selesai Learn dan Practice 100%. Setiap line muncul sekali dalam satu tes.",
                    )}
                  </p>
                  <div className="opening-review-metrics">
                    <span>
                      <strong>{eligibleReviewLines.length}</strong>
                      {t("Line tersedia")}
                    </span>
                    <span>
                      <strong>{reviewHighscore}</strong>
                      {t("Skor tertinggi")}
                    </span>
                  </div>
                </div>

                {reviewRun.status === "idle" ||
                reviewRun.status === "finished" ||
                reviewRun.status === "failed" ? (
                  <div className="opening-review-setup">
                    {reviewRun.status !== "idle" && (
                      <div className="opening-review-outcome" role="status">
                        <CheckCheck size={22} aria-hidden="true" />
                        <strong>
                          {t(
                            reviewRun.status === "finished"
                              ? "Tes selesai"
                              : reviewRun.failure === "timer"
                                ? "Waktu habis"
                                : "Batas kesalahan tercapai",
                          )}
                        </strong>
                        <span>
                          {t("Skor")} {reviewRun.score}/{reviewRun.queue.length}
                        </span>
                      </div>
                    )}
                    <h3>{t("Mode tes")}</h3>
                    <p>
                      {t("Pilih salah satu, keduanya, atau tanpa batasan.")}
                    </p>
                    <label className="opening-review-toggle board-sound-setting">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={reviewOptions.lives}
                        onChange={(event) =>
                          setReviewOptions((value) => ({
                            ...value,
                            lives: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        <strong>{t("Nyawa")}</strong>
                        <small>{t("Maksimal 3 langkah salah.")}</small>
                      </span>
                    </label>
                    <label className="opening-review-toggle board-sound-setting">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={reviewOptions.timer}
                        onChange={(event) =>
                          setReviewOptions((value) => ({
                            ...value,
                            timer: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        <strong>{t("Timer")}</strong>
                        <small>
                          {t(
                            "Awal: 1 detik per langkah di semua line. Selesai satu line: tambah 0,5 detik per langkah line itu.",
                          )}
                        </small>
                      </span>
                    </label>
                    {!eligibleReviewLines.length && (
                      <p className="opening-review-lock">
                        {t(
                          "Selesaikan Learn dan Practice 100% pada setidaknya satu line untuk membuka Review.",
                        )}
                      </p>
                    )}
                    <button
                      className="button primary opening-review-start"
                      disabled={!eligibleReviewLines.length}
                      onClick={startReview}
                    >
                      <Target size={15} aria-hidden="true" />
                      {t(
                        reviewRun.status === "idle" ? "Mulai tes" : "Tes lagi",
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="opening-review-session">
                    <div className="opening-review-session-top">
                      <span>
                        {t("Challenge")} {reviewRun.index + 1}/
                        {reviewRun.queue.length}
                      </span>
                      <strong>
                        {t("Skor")} {reviewRun.score}
                      </strong>
                    </div>
                    <div className="opening-review-session-stats">
                      {reviewOptions.lives && (
                        <span>
                          {t("Kesalahan")} {reviewRun.mistakes}/3
                        </span>
                      )}
                      {reviewOptions.timer && (
                        <span>
                          {t("Waktu")}{" "}
                          {formatReviewClock(reviewRun.remainingMs)}
                        </span>
                      )}
                    </div>
                    {reviewLine && (
                      <>
                        <div className="opening-current-line">
                          <span className="subtle-pill">{reviewLine.eco}</span>
                          <h2>{t(reviewLine.name)}</h2>
                        </div>
                        <div
                          className={`opening-coach${reviewFeedback ? " retry" : ""}`}
                          role="status"
                        >
                          <span className="small-label">
                            {t(
                              reviewRun.status === "transition"
                                ? "Line selesai"
                                : "Giliranmu",
                            )}
                          </span>
                          <p>
                            {t(
                              reviewFeedback ||
                                (reviewRun.status === "transition"
                                  ? "Line berikutnya akan dimulai."
                                  : "Mainkan langkah berikutnya tanpa petunjuk."),
                            )}
                          </p>
                        </div>
                        <div className="opening-training-progress">
                          <span
                            style={{
                              width: `${(reviewRun.step / reviewTotal) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="notation-heading">
                          <span>{t("Notasi tes")}</span>
                          <span>
                            {Math.ceil(reviewRun.step / 2)}/
                            {Math.ceil(reviewTotal / 2)}
                          </span>
                        </div>
                        <MoveList
                          moves={reviewLine.moves.slice(0, reviewRun.step)}
                          ply={reviewRun.step}
                          startFen={DEFAULT_POSITION}
                        />
                      </>
                    )}
                  </div>
                )}
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
                {challengeLocked ? (
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
                    {!(result && !browsing) && (
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
            {tab === "lesson" && (
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
            {tab === "lesson" && (
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
                      disabled={challengeLocked || !progress[line.id]?.learned}
                      onClick={() => changeMode("practice")}
                    >
                      <Target size={15} aria-hidden="true" />
                      {t("Latih line ini")}
                    </button>
                  ) : (
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
                  )}
                  {mode === "learn" && nextLearnButton}
                  <button
                    className="button secondary"
                    disabled={challengeLocked}
                    onClick={() => begin(line)}
                  >
                    <RotateCcw size={14} aria-hidden="true" />{" "}
                    {t("Ulangi variasi")}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
        {settings.enableShortcuts && (
          <div className="board-under opening-study-shortcuts">
            <div className="board-shortcut-hints">
              {!reviewing && <span>{t("← → Navigasi")}</span>}
              <span>
                <kbd>F</kbd> {t("Balik papan")}
              </span>
              {!reviewing && (
                <span>
                  <kbd>H</kbd> {t("Petunjuk")}
                </span>
              )}
              {!reviewing && browsing && (
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

function formatReviewClock(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
