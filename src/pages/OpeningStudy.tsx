import Title from "../components/Title";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  CornerUpLeft,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Search,
  CircleHelp,
  Target,
} from "lucide-react";
import type { Settings } from "../App";
import type { Opening } from "../data/content";
import { openingOverviewMoves } from "../data/opening-overviews";
import Board, { EvalBar } from "../components/Board";
import {
  DashboardPopover,
  DashboardPopoverTrigger,
  DashboardPopoverContent,
} from "../components/block/dashboard-shell";
import {
  IconButton,
  MoveList,
  NavigationControls,
  NavigationShortcutHint,
} from "../components/Common";
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
  reviewTimeBonusMs,
  shuffleReviewLines,
} from "../lib/opening-review";
import type { ReviewOptions } from "../lib/opening-review";
import OpeningOverview from "./OpeningOverview";
import { playBoardSound } from "../lib/board-sound";
import { useEngine } from "../hooks/useEngine";
import { useBoardAnimation } from "../lib/board-animation";
import type { Evaluation } from "../lib/chess";
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
  onSettingsChange,
}: {
  opening: Opening;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}) {
  const { t } = useI18n();
  const moveAnimations = useBoardAnimation();
  const { engine, status: engineStatus } = useEngine(settings.engine);
  const [evaluation, setEvaluation] = useState<Evaluation>();
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
  const overviewPosition = useMemo(
    () =>
      openingPositions({
        id: `${opening.id}-overview`,
        eco: opening.eco,
        name: opening.name,
        moves: openingOverviewMoves(opening.id, opening.moves),
      }),
    [opening],
  );
  const [mode, setMode] = useState<LessonMode>("learn");
  const [tab, setTab] = useState<
    "overview" | "lesson" | "review" | "lines" | "options"
  >("overview");
  const [overviewPly, setOverviewPly] = useState(0);
  const [overviewReplay, setOverviewReplay] = useState(0);
  const [tabTransition, setTabTransition] = useState<{
    fens: string[];
    index: number;
  } | null>(null);
  const [previewLineId, setPreviewLineId] = useState<string | null>(null);
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
  const previewLine = lines.find((item) => item.id === previewLineId);
  const previewPosition = useMemo(
    () => (previewLine ? openingPositions(previewLine) : null),
    [previewLine],
  );
  const visibleMoves =
    mode === "learn" || finished ? line.moves : line.moves.slice(0, step);
  const filteredLines = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lines.filter((item) =>
      `${item.name} ${item.aliases?.join(" ") || ""} ${item.eco} ${item.moves.join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [lines, search]);
  const learnedCount = lines.filter((item) => progress[item.id]?.learned).length;
  const practicedCount = lines.filter((item) => {
    const practice = progress[item.id]?.completed?.practice;
    return practice?.mistakes === 0 && practice.hints === 0;
  }).length;

  useEffect(() => {
    if (tab !== "overview" || overviewPly >= overviewPosition.moves.length)
      return;
    const timer = window.setTimeout(() => {
      setOverviewPly((ply) => ply + 1);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [tab, overviewPly, overviewReplay, overviewPosition]);

  useEffect(() => {
    if (!tabTransition) return;
    const timer = window.setTimeout(() => {
      setTabTransition((current) => {
        if (!current || current.index >= current.fens.length - 1) return null;
        return { ...current, index: current.index + 1 };
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [tabTransition]);

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
    if (tab !== "lesson" || browsing || challengeLocked || finished || userTurn)
      return;
    const timer = setTimeout(() => {
      setStep((value) => value + 1);
      setHintShown(false);
    }, 380);
    return () => clearTimeout(timer);
  }, [tab, step, line.id, browsing, challengeLocked, finished, userTurn]);
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
        playBoardSound("error");
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
      queue: shuffleReviewLines(eligibleReviewLines),
      deadline: reviewOptions.timer ? Date.now() + remainingMs : 0,
      remainingMs,
    });
    setReviewFeedback("");
  }
  function leaveReview() {
    setReviewRun(EMPTY_REVIEW);
    setReviewFeedback("");
    setTab("lesson");
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
        playBoardSound("error");
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
      if (!event.shiftKey && key === "v") {
        event.preventDefault();
        onSettingsChange({ ...settings, showEvalBar: !settings.showEvalBar });
        return;
      }
      if (!event.shiftKey && key === "a") {
        event.preventDefault();
        setShowLearnArrows((value) => !value);
        return;
      }
      if (tab !== "lesson") {
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
      } else if (!event.shiftKey && key === "r" && !challengeLocked) {
        event.preventDefault();
        begin(line, mode);
      } else if (!event.shiftKey && key === "n") {
        if (
          mode === "learn" &&
          followingLine &&
          progress[line.id]?.learned &&
          isOpeningLineUnlocked(lines, progress, followingLine.id, "learn")
        ) {
          event.preventDefault();
          begin(followingLine, "learn");
        } else if (
          mode === "practice" &&
          followingLine &&
          nextPracticeUnlocked &&
          result &&
          perfectPractice
        ) {
          event.preventDefault();
          begin(followingLine, "practice");
        }
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
  const showingOverview = tab === "overview";
  const showingLines = tab === "lines";
  const showingVariation = showingLines && !!previewPosition;
  const reviewMoves = reviewPositions?.moves || [];
  const reviewExpected = reviewMoves[reviewRun.step];
  const reviewCanMove =
    reviewRun.status === "active" && reviewExpected?.color === opening.side;
  const reviewTotal = reviewLine?.moves.length || 0;
  const overviewTotal = overviewPosition.moves.length;
  const boardFen = tabTransition
    ? tabTransition.fens[tabTransition.index]
    : reviewing
    ? reviewPositions?.positions[reviewRun.step] || DEFAULT_POSITION
    : showingOverview
      ? overviewPosition.positions[overviewPly]
      : showingVariation && previewPosition
        ? previewPosition.positions[previewPosition.moves.length]
        : fen;
  const hasEvaluationTab = ["overview", "lines", "lesson", "review"].includes(
    tab,
  );
  const evaluationMatches = evaluation?.fen === boardFen;
  useEffect(() => {
    if (
      !settings.showEvalBar ||
      !hasEvaluationTab ||
      engineStatus !== "ready" ||
      !engine.current
    )
      return;
    let active = true;
    const instance = engine.current;
    const timer = window.setTimeout(() => {
      instance
        .analyze(boardFen, {
          ms: settings.analysisMs,
          multiPV: 1,
          depth: settings.engineDepth,
          onInfo: (value) => {
            if (active) setEvaluation(value);
          },
        })
        .then((value) => {
          if (active) setEvaluation(value);
        })
        .catch(() => {});
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
      instance.stop();
    };
  }, [
    boardFen,
    hasEvaluationTab,
    engineStatus,
    settings.showEvalBar,
    settings.analysisMs,
    settings.engineDepth,
    settings.engine,
    engine,
  ]);
  function replayOverview() {
    setTabTransition(null);
    setOverviewPly(0);
    setOverviewReplay((count) => count + 1);
    setTab("overview");
  }

  function openLesson() {
    if (
      tab === "overview" &&
      moveAnimations &&
      overviewPly > 0 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const fens = Array.from({ length: overviewPly }, (_, index) =>
        overviewPosition.positions[overviewPly - index - 1],
      );
      setTabTransition({ fens, index: 0 });
    } else {
      setTabTransition(null);
    }
    setTab("lesson");
  }

  return (
    <div className="page analysis-page opening-study-page">
      <div className="workspace-toolbar opening-study-heading">
        <div className="game-title-block">
          <Title as="strong">{opening.name}</Title>
          <span className="opening-repertoire">
            {t(opening.side === "w" ? "Repertoar putih" : "Repertoar hitam")} ·{" "}
            {lines.length} {t("variasi")}
          </span>
        </div>
      </div>
      <div className="analysis-grid opening-study-grid">
        <section className="board-section">
          <div className="board-and-eval">
            {settings.showEvalBar && (
              <EvalBar
                cp={evaluation?.cp}
                mate={evaluation?.mate}
                flipped={flipped}
                active={!!evaluation}
                pending={!!evaluation && !evaluationMatches}
              />
            )}
            <div className={`board-main${showingOverview || showingLines ? " is-variation" : ""}`}>
              <Board
                fen={boardFen}
                flipped={flipped}
                theme={settings.boardTheme}
                onMove={reviewing ? playReviewMove : playMove}
                lastMove={
                  reviewing
                    ? reviewMoves[reviewRun.step - 1]
                    : showingOverview
                      ? overviewPosition.moves[overviewPly - 1]
                      : showingVariation
                        ? previewPosition.moves[previewPosition.moves.length - 1]
                      : moves[visiblePly - 1]
                }
                disabled={
                  reviewing
                    ? !reviewCanMove
                    : showingOverview
                      ? true
                    : showingLines
                        ? true
                      : browsing || finished || challengeLocked || !userTurn
                }
                arrow={
                  tab === "lesson" &&
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
            ply={
              reviewing
                ? reviewRun.step
                : showingOverview
                  ? overviewPly
                  : showingVariation
                    ? previewPosition.moves.length
                  : visiblePly
            }
            total={
              reviewing
                ? reviewTotal
                : showingOverview
                  ? overviewTotal
                  : showingVariation
                    ? previewPosition.moves.length
                  : line.moves.length
            }
            navigationLimit={
              reviewing || showingOverview || showingLines || challengeLocked
                ? 0
                : visibleMoves.length
            }
            navigationDisabled={reviewing || showingOverview || showingLines}
            enableShortcuts={settings.enableShortcuts && tab === "lesson"}
            onChange={reviewing || showingOverview || showingLines ? () => {} : navigate}
            onFlip={() => setFlipped((value) => !value)}
            actions={
              tab === "lesson" ? (
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
              ) : undefined
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
                onClick={replayOverview}
              >
                {t("Ikhtisar")}
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
                id="opening-lesson-tab"
                aria-controls="opening-lesson-panel"
                aria-selected={tab === "lesson"}
                className={tab === "lesson" ? "active" : ""}
                onClick={openLesson}
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
                  <Title as="strong">{t("Panduan mode opening")}</Title>
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
                        "Tes acak dari line yang sudah dipelajari dan diselesaikan dengan Practice 100%. Setiap line muncul sekali per sesi. Nyawa dan timer bisa diaktifkan bersama atau terpisah.",
                      )}
                    </p>
                  </section>
                  <section>
                    <strong>{t("Materi opening")}</strong>
                    <p>
                      {t(
                        "Materi memakai jalur opening Lichess serta cabang latihan yang dikembangkan melalui analisis Stockfish. Setiap jalur diperiksa dari sisi pemain. Latihan mengikuti satu jalur; langkah lain juga bisa benar.",
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
                  <Title as="h2" title={t(line.name)}>{t(line.name)}</Title>
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
                  <Title as="h2">{t("Review opening")}</Title>
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
                  </div>
                </div>

                {reviewRun.status === "idle" ||
                reviewRun.status === "finished" ||
                reviewRun.status === "failed" ? (
                  <div className="opening-review-setup">
                    {reviewRun.status === "failed" && (
                      <div className="opening-review-outcome" role="status">
                        <strong>
                          {t(
                            reviewRun.failure === "timer"
                              ? "Waktu habis"
                              : "Batas kesalahan tercapai",
                          )}
                        </strong>
                      </div>
                    )}
                    <Title as="h3">{t("Mode tes")}</Title>
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
                          <Title as="h2" title={t(reviewLine.name)}>
                            {t(reviewLine.name)}
                          </Title>
                        </div>
                        {reviewFeedback && (
                          <div className="opening-coach retry" role="status">
                            <p>{t(reviewFeedback)}</p>
                          </div>
                        )}
                        <div className="opening-training-progress">
                          <span
                            style={{
                              width: `${(reviewRun.step / reviewTotal) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="notation-heading">
                          <Title as="span">{t("Notasi tes")}</Title>
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
                <div className="opening-variation-status" role="status">
                  <span>Learn: {learnedCount}/{lines.length}</span>
                  <span>Practice: {practicedCount}/{lines.length}</span>
                </div>
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
                    const practiceUnlocked = isOpeningLineUnlocked(
                      lines,
                      progress,
                      item.id,
                      "practice",
                    );
                    const selected = previewLineId === item.id;
                    const lockReason =
                      "Selesaikan Learn line sebelumnya terlebih dahulu.";
                    return (
                      <div
                        key={item.id}
                        className={`opening-variation-item${selected ? " active" : ""}`}
                      >
                        <button
                          className="opening-variation-select"
                          aria-pressed={selected}
                          title={t(item.name)}
                          onClick={() => setPreviewLineId(item.id)}
                        >
                          <span className="opening-variation-icon" aria-hidden="true">
                            {!unlocked ? (
                              <LockKeyhole size={16} />
                            ) : practiceComplete ? (
                              <CheckCheck size={16} />
                            ) : state?.learned ? (
                              <Check size={16} />
                            ) : null}
                          </span>
                          <span className="opening-variation-copy">
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
                          {!selected && <ChevronRightIcon />}
                        </button>
                        {selected ? (
                          <div className="opening-variation-actions">
                            <button
                              className="text-button review-action-button"
                              disabled={!unlocked}
                              title={!unlocked ? t(lockReason) : undefined}
                              onClick={() => {
                                openLine(item, "learn");
                                setTab("lesson");
                              }}
                            >
                              {t("Belajar")}
                            </button>
                            <button
                              className="text-button review-action-button"
                              disabled={!practiceUnlocked}
                              title={!practiceUnlocked ? t("Selesaikan Learn line ini terlebih dahulu.") : undefined}
                              onClick={() => {
                                openLine(item, "practice");
                                setTab("lesson");
                              }}
                            >
                              {t("Latihan")}
                            </button>
                          </div>
                        ) : null}
                      </div>
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
                    <Title as="h2">{t("Challenge terkunci")}</Title>
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
                    {!(result && !browsing) &&
                      (mode === "learn" ||
                        browsing ||
                        feedback ||
                        hintShown) && (
                        <div
                          className={`opening-coach${feedback ? " retry" : ""}`}
                          aria-live="polite"
                        >
                          {(mode === "learn" || browsing) && (
                            <span className="small-label">
                              {t(
                                browsing
                                  ? "Posisi pilihan"
                                  : userTurn
                                    ? "Giliranmu"
                                    : "Lawan melangkah",
                              )}
                            </span>
                          )}
                          {showAnswer && studyMove ? (
                            <Title as="h3">
                              {browsing
                                ? `${Math.ceil(visiblePly / 2)}${studyMove.color === "w" ? "." : "…"} `
                                : `${Math.ceil((step + 1) / 2)}${studyMove.color === "w" ? "." : "…"} `}
                              <NotationMove
                                san={studyMove.san}
                                color={studyMove.color}
                              />
                            </Title>
                          ) : mode === "learn" ? (
                            <Title as="h3">
                              {t(
                                opening.side === "w"
                                  ? "Mainkan langkah putih"
                                  : "Mainkan langkah hitam",
                              )}
                            </Title>
                          ) : null}
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
                      <Title as="span">{t("Notasi variasi")}</Title>
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
            {tab === "review" && (
              <div className="opening-action-dock opening-review-exit">
                <button className="button secondary" onClick={leaveReview}>
                  {t("Keluar review")}
                </button>
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
              {tab === "lesson" && <NavigationShortcutHint />}
              <span>
                <kbd>F</kbd> {t("Balik papan")}
              </span>
              {hasEvaluationTab && (
                <span>
                  <kbd>V</kbd> {t("Bar evaluasi")}
                </span>
              )}
              {tab === "lesson" && (
                <>
                  <span>
                    <kbd>A</kbd> {t("Panah")}
                  </span>
                  {!browsing && (
                    <span>
                      <kbd>R</kbd> {t("Ulangi variasi")}
                    </span>
                  )}
                  {followingLine && (
                    <span>
                      <kbd>N</kbd> {t("Variasi berikutnya")}
                    </span>
                  )}
                </>
              )}
              {tab === "lesson" && (
                <span>
                  <kbd>H</kbd> {t("Petunjuk")}
                </span>
              )}
              {tab === "lesson" && browsing && (
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
