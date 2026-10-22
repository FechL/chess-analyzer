import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Color } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownToLine,
  Bot as BotIcon,
  CircleHelp,
  Cpu,
  Flag,
  Lightbulb,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import Board, { EvalBar } from "../components/Board";
import EngineOptions from "../components/EngineOptions";
import { NotationLine } from "../components/Notation";
import {
  IconButton,
  Modal,
  MoveList,
  NavigationControls,
} from "../components/Common";
import {
  DashboardPopover,
  DashboardPopoverTrigger,
  DashboardPopoverContent,
} from "../components/block/dashboard-shell";
import { useEngine } from "../hooks/useEngine";
import { LocalEngine } from "../lib/engine";
import {
  annotate,
  downloadFile,
  formatEval,
  gameStatus,
  material,
  parseGame,
  pvToSan,
  readStorage,
  toPgn,
  writeStorage,
} from "../lib/chess";
import type { Evaluation, GameData, ReviewMove } from "../lib/chess";
import { mergePositionReview, retainReview } from "../lib/review";
import { findBookMove } from "../lib/opening-book";
import { pieceAsset } from "../lib/preferences";
import { appendPremove, executePremove } from "../lib/premove";
import {
  BOT_LEVELS,
  BOT_MODES,
  botPermissions,
  capturedBy,
  chooseBotMove,
  DEFAULT_BOT_OPTIONS,
  newBotSession,
  restoreBotSession,
  threatenedSquares,
  TIME_PRESETS,
  timeControlLabel,
} from "../lib/bot-game";
import type { BotOptions, BotSession, TimeControl } from "../lib/bot-game";
import type { Settings } from "../App";

const SESSION_KEY = "kuda-bot-session";
const OPTIONS_KEY = "kuda-bot-options";
function gameFromPgn(pgn: string) {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess;
}

export default function BotPage({
  settings,
  onReview,
}: {
  settings: Settings;
  analysisFen: string;
  onReview: (game: GameData) => void;
}) {
  const { t } = useI18n();
  const [session, setSession] = useState<BotSession>(() =>
    restoreBotSession(readStorage(SESSION_KEY, null)),
  );
  const latest = useRef(session);
  latest.current = session;
  const permissions = botPermissions(session.mode);
  const mode = BOT_MODES.find((item) => item.id === session.mode)!;
  const [options, setOptions] = useState<BotOptions>(() => ({
    ...DEFAULT_BOT_OPTIONS,
    ...readStorage<Partial<BotOptions>>(OPTIONS_KEY, {}),
  }));
  const [tab, setTab] = useState("game");
  const liveAssistance = permissions.engine && options.liveEngine;
  useEffect(() => {
    if (!permissions.engine) {
      setTab("game");
      setHint("");
      setHintArrow("");
    }
  }, [session.mode]);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState("");
  const [hintArrow, setHintArrow] = useState("");
  const [error, setError] = useState("");
  const [premoveMessage, setPremoveMessage] = useState("");
  const [advancedTime, setAdvancedTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("5");
  const [customIncrement, setCustomIncrement] = useState("");
  const [confirmResign, setConfirmResign] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [keyboardToast, setKeyboardToast] = useState<{
    key: string;
    label: string;
    enabled: boolean;
  }>();
  useEffect(() => {
    if (!keyboardToast) return;
    const timer = setTimeout(() => setKeyboardToast(undefined), 2200);
    return () => clearTimeout(timer);
  }, [keyboardToast]);
  const { engine, status, error: engineError } = useEngine();
  const request = useRef(0);
  const chess = useMemo(() => gameFromPgn(session.pgn), [session.pgn]);
  const history = useMemo(() => chess.history({ verbose: true }), [chess]);
  const fen = chess.fen();
  const human = session.human;
  const opponent: Color = human === "w" ? "b" : "w";
  const current = BOT_LEVELS[session.level];
  const ended = chess.isGameOver() || !!session.outcome;
  useEffect(() => {
    if (ended) setGameOverDismissed(false);
  }, [ended, chess.fen(), session.outcome]);
  const ply =
    session.viewPly === null
      ? history.length
      : Math.min(session.viewPly, history.length);
  const atLatest = ply === history.length;
  const visibleChess = useMemo(() => {
    const c = gameFromPgn(session.pgn);
    while (c.history().length > ply) c.undo();
    return c;
  }, [session.pgn, ply]);
  const visibleFen = visibleChess.fen();
  const visibleHistory = visibleChess.history({ verbose: true });
  const lastMove = visibleHistory.at(-1);
  const available = session.started && !ended && !session.paused && atLatest;
  const [evaluation, setEvaluation] = useState<Evaluation>();
  const [positionReviews, setPositionReviews] = useState<ReviewMove[]>([]);
  const assistance = useRef<LocalEngine | undefined>(undefined);
  const [assistanceReady, setAssistanceReady] = useState(false);
  const evaluationCache = useRef(new Map<string, Evaluation>());
  const reviewGeneration = useRef(0);
  const queuedAnalyses = useRef(new Set<string>());
  const analysisQueue = useRef<Promise<void>>(Promise.resolve());
  const validEvaluation =
    evaluation?.fen === visibleFen ? evaluation : undefined;
  const currentRating = retainReview(positionReviews, visibleHistory).find(
    (item) => item.ply === ply,
  );
  const currentBook =
    lastMove &&
    findBookMove(
      lastMove.before,
      lastMove.from + lastMove.to + (lastMove.promotion || ""),
    );
  const threats = useMemo(
    () =>
      permissions.engine && options.showThreats
        ? threatenedSquares(visibleChess, human)
        : [],
    [visibleChess, human, options.showThreats, permissions.engine],
  );

  function currentVisibleFen() {
    const activeChess = gameFromPgn(latest.current.pgn);
    const activePly = latest.current.viewPly;
    if (activePly !== null)
      while (activeChess.history().length > activePly) activeChess.undo();
    return activeChess.fen();
  }

  useEffect(() => {
    writeStorage(OPTIONS_KEY, options);
  }, [options]);
  useEffect(() => {
    const persist = () => {
      const value = latest.current;
      writeStorage(SESSION_KEY, {
        ...value,
        paused: value.started ? true : value.paused,
      });
    };
    const interval = setInterval(persist, 1000);
    window.addEventListener("beforeunload", persist);
    const hidden = () => {
      if (document.hidden) {
        request.current++;
        engine.current?.stop();
        setSession((value) => ({
          ...value,
          paused: value.started ? true : value.paused,
        }));
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearInterval(interval);
      persist();
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  function stopWork() {
    request.current++;
    engine.current?.stop();
    setThinking(false);
    setHint("");
    setHintArrow("");
  }
  function cancelPremoves() {
    setSession((value) => ({ ...value, premoves: [] }));
    setPremoveMessage("");
  }
  function commitTurn(next: Chess, color: Color, premove = false) {
    setSession((value) => ({
      ...value,
      pgn: next.pgn(),
      viewPly: null,
      clocks: {
        ...value.clocks,
        [color]:
          Math.max(0, value.clocks[color] - (premove ? 0.1 : 0)) +
          value.control.increment,
      },
      premoves: next.isGameOver()
        ? []
        : premove
          ? value.premoves.slice(1)
          : value.premoves,
    }));
    setHint("");
    setHintArrow("");
  }
  useEffect(() => {
    if (
      !available ||
      chess.turn() === human ||
      status !== "ready" ||
      !engine.current
    )
      return;
    const id = ++request.current;
    const instance = engine.current;
    setThinking(true);
    setError("");
    const timer = setTimeout(() => {
      instance
        .analyze(fen, { ms: current.ms, skill: current.skill })
        .then((result) => {
          if (
            id !== request.current ||
            latest.current.paused ||
            latest.current.clocks[opponent] <= 0 ||
            latest.current.pgn !== session.pgn
          )
            return;
          const next = gameFromPgn(session.pgn);
          const move = chooseBotMove(next, result.bestmove, session.level);
          if (move) {
            next.move({
              from: move.slice(0, 2),
              to: move.slice(2, 4),
              promotion: move[4],
            });
            commitTurn(next, opponent);
          }
          setThinking(false);
        })
        .catch((cause) => {
          if (id === request.current) {
            setError((cause as Error).message);
            setThinking(false);
          }
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      request.current++;
      instance.stop();
      setThinking(false);
    };
  }, [fen, available, human, status, session.level]);
  useEffect(() => {
    if (
      !available ||
      thinking ||
      chess.turn() !== human ||
      !session.premoves.length
    )
      return;
    const timer = setTimeout(() => {
      if (!latest.current.premoves.length || latest.current.paused) return;
      if (latest.current.clocks[human] <= 0.1) {
        setSession((value) => ({
          ...value,
          clocks: { ...value.clocks, [human]: 0 },
          premoves: [],
        }));
        return;
      }
      const next = gameFromPgn(session.pgn);
      if (!executePremove(next, latest.current.premoves[0], human)) {
        cancelPremoves();
        setPremoveMessage("Premove dibatalkan: langkah tidak lagi legal.");
        return;
      }
      commitTurn(next, human, true);
    }, 40);
    return () => clearTimeout(timer);
  }, [fen, available, thinking, human, session.premoves.length]);
  useEffect(() => {
    if (!session.started || session.paused || ended) return;
    const turn = chess.turn();
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - last) / 1000;
      last = now;
      setSession((value) => ({
        ...value,
        clocks: {
          ...value.clocks,
          [turn]: Math.max(0, value.clocks[turn] - elapsed),
        },
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [fen, session.started, session.paused, ended]);
  useEffect(() => {
    if (
      !session.started ||
      ended ||
      (session.clocks.w > 0 && session.clocks.b > 0)
    )
      return;
    stopWork();
    setSession((value) => ({
      ...value,
      outcome: value.clocks.w <= 0 ? "timeout-w" : "timeout-b",
      paused: true,
      premoves: [],
    }));
  }, [session.clocks, session.started, ended]);

  useEffect(() => {
    if (!liveAssistance) {
      setAssistanceReady(false);
      return;
    }
    let active = true;
    evaluationCache.current.clear();
    setEvaluation(undefined);
    const instance = new LocalEngine(options.engine);
    assistance.current = instance;
    instance.ready
      .then(() => {
        if (active) setAssistanceReady(true);
      })
      .catch((cause) => {
        if (active) setError((cause as Error).message);
      });
    return () => {
      active = false;
      assistance.current = undefined;
      setAssistanceReady(false);
      instance.destroy();
    };
  }, [liveAssistance, options.engine]);
  useEffect(() => {
    if (!liveAssistance || !assistanceReady || !assistance.current) return;
    const instance = assistance.current;
    const generation = reviewGeneration.current;
    const key = `${generation}:${visibleFen}:${options.analysisMs}:${options.engineDepth}:${options.multiPV}:${options.engine}`;
    if (queuedAnalyses.current.has(key)) return;
    queuedAnalyses.current.add(key);
    const analyzePosition = async () => {
      try {
        if (assistance.current !== instance) return;
        let before = lastMove
          ? evaluationCache.current.get(lastMove.before)
          : undefined;
        if (lastMove && !before) {
          before = await instance.analyze(lastMove.before, { ms: 250 });
          if (
            assistance.current !== instance ||
            reviewGeneration.current !== generation
          )
            return;
          evaluationCache.current.set(before.fen, before);
        }
        const result = await instance.analyze(visibleFen, {
          ms: options.analysisMs,
          multiPV: options.multiPV,
          depth: options.engineDepth,
          onInfo: (value) => {
            if (
              assistance.current === instance &&
              reviewGeneration.current === generation &&
              value.fen === currentVisibleFen() &&
              (value.depth >= 8 || value.mate !== undefined)
            )
              setEvaluation(value);
          },
        });
        if (
          assistance.current !== instance ||
          reviewGeneration.current !== generation
        )
          return;
        if (result.fen === currentVisibleFen()) setEvaluation(result);
        evaluationCache.current.set(result.fen, result);
        if (evaluationCache.current.size > 256)
          evaluationCache.current.delete(
            evaluationCache.current.keys().next().value!,
          );
        if (before && lastMove)
          setPositionReviews((items) =>
            mergePositionReview(items, annotate(before, result, lastMove, ply)),
          );
      } catch (cause) {
        if (
          assistance.current === instance &&
          reviewGeneration.current === generation
        )
          setError((cause as Error).message);
      } finally {
        queuedAnalyses.current.delete(key);
      }
    };
    analysisQueue.current = analysisQueue.current
      .then(analyzePosition, analyzePosition)
      .catch(() => {});
  }, [
    visibleFen,
    liveAssistance,
    assistanceReady,
    options.analysisMs,
    options.engineDepth,
    options.multiPV,
    options.engine,
  ]);

  function start(restart = false) {
    stopWork();
    reviewGeneration.current++;
    setGameOverDismissed(false);
    setError("");
    setPremoveMessage("");
    setPositionReviews([]);
    const color: Color = restart
      ? session.human
      : session.side === "random"
        ? Math.random() < 0.5
          ? "w"
          : "b"
        : session.side;
    setSession((value) => ({
      ...newBotSession(),
      mode: value.mode,
      level: value.level,
      side: value.side,
      control: value.control,
      human: color,
      flipped: color === "b",
      started: true,
      clocks: { w: value.control.seconds, b: value.control.seconds },
    }));
  }
  function resetToSetup() {
    stopWork();
    reviewGeneration.current++;
    setGameOverDismissed(false);
    setPositionReviews([]);
    setPremoveMessage("");
    setError("");
    setSession((value) => ({
      ...newBotSession(),
      level: value.level,
      mode: value.mode,
      side: value.side,
      human: value.human,
      flipped: value.flipped,
      control: value.control,
      clocks: { w: value.control.seconds, b: value.control.seconds },
    }));
    setTab("game");
  }
  function move(from: string, to: string, promotion = "q") {
    if (
      !available ||
      chess.turn() !== human ||
      thinking ||
      latest.current.clocks[human] <= 0
    )
      return false;
    try {
      const next = gameFromPgn(session.pgn);
      next.move({ from, to, promotion });
      stopWork();
      commitTurn(next, human);
      setPremoveMessage("");
      return true;
    } catch {
      return false;
    }
  }
  function queuePremove(from: string, to: string, promotion = "q") {
    const value = latest.current;
    if (!available || (chess.turn() === human && !value.premoves.length))
      return false;
    const queue = appendPremove(
      fen,
      value.premoves,
      human,
      from,
      to,
      promotion,
    );
    if (!queue) return false;
    latest.current = { ...value, premoves: queue };
    setSession((current) => ({ ...current, premoves: queue }));
    setPremoveMessage("");
    return true;
  }
  function undo() {
    if (!permissions.undo || !session.started) return;
    stopWork();
    const next = gameFromPgn(session.pgn);
    next.undo();
    if (next.turn() !== human) next.undo();
    setSession((value) => ({
      ...value,
      pgn: next.pgn(),
      premoves: [],
      viewPly: null,
      outcome: "",
      paused: next.turn() !== human,
    }));
    setPremoveMessage("");
  }
  function navigate(nextPly: number) {
    stopWork();
    setSession((value) => ({
      ...value,
      viewPly: nextPly >= history.length ? null : Math.max(0, nextPly),
      paused: nextPly < history.length && value.started ? true : value.paused,
      premoves: [],
    }));
  }
  function pause() {
    stopWork();
    setSession((value) => ({ ...value, paused: !value.paused, viewPly: null }));
  }
  async function getHint() {
    if (
      !permissions.hint ||
      !session.started ||
      ended ||
      !atLatest ||
      chess.turn() !== human ||
      !engine.current ||
      status !== "ready"
    )
      return;
    const id = request.current;
    setHint("Mencari ide…");
    try {
      const result = await engine.current.analyze(fen, { ms: 600, skill: 20 });
      if (
        id !== request.current ||
        latest.current.pgn !== session.pgn ||
        latest.current.viewPly !== null
      )
        return;
      setHint(
        "Stockfish menyarankan " + (pvToSan(fen, [result.bestmove])[0] || "—"),
      );
      setHintArrow(result.bestmove);
    } catch (cause) {
      if (id === request.current) setError((cause as Error).message);
    }
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        !settings.enableShortcuts ||
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
          (event.target.isContentEditable ||
            event.target.closest("input, textarea, select, [contenteditable]")))
      )
        return;
      if (event.key.toLowerCase() === "h" && !event.shiftKey) {
        event.preventDefault();
        void getHint();
      } else if (
        event.key.toLowerCase() === "u" &&
        !event.shiftKey &&
        permissions.undo
      ) {
        event.preventDefault();
        undo();
      } else if (event.key.toLowerCase() === "p" && !event.shiftKey) {
        if (session.started && !ended) {
          event.preventDefault();
          pause();
        }
      } else if (
        ["e", "a", "c", "t"].includes(event.key.toLowerCase()) &&
        !event.shiftKey &&
        permissions.engine
      ) {
        const key = event.key.toLowerCase();
        const toggle = {
          e: ["liveEngine", "Live engine"],
          a: ["showArrows", "Tampilkan panah engine"],
          c: ["showCategories", "Tampilkan kategori pada buah"],
          t: ["showThreats", "Tandai petak ancaman lawan"],
        } as const;
        const [setting, label] = toggle[key as keyof typeof toggle];
        event.preventDefault();
        const enabled = !options[setting];
        setOptions((value) => ({ ...value, [setting]: enabled }));
        if (key !== "t")
          setKeyboardToast({ key: key.toUpperCase(), label, enabled });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(event.shiftKey ? 0 : Math.max(0, ply - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(
          event.shiftKey ? history.length : Math.min(history.length, ply + 1),
        );
      } else if (event.key.toLowerCase() === "f" && !event.shiftKey)
        setSession((value) => ({ ...value, flipped: !value.flipped }));
      else if (event.key === "Escape") cancelPremoves();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  function exportGame() {
    const game = parseGame(chess.pgn());
    game.white = human === "w" ? t("Anda") : current.name;
    game.black = human === "b" ? t("Anda") : current.name;
    if (human === "w") game.blackElo = String(current.elo);
    else game.whiteElo = String(current.elo);
    game.event = `Latihan vs ${current.name}`;
    game.timeControl = `${session.control.seconds}+${session.control.increment}`;
    if (session.outcome === "resigned")
      game.result = human === "w" ? "0-1" : "1-0";
    else if (session.outcome.startsWith("timeout"))
      game.result = session.outcome === "timeout-w" ? "0-1" : "1-0";
    return game;
  }
  function review() {
    onReview(exportGame());
  }
  function clock(color: Color) {
    const seconds = Math.max(0, Math.ceil(session.clocks[color]));
    return (
      <time
        aria-label={t(color === "w" ? "Sisa waktu putih" : "Sisa waktu hitam")}
        className={`chess-clock ${available && chess.turn() === color ? "clock-active" : ""}`}
      >
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </time>
    );
  }
  function captures(color: Color) {
    const pieces = capturedBy(visibleChess, color);
    const advantage = material(visibleFen) * (color === "w" ? 1 : -1);
    return (
      <div className="bot-captures" aria-label={t("Buah dimakan")}>
        {pieces.map((piece, i) => (
          <img
            key={i}
            src={pieceAsset(
              color === "w" ? "b" : "w",
              piece,
              settings.pieceTheme,
            )}
            alt=""
          />
        ))}
        {advantage > 0 && (
          <strong title={t("Keunggulan material")}>+{advantage}</strong>
        )}
      </div>
    );
  }
  const canHint =
    permissions.hint &&
    session.started &&
    !ended &&
    atLatest &&
    chess.turn() === human &&
    status === "ready";
  const statusText =
    session.outcome === "resigned"
      ? t("Anda menyerah.")
      : session.outcome === "timeout-w"
        ? t("Waktu putih habis.")
        : session.outcome === "timeout-b"
          ? t("Waktu hitam habis.")
          : chess.isCheckmate()
            ? t(
                chess.turn() === "w"
                  ? "Skakmat. Hitam menang!"
                  : "Skakmat. Putih menang!",
              )
            : session.paused && !ended
              ? t("Permainan dijeda")
              : t(gameStatus(chess));
  return (
    <div className="page bot-page">
      <div className="analysis-grid bot-workspace">
        <div className="bot-player-header">
          <div className="bot-player human-player">
            {clock(human)}
            <div>
              <strong>
                {t("Anda")}{" "}
                <small>({t(human === "w" ? "Putih" : "Hitam")})</small>
              </strong>
              <div className="bot-player-meta">
                <span>{t(mode.label)}</span>
                {captures(human)}
              </div>
            </div>
          </div>
          <div className="bot-player opponent-player">
            <div>
              <strong>
                {current.name} <small>(≈{current.elo} Elo)</small>
              </strong>
              <div className="bot-player-meta opponent-player-meta">
                {captures(opponent)}
                <span>{t(current.title)}</span>
              </div>
            </div>
            {clock(opponent)}
          </div>
        </div>
        <section className="board-section bot-board-area">
          <div className="board-and-eval">
            {options.showEvalBar && (
              <EvalBar
                cp={evaluation?.cp}
                mate={evaluation?.mate}
                active={!!evaluation}
                pending={!!evaluation && !validEvaluation}
                flipped={session.flipped}
              />
            )}
            <div
              className={`board-main bot-position-board${!session.started || ended || session.paused ? " is-variation" : ""}`}
            >
              <Board
                fen={visibleFen}
                flipped={session.flipped}
                theme={settings.boardTheme}
                onMove={move}
                lastMove={lastMove}
                disabled={!available}
                premove={
                  session.started && !ended && atLatest
                    ? {
                        color: human,
                        moves: session.premoves,
                        onQueue: queuePremove,
                        onCancel: cancelPremoves,
                      }
                    : undefined
                }
                arrow={
                  hintArrow ||
                  (liveAssistance && options.showArrows
                    ? validEvaluation?.lines.map((line) => line.pv[0])
                    : undefined)
                }
                annotation={
                  permissions.engine && options.showCategories
                    ? currentBook
                      ? "book"
                      : currentRating?.annotation
                    : undefined
                }
                threatSquares={threats}
              />
              {ended && !gameOverDismissed && (
                <div
                  className="bot-game-over-overlay"
                  role="status"
                  onClick={() => setGameOverDismissed(true)}
                >
                  <div className="bot-game-over-card">{statusText}</div>
                </div>
              )}
            </div>
          </div>
          <NavigationControls
            ply={ply}
            total={history.length}
            onChange={navigate}
            onFlip={() =>
              setSession((value) => ({ ...value, flipped: !value.flipped }))
            }
            enableShortcuts={settings.enableShortcuts}
            actions={
              <>
                <IconButton
                  label={t("Ulang langkah")}
                  onClick={undo}
                  disabled={
                    !session.started ||
                    !permissions.undo ||
                    !history.some((move) => move.color === human)
                  }
                >
                  <Undo2 size={16} />
                </IconButton>
                <IconButton
                  label={t("Petunjuk")}
                  shortcut={
                    settings.enableShortcuts && permissions.hint
                      ? "H"
                      : undefined
                  }
                  onClick={() => void getHint()}
                  disabled={!canHint}
                >
                  <Lightbulb size={16} />
                </IconButton>
              </>
            }
          />
        </section>
        <div className="board-under bot-board-under">
          {settings.enableShortcuts && (
            <>
              <div
                className="board-shortcut-hints"
                role="group"
                aria-label={t("Pintasan permainan")}
              >
                <span>{t("← → Navigasi")}</span>
                <span>
                  <kbd>F</kbd> {t("Balik papan")}
                </span>
                <span>
                  <kbd>P</kbd> {t("Jeda")}
                </span>
                {permissions.hint && (
                  <span>
                    <kbd>H</kbd> {t("Petunjuk")}
                  </span>
                )}
                {permissions.undo && (
                  <span>
                    <kbd>U</kbd> {t("Undo")}
                  </span>
                )}
                {permissions.engine && (
                  <>
                    <span>
                      <kbd>E</kbd> {t("Engine")}
                    </span>
                    <span>
                      <kbd>A</kbd> {t("Panah")}
                    </span>
                    <span>
                      <kbd>C</kbd> {t("Kategori langkah")}
                    </span>
                    <span>
                      <kbd>T</kbd> {t("Ancaman")}
                    </span>
                  </>
                )}
              </div>
              <DashboardPopover>
                <DashboardPopoverTrigger asChild>
                  <button
                    className="icon-button shortcut-help-button"
                    aria-label={t("Pintasan lainnya")}
                    title={t("Pintasan lainnya")}
                  >
                    <CircleHelp size={16} aria-hidden="true" />
                  </button>
                </DashboardPopoverTrigger>
                <DashboardPopoverContent
                  className="shortcut-help-popover"
                  align="end"
                  side="top"
                  aria-label={t("Pintasan lainnya")}
                >
                  <strong>{t("Pintasan lainnya")}</strong>
                  <dl>
                    {[
                      ["Shift+←", "Ke posisi awal"],
                      ["Shift+→", "Ke posisi terakhir"],
                      ["Esc", "Batalkan premove"],
                      ...(permissions.engine
                        ? ([
                            ["E", "Engine"],
                            ["A", "Panah"],
                            ["C", "Kategori langkah"],
                            ["T", "Ancaman"],
                          ] as const)
                        : []),
                    ].map(([key, label]) => (
                      <div key={key}>
                        <dt>
                          <kbd>{key}</kbd>
                        </dt>
                        <dd>{t(label)}</dd>
                      </div>
                    ))}
                  </dl>
                </DashboardPopoverContent>
              </DashboardPopover>
            </>
          )}
          {session.premoves.length > 0 && !ended && (
            <div className="bot-premove-panel">
              <div className="premove-heading">
                <button className="text-button" onClick={cancelPremoves}>
                  <X size={13} />
                  {t("Batalkan premove")}
                </button>
              </div>
              <div
                className="premove-queue"
                role="group"
                aria-label={t("Antrean premove")}
              >
                {session.premoves.map((move, i) => (
                  <button
                    key={i}
                    title={t("Batalkan mulai langkah ini")}
                    onClick={() =>
                      setSession((value) => ({
                        ...value,
                        premoves: value.premoves.slice(0, i),
                      }))
                    }
                  >
                    <strong>{i + 1}.</strong> {move.from}→{move.to}
                    {move.promotion?.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
          {premoveMessage && (
            <p className="bot-premove-message" role="status">
              {t(premoveMessage)}
            </p>
          )}
          {hint && (
            <div className="hint-box" role="status">
              <Lightbulb size={16} />
              {t(hint)}
            </div>
          )}
        </div>
        <div className="analysis-sidebar bot-sidebar">
          <aside className="analysis-panel bot-side-panel">
            <div className="panel-tabs">
              <button
                className={tab === "game" ? "active" : ""}
                onClick={() => setTab("game")}
              >
                {t("Permainan")}
              </button>
              <button
                disabled={!permissions.engine}
                title={
                  !permissions.engine
                    ? t("Tersedia dalam mode bantuan penuh")
                    : undefined
                }
                className={tab === "engine" ? "active" : ""}
                onClick={() => setTab("engine")}
              >
                {t("Engine")}
              </button>
              <button
                className={tab === "options" ? "active" : ""}
                disabled={!permissions.engine}
                title={
                  !permissions.engine
                    ? t("Tersedia dalam mode bantuan penuh")
                    : undefined
                }
                onClick={() => setTab("options")}
              >
                {t("Opsi")}
              </button>
            </div>
            {tab === "game" ? (
              <div className="bot-game-panel">
                {!session.started && (
                  <>
                    <div className="bot-setup-heading">
                      <BotIcon size={25} />
                      <h2>{t("Vs Bot")}</h2>
                    </div>
                    <div className="config-group">
                      <label>{t("Pilih tantangan")}</label>
                      <div className="bot-challenges">
                        {BOT_LEVELS.map((level, i) => (
                          <button
                            key={level.name}
                            className={session.level === i ? "active" : ""}
                            disabled={session.started && !ended}
                            onClick={() =>
                              setSession((value) => ({ ...value, level: i }))
                            }
                          >
                            <strong>
                              {level.name}
                              <span>≈{level.elo} Elo</span>
                            </strong>
                            <small>
                              {t(level.description).replace(/^≈\d+ Elo · /, "")}
                            </small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="config-group">
                      <label>{t("Main sebagai")}</label>
                      <div className="segmented bot-color-choices">
                        {(["w", "random", "b"] as const).map((color) => (
                          <button
                            key={color}
                            disabled={session.started && !ended}
                            className={session.side === color ? "active" : ""}
                            onClick={() =>
                              setSession((value) => ({ ...value, side: color }))
                            }
                          >
                            <span
                              className={`bot-color-icon color-${color}`}
                              aria-hidden="true"
                            >
                              <img
                                src={pieceAsset(
                                  color === "b" ? "b" : "w",
                                  "k",
                                  settings.pieceTheme,
                                )}
                                alt=""
                              />
                              {color === "random" && (
                                <img
                                  className="split-king"
                                  src={pieceAsset(
                                    "b",
                                    "k",
                                    settings.pieceTheme,
                                  )}
                                  alt=""
                                />
                              )}
                            </span>
                            {t(
                              color === "w"
                                ? "Putih"
                                : color === "b"
                                  ? "Hitam"
                                  : "Acak",
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="config-group">
                      <label>{t("Waktu permainan")}</label>
                      <div className="bot-time-choices">
                        {[180, 300, 600].map((seconds) => (
                          <button
                            key={seconds}
                            disabled={session.started && !ended}
                            className={
                              session.control.seconds === seconds &&
                              !session.control.increment
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              setSession((value) => ({
                                ...value,
                                control: { seconds, increment: 0 },
                                clocks: { w: seconds, b: seconds },
                              }))
                            }
                          >
                            {seconds / 60}m
                          </button>
                        ))}
                        <button
                          disabled={session.started && !ended}
                          className={
                            ![180, 300, 600].includes(
                              session.control.seconds,
                            ) || session.control.increment
                              ? "active"
                              : ""
                          }
                          onClick={() => {
                            setCustomMinutes(
                              String(session.control.seconds / 60),
                            );
                            setCustomIncrement(
                              session.control.increment
                                ? String(session.control.increment)
                                : "",
                            );
                            setAdvancedTime(true);
                          }}
                        >
                          {t("Lanjutan")}
                          {session.control.seconds > 0 &&
                            (![180, 300, 600].includes(
                              session.control.seconds,
                            ) ||
                              session.control.increment > 0) &&
                            ` (${timeControlLabel(session.control)})`}
                        </button>
                      </div>
                    </div>
                    <div className="config-group bot-mode-group">
                      <div className="bot-mode-label-row">
                        <label>{t("Mode")}</label>
                        <DashboardPopover>
                          <DashboardPopoverTrigger asChild>
                            <button
                              className="icon-button bot-mode-help"
                              aria-label={t("Penjelasan mode bantuan")}
                              title={t("Penjelasan mode bantuan")}
                            >
                              <CircleHelp size={15} />
                            </button>
                          </DashboardPopoverTrigger>
                          <DashboardPopoverContent
                            className="shortcut-help-popover bot-mode-popover"
                            align="end"
                            side="top"
                            aria-label={t("Penjelasan mode bantuan")}
                          >
                            <strong>{t("Mode bantuan")}</strong>
                            <dl>
                              {BOT_MODES.map((item) => (
                                <div key={item.id}>
                                  <dt>{t(item.label)}</dt>
                                  <dd>{t(item.description)}</dd>
                                </div>
                              ))}
                            </dl>
                          </DashboardPopoverContent>
                        </DashboardPopover>
                      </div>
                      <div
                        className="segmented bot-mode-choices"
                        role="group"
                        aria-label={t("Mode bantuan")}
                      >
                        {BOT_MODES.map((item) => (
                          <button
                            key={item.id}
                            aria-pressed={session.mode === item.id}
                            className={session.mode === item.id ? "active" : ""}
                            onClick={() =>
                              setSession((value) => ({
                                ...value,
                                mode: item.id,
                              }))
                            }
                          >
                            {t(item.label)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="bot-game-actions">
                  <button
                    className="button primary full"
                    disabled={status !== "ready"}
                    onClick={() => (session.started ? start(true) : start())}
                  >
                    {status === "loading" ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : session.started ? (
                      <RotateCcw size={15} />
                    ) : (
                      <Play size={15} />
                    )}
                    {t(
                      status === "loading"
                        ? "Menyiapkan Stockfish…"
                        : session.started
                          ? "Mulai ulang permainan"
                          : "Mulai permainan",
                    )}
                  </button>
                  {session.started && (
                    <div>
                      {ended ? (
                        <button className="button secondary" onClick={review}>
                          <ArrowRight size={14} />
                          {t("Ulas permainan")}
                        </button>
                      ) : (
                        <button className="button secondary" onClick={pause}>
                          {session.paused ? (
                            <Play size={14} />
                          ) : (
                            <Pause size={14} />
                          )}
                          {t(session.paused ? "Lanjutkan" : "Jeda")}
                        </button>
                      )}
                      {!ended && history.length >= 2 && (
                        <button
                          className="button subtle"
                          disabled={ended}
                          onClick={() => setConfirmResign(true)}
                        >
                          <Flag size={14} />
                          {t("Menyerah")}
                        </button>
                      )}
                      {(ended || history.length < 2) && (
                        <button
                          className="button secondary bot-back-to-menu"
                          onClick={resetToSetup}
                        >
                          <ArrowLeft size={14} />
                          {t("Kembali ke menu")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {(error || engineError) && (
                  <div className="error-message" role="alert">
                    {t(error || engineError)}
                  </div>
                )}
                {session.started && (
                  <div className="bot-notation">
                    <div className="notation-heading">
                      <span>{t("Notasi permainan")}</span>
                      <button
                        className="text-button"
                        onClick={review}
                        disabled={!history.length}
                      >
                        {t("Analisis")} <ArrowRight size={12} />
                      </button>
                    </div>
                    <MoveList
                      moves={history.map((move) => move.san)}
                      ply={ply}
                      onChange={navigate}
                      review={
                        permissions.engine
                          ? retainReview(positionReviews, history)
                          : []
                      }
                      startFen={history[0]?.before || new Chess().fen()}
                    />
                  </div>
                )}
              </div>
            ) : tab === "engine" && permissions.engine ? (
              <>
                <div className="engine-status">
                  <div className="engine-chip">
                    <Cpu size={15} />
                    <strong>Stockfish 19</strong>
                    <span>{options.engine}</span>
                  </div>
                  <button
                    className="text-button engine-settings-link"
                    onClick={() => setTab("options")}
                  >
                    {t("Ganti engine")} <ArrowRight size={13} />
                  </button>
                </div>
                {error && (
                  <div className="error-message" role="alert">
                    {t(error)}
                  </div>
                )}
                <div className="engine-details bot-engine-details">
                  <div className="line-heading">
                    <h3>{t("Variasi terbaik")}</h3>
                  </div>
                  {validEvaluation?.lines.length && liveAssistance ? (
                    validEvaluation.lines.map((line, i) => (
                      <button
                        className="engine-line"
                        key={i}
                        disabled={!canHint}
                        onClick={() => {
                          const uci = line.pv[0];
                          if (uci)
                            move(uci.slice(0, 2), uci.slice(2, 4), uci[4]);
                        }}
                      >
                        <span className="line-index">{i + 1}</span>
                        <div>
                          <div className="engine-line-meta">
                            <strong>{formatEval(line.cp, line.mate)}</strong>
                            <span className="variation-depth">
                              depth {line.depth}
                            </span>
                          </div>
                          <p>
                            <NotationLine
                              moves={pvToSan(visibleFen, line.pv, 8)}
                              turn={visibleChess.turn()}
                            />
                          </p>
                        </div>
                        <ArrowRight size={15} />
                      </button>
                    ))
                  ) : (
                    <div className="empty-inline">
                      {t(
                        !liveAssistance
                          ? "Aktifkan live engine di tab Opsi untuk menganalisis posisi."
                          : visibleChess.isGameOver()
                            ? gameStatus(visibleChess)
                            : "Engine sedang menyiapkan variasi…",
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : permissions.engine ? (
              <div className="bot-options">
                <EngineOptions
                  value={{
                    ...options,
                    showPieceAnnotation: options.showCategories,
                  }}
                  onChange={({ showPieceAnnotation, ...value }) =>
                    setOptions((current) => ({
                      ...current,
                      ...value,
                      showCategories: showPieceAnnotation,
                    }))
                  }
                  shortcuts
                />
                <div className="settings-section">
                  <label className="board-sound-setting">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={options.showEvalBar}
                      onChange={(event) =>
                        setOptions((value) => ({
                          ...value,
                          showEvalBar: event.target.checked,
                        }))
                      }
                    />
                    {t("Tampilkan bar evaluasi")}
                  </label>
                </div>
                <div className="settings-section">
                  <label className="board-sound-setting">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={options.showThreats}
                      aria-keyshortcuts={
                        settings.enableShortcuts ? "T" : undefined
                      }
                      title={
                        settings.enableShortcuts
                          ? t("Tandai petak ancaman lawan") + " (T)"
                          : undefined
                      }
                      onChange={(event) =>
                        setOptions((value) => ({
                          ...value,
                          showThreats: event.target.checked,
                        }))
                      }
                    />
                    {t("Tandai petak ancaman lawan")}
                  </label>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
        <div className="export-actions board-export-actions analysis-export-actions bot-export-actions">
          <button
            className="text-button"
            onClick={() => downloadFile("kuda-bot-position.fen", visibleFen)}
          >
            {t("Ekspor FEN")} <ArrowDownToLine size={13} />
          </button>
          <button
            className="text-button"
            onClick={() =>
              downloadFile("kuda-bot-game.pgn", toPgn(exportGame()))
            }
          >
            {t("Ekspor PGN")} <ArrowDownToLine size={13} />
          </button>
        </div>
      </div>
      {advancedTime && (
        <Modal
          title={t("Waktu lanjutan")}
          onClose={() => setAdvancedTime(false)}
        >
          <div className="time-preset-groups">
            {Object.entries(TIME_PRESETS).map(([name, controls]) => (
              <section key={name}>
                <strong>{name}</strong>
                <div>
                  {controls.map((control) => (
                    <button
                      className="button secondary"
                      key={timeControlLabel(control)}
                      onClick={() => {
                        setSession((value) => ({
                          ...value,
                          control,
                          clocks: { w: control.seconds, b: control.seconds },
                        }));
                        setAdvancedTime(false);
                      }}
                    >
                      {timeControlLabel(control)}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <h3>{t("Kustom")}</h3>
          <div className="custom-time-inputs">
            <label>
              {t("Menit per pemain")}
              <input
                type="number"
                min="0.25"
                max="180"
                step="0.25"
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value)}
              />
            </label>
            <label>
              {t("Tambahan detik per langkah")}
              <input
                type="number"
                min="0"
                max="60"
                step="1"
                value={customIncrement}
                onChange={(event) => setCustomIncrement(event.target.value)}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={
                !Number.isFinite(Number(customMinutes)) ||
                Number(customMinutes) < 0.25 ||
                Number(customMinutes) > 180 ||
                !Number.isFinite(Number(customIncrement)) ||
                Number(customIncrement) < 0 ||
                Number(customIncrement) > 60
              }
              onClick={() => {
                const control: TimeControl = {
                  seconds: Number(customMinutes) * 60,
                  increment: Number(customIncrement),
                };
                setSession((value) => ({
                  ...value,
                  control,
                  clocks: { w: control.seconds, b: control.seconds },
                }));
                setAdvancedTime(false);
              }}
            >
              {t("Gunakan waktu ini")}
            </button>
          </div>
        </Modal>
      )}
      {confirmResign && (
        <Modal
          title={t("Akhiri permainan ini?")}
          onClose={() => setConfirmResign(false)}
        >
          <p className="modal-description">
            {t(
              "Anda dapat langsung mengulas permainan dan belajar dari posisi yang terlewat.",
            )}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setConfirmResign(false)}
            >
              {t("Lanjut bermain")}
            </button>
            <button
              className="button primary"
              onClick={() => {
                stopWork();
                setSession((value) => ({
                  ...value,
                  outcome: "resigned",
                  paused: true,
                  premoves: [],
                }));
                setConfirmResign(false);
              }}
            >
              {t("Ya, saya menyerah")}
            </button>
          </div>
        </Modal>
      )}
      {keyboardToast && (
        <div
          className="toast keyboard-toggle-toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <kbd>{keyboardToast.key}</kbd>
          <div className="keyboard-toggle-copy">
            <span>{t(keyboardToast.label)}</span>
            <strong>{t(keyboardToast.enabled ? "Aktif" : "Nonaktif")}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
