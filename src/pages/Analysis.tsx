import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowDownToLine,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Cpu,
  Flag,
  GitBranch,
  Lightbulb,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Play,
  Plus,
  RotateCcw,
  TrendingUp,
  Trash2,
  WandSparkles,
} from "lucide-react";
import Board, { EvalBar } from "../components/Board";
import {
  IconButton,
  Modal,
  MoveList,
  NavigationControls,
} from "../components/Common";
import { DashboardButton } from "../components/block/dashboard-shell";
import { useEngine } from "../hooks/useEngine";
import { LocalEngine } from "../lib/engine";
import {
  annotate,
  downloadFile,
  formatEval,
  gameStatus,
  historyOf,
  LABELS,
  material,
  positionAt,
  pvToSan,
  readStorage,
  toPgn,
  writeStorage,
} from "../lib/chess";
import type { Evaluation, GameData, ReviewMove } from "../lib/chess";
import { findBookMove } from "../lib/opening-book";
import {
  mergePositionReview,
  retainReview,
  reviewSegments,
} from "../lib/review";
import type { Settings } from "../App";

function updatePositionFen(
  fen: string,
  square: string,
  piece?: string,
  from?: string,
) {
  const fields = fen.split(" ");
  const rows = fields[0].split("/").map((row) => {
    const cells: string[] = [];
    for (const token of row)
      /\d/.test(token)
        ? cells.push(...Array(Number(token)).fill(""))
        : cells.push(token);
    return cells;
  });
  const at = (sq: string) => [8 - Number(sq[1]), sq.charCodeAt(0) - 97];
  const [r, c] = at(square);
  const current = rows[r][c];
  if (current.toLowerCase() === "k") return undefined;
  if (from) {
    const [fr, fc] = at(from);
    const moving = rows[fr][fc];
    if (!moving || (current.toLowerCase() === "k" && current !== moving))
      return undefined;
    rows[fr][fc] = "";
    rows[r][c] = moving;
  } else if (piece === "delete") rows[r][c] = "";
  else if (piece) rows[r][c] = piece;
  const placement = rows
    .map((cells) => {
      let result = "",
        empty = 0;
      for (const cell of cells) {
        if (!cell) empty++;
        else {
          if (empty) result += empty;
          result += cell;
          empty = 0;
        }
      }
      if (empty) result += empty;
      return result;
    })
    .join("/");
  return [placement, ...fields.slice(1)].join(" ");
}

export default function Analysis({
  game: mainGame,
  setGame: setMainGame,
  settings,
  onSettingsChange,
  onSave,
  onImport,
  onPositionChange,
  onNewGame,
  customEditing,
  onCustomEditingChange,
  autoReviewOnLoad,
  onAutoReviewStarted,
}: {
  game: GameData;
  setGame: (game: GameData) => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onSave: () => void;
  onImport: () => void;
  onPositionChange: (fen: string) => void;
  onNewGame: () => void;
  autoReviewOnLoad: boolean;
  onAutoReviewStarted: () => void;
  customEditing: boolean;
  onCustomEditingChange: (editing: boolean) => void;
}) {
  const [activeVariationId, setActiveVariationId] = useState<string>();
  const activeVariation = mainGame.variations?.find(
    (item) => item.id === activeVariationId,
  );
  const game = useMemo(
    () =>
      activeVariation
        ? {
            ...mainGame,
            moves: activeVariation.moves,
            moveTimes: mainGame.moveTimes?.slice(0, activeVariation.forkPly),
            result: "*",
          }
        : mainGame,
    [mainGame, activeVariation],
  );
  const setGame = setMainGame;
  const [ply, setPly] = useState(game.moves.length);
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState("review");
  const [editorPiece, setEditorPiece] = useState<string>();
  const [editorSquare, setEditorSquare] = useState<string>();
  const [evaluation, setEvaluation] = useState<Evaluation>();
  const [review, setReview] = useState<ReviewMove[]>(() => {
    const cached = readStorage<{ pgn: string; items: ReviewMove[] }>(
      "kuda-last-review",
      { pgn: "", items: [] },
    );
    return cached.pgn === toPgn(mainGame) ? cached.items : [];
  });
  const [reviewing, setReviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    readStorage("kuda-notes", {}),
  );
  const { engine, status, error: engineError } = useEngine(settings.engine);
  const reviewEngine = useRef<LocalEngine | null>(null);
  const reviewId = useRef(0);
  const autoReviewStarted = useRef(false);
  const evaluationCache = useRef(new Map<string, Evaluation>());
  const history = useMemo(() => historyOf(game), [game]);
  const position = useMemo(() => positionAt(game, ply), [game, ply]);
  const fen = position.fen();
  useEffect(() => {
    onPositionChange(fen);
  }, [fen, onPositionChange]);
  useEffect(() => {
    if (customEditing) setTab("editor");
    else if (tab === "editor") setTab("review");
  }, [customEditing]);
  useEffect(() => {
    if (review.length)
      writeStorage("kuda-last-review", { pgn: toPgn(mainGame), items: review });
  }, [mainGame, review]);
  const bookMoves = useMemo(
    () =>
      history.map((move) =>
        findBookMove(move.before, move.from + move.to + (move.promotion ?? "")),
      ),
    [history],
  );
  const displayReview = useMemo(
    () =>
      retainReview(review, history).map((item) =>
        bookMoves[item.ply - 1]
          ? { ...item, annotation: "book" as const }
          : item,
      ),
    [review, bookMoves, history],
  );
  const currentMove = history[ply - 1];
  const currentBook = bookMoves[ply - 1];
  const currentReview = displayReview.find((r) => r.ply === ply);
  const result = evaluation?.fen === fen ? evaluation : undefined;

  useEffect(() => {
    if (
      customEditing ||
      !settings.liveEngine ||
      status !== "ready" ||
      !engine.current ||
      reviewing
    )
      return;
    let active = true;
    const instance = engine.current;
    const remember = (value: Evaluation) => {
      evaluationCache.current.set(value.fen, value);
      if (evaluationCache.current.size > 512)
        evaluationCache.current.delete(
          evaluationCache.current.keys().next().value!,
        );
    };
    const timer = setTimeout(async () => {
      setError("");
      try {
        let before = currentMove
          ? evaluationCache.current.get(currentMove.before)
          : undefined;
        if (currentMove && !before) {
          before = await instance.analyze(currentMove.before, {
            ms: 250,
            multiPV: 1,
          });
          if (!active) return;
          remember(before);
        }
        const after = await instance.analyze(fen, {
          ms: settings.analysisMs,
          multiPV: settings.multiPV,
          depth: settings.engineDepth,
          onInfo: (value) => {
            if (active) setEvaluation(value);
          },
        });
        if (!active) return;
        remember(after);
        setEvaluation(after);
        if (currentMove && before) {
          const item = annotate(before, after, currentMove, ply);
          setReview((items) => mergePositionReview(items, item));
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }, 80);
    return () => {
      active = false;
      clearTimeout(timer);
      instance.stop();
    };
  }, [
    fen,
    customEditing,
    currentMove,
    ply,
    history,
    status,
    settings.analysisMs,
    settings.multiPV,
    settings.engineDepth,
    settings.liveEngine,
    settings.engine,
    engine,
    reviewing,
  ]);
  useEffect(
    () => () => {
      reviewId.current++;
      reviewEngine.current?.destroy();
    },
    [],
  );
  useEffect(() => {
    writeStorage("kuda-notes", notes);
  }, [notes]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
          e.target.isContentEditable ||
          e.target.closest("dialog"))
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPly((p) => Math.min(game.moves.length, p + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPly((p) => Math.max(0, p - 1));
      }
      if (e.key.toLowerCase() === "f") setFlipped((f) => !f);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [game.moves.length]);
  const stopReview = () => {
    reviewId.current++;
    reviewEngine.current?.destroy();
    reviewEngine.current = null;
    setReviewing(false);
  };
  function playMove(from: string, to: string, promotion = "q") {
    try {
      const c = positionAt(game, ply);
      const m = c.move({ from, to, promotion });
      if (game.moves[ply] === m.san) {
        setPly(ply + 1);
        return true;
      }
      stopReview();
      const moves = [...game.moves.slice(0, ply), m.san];
      if (activeVariation && ply === game.moves.length) {
        setMainGame({
          ...mainGame,
          variations: mainGame.variations?.map((item) =>
            item.id === activeVariation.id ? { ...item, moves } : item,
          ),
        });
      } else if (
        activeVariation ||
        ply < game.moves.length ||
        (!["Bebas", "Kustom"].includes(mainGame.source || "") &&
          mainGame.moves.length > 0)
      ) {
        const existing = mainGame.variations?.find(
          (item) =>
            item.forkPly === ply &&
            item.moves.slice(0, ply + 1).join(" ") === moves.join(" "),
        );
        if (existing) setActiveVariationId(existing.id);
        else {
          const id = crypto.randomUUID();
          setMainGame({
            ...mainGame,
            variations: [
              ...(mainGame.variations || []),
              { id, moves, forkPly: ply, parentId: activeVariation?.id },
            ],
          });
          setActiveVariationId(id);
        }
      } else {
        setMainGame({
          ...mainGame,
          moves,
          moveTimes: game.moveTimes?.slice(0, ply),
          result: c.isCheckmate()
            ? c.turn() === "w"
              ? "0-1"
              : "1-0"
            : c.isDraw()
              ? "1/2-1/2"
              : "*",
        });
      }
      setPly(ply + 1);
      return true;
    } catch {
      return false;
    }
  }
  const editSquare = (square: string, droppedPiece?: string, from?: string) => {
    const c = new Chess(game.startFen);
    const destination = c.get(square as import("chess.js").Square);
    if (destination?.type === "k") return;
    let nextFen: string | undefined;
    if (droppedPiece || editorPiece) {
      nextFen = updatePositionFen(
        game.startFen,
        square,
        droppedPiece || editorPiece,
      );
      setEditorPiece(undefined);
      setEditorSquare(undefined);
    } else if (from || editorSquare) {
      nextFen = updatePositionFen(
        game.startFen,
        square,
        undefined,
        from || editorSquare,
      );
      setEditorSquare(undefined);
    } else if (destination) {
      setEditorSquare(square);
      return;
    } else return;
    if (nextFen) {
      setGame({
        ...game,
        startFen: nextFen,
        moves: [],
        moveTimes: undefined,
        result: "*",
      });
      setPly(0);
    }
  };
  const deleteEditorSquare = () => {
    if (!editorSquare) return;
    const nextFen = updatePositionFen(game.startFen, editorSquare, "delete");
    if (nextFen)
      setGame({
        ...game,
        startFen: nextFen,
        moves: [],
        moveTimes: undefined,
        result: "*",
      });
    setEditorSquare(undefined);
    setPly(0);
  };
  const deleteDraggedPiece = (square: string) => {
    const nextFen = updatePositionFen(game.startFen, square, "delete");
    if (nextFen)
      setGame({
        ...game,
        startFen: nextFen,
        moves: [],
        moveTimes: undefined,
        result: "*",
      });
    setEditorSquare(undefined);
    setPly(0);
  };
  const resetEditor = () => {
    setGame({
      ...game,
      startFen: new Chess().fen(),
      moves: [],
      moveTimes: undefined,
      result: "*",
      event: "Analisis Bebas (Kustom)",
    });
    setEditorPiece(undefined);
    setEditorSquare(undefined);
    setPly(0);
  };
  async function runReview() {
    if (reviewing) {
      stopReview();
      return;
    }
    if (!history.length) {
      setError(
        "Mainkan beberapa langkah atau impor PGN untuk mengulas permainan.",
      );
      return;
    }
    const id = ++reviewId.current;
    const instance = new LocalEngine(settings.engine);
    reviewEngine.current = instance;
    setReviewing(true);
    setProgress(0);
    setError("");
    engine.current?.stop();
    try {
      let before = await instance.analyze(game.startFen, { ms: 350 });
      evaluationCache.current.set(before.fen, before);
      const items: ReviewMove[] = [];
      for (let i = 0; i < history.length; i++) {
        if (id !== reviewId.current) return;
        const after = await instance.analyze(history[i].after, { ms: 350 });
        if (id !== reviewId.current) return;
        evaluationCache.current.set(after.fen, after);
        items.push(annotate(before, after, history[i], i + 1));
        setReview((bank) => items.reduce(mergePositionReview, bank));
        setProgress(Math.round(((i + 1) / history.length) * 100));
        before = after;
      }
    } catch (e) {
      if (id === reviewId.current) setError((e as Error).message);
    } finally {
      instance.destroy();
      if (id === reviewId.current) {
        setReviewing(false);
        reviewEngine.current = null;
      }
    }
  }
  useEffect(() => {
    if (
      !autoReviewOnLoad ||
      autoReviewStarted.current ||
      customEditing ||
      status !== "ready"
    )
      return;
    autoReviewStarted.current = true;
    onAutoReviewStarted();
    void runReview();
  }, [autoReviewOnLoad, customEditing, status]);
  const playerClock = (color: "w" | "b") => {
    for (let i = Math.min(ply, history.length) - 1; i >= 0; i--) {
      if (history[i].color === color && game.moveTimes?.[i])
        return game.moveTimes[i];
    }
    return "—";
  };
  const mainHistory = historyOf(mainGame);
  const mainBookMoves = mainHistory.map((move) =>
    findBookMove(move.before, move.from + move.to + (move.promotion || "")),
  );
  const mainReview = retainReview(review, mainHistory).map((item) =>
    mainBookMoves[item.ply - 1]
      ? { ...item, annotation: "book" as const }
      : item,
  );
  const accuracy = (color: "w" | "b") => {
    const items = mainReview.filter((r) => r.color === color);
    return items.length
      ? (items.reduce((s, r) => s + r.accuracy, 0) / items.length).toFixed(1)
      : "—";
  };
  const classificationCounts = (
    [
      "brilliant",
      "best",
      "excellent",
      "good",
      "miss",
      "inaccuracy",
      "mistake",
      "blunder",
    ] as const
  )
    .map((key) => ({
      key,
      count: mainReview.filter((item) => item.annotation === key).length,
    }))
    .filter(({ count }) => count > 0);
  const coachText = currentBook
    ? `${currentMove.san} adalah Book Move dalam ${currentBook.name} (${currentBook.eco}).`
    : currentReview
      ? currentReview.annotation === "brilliant"
        ? `${currentReview.san} adalah langkah Brilian: pengorbanan material yang tetap kuat menurut Stockfish. Lihat variasi engine untuk memahami kelanjutannya.`
        : currentReview.annotation === "miss"
          ? `${currentReview.san} melewatkan peluang taktis untuk ${currentReview.before.cp * (currentReview.color === "w" ? 1 : -1) >= 200 ? "meraih keunggulan menang" : "mempertahankan keseimbangan"}. Pertimbangkan ${currentReview.bestSan}, lalu periksa kelanjutannya pada variasi engine.`
          : ["blunder", "mistake", "inaccuracy"].includes(
                currentReview.annotation,
              )
            ? `${currentReview.san} menurunkan estimasi peluang menang ${currentReview.loss.toFixed(1)} poin persentase. Pertimbangkan ${currentReview.bestSan}, lalu lihat variasi engine untuk memahami respons lawan.`
            : `${currentReview.san} ${currentReview.annotation === "best" ? "sesuai pilihan utama Stockfish" : "mempertahankan posisi dengan baik"}. ${currentMove?.isCapture() ? "Langkah ini menangkap buah lawan." : currentMove?.isKingsideCastle() || currentMove?.isQueensideCastle() ? "Rokade mengamankan raja dan mengaktifkan benteng." : "Lanjutkan dengan memeriksa ancaman lawan dan aktivitas buah."}`
      : position.isCheckmate()
        ? gameStatus(position)
        : result?.lines[0]
          ? `Stockfish menyarankan ${pvToSan(fen, result.lines[0].pv, 1)[0]}. ${position.isCheck() ? "Raja sedang skak: tangani ancaman terlebih dahulu." : material(fen) === 0 ? "Material seimbang. Perhatikan aktivitas buah dan keselamatan raja." : `Selisih material ${Math.abs(material(fen))} poin untuk ${material(fen) > 0 ? "putih" : "hitam"}. Evaluasi juga memperhitungkan posisi.`}`
          : currentMove
            ? "Stockfish sedang menilai langkah ini secara otomatis…"
            : "Mainkan langkah untuk melihat penilaian otomatis.";
  const notationProps = {
    moves: mainGame.moves,
    ply: activeVariation && ply > activeVariation.forkPly ? -1 : ply,
    onChange: (nextPly: number) => {
      stopReview();
      setActiveVariationId(undefined);
      setPly(nextPly);
    },
    review: mainReview,
    bookMoves: mainHistory.map((move) =>
      findBookMove(move.before, move.from + move.to + (move.promotion || "")),
    ),
    startFen: mainGame.startFen,
    variations: mainGame.variations || [],
    activeVariationId,
    variationPly: ply,
    onVariationChange: (id: string, nextPly: number) => {
      stopReview();
      setActiveVariationId(id);
      setPly(nextPly);
    },
  };
  return (
    <div className="page analysis-page">
      <div className="workspace-toolbar">
        <div className="game-title-block">
          <strong>
            {game.source === "Bebas" || game.source === "Kustom"
              ? game.source === "Kustom" || game.event.includes("Kustom")
                ? "Analisis Bebas (Kustom)"
                : "Analisis Bebas"
              : "Impor " + (game.source || "PGN")}
          </strong>
          {!customEditing && (
            <div className="game-players">
              {(["w", "b"] as const).map((color) => {
                const name = color === "w" ? game.white : game.black;
                const elo = color === "w" ? game.whiteElo : game.blackElo;
                return (
                  <span className="game-player" key={color}>
                    <span
                      className={"player-color player-color-" + color}
                      aria-hidden="true"
                    />
                    <strong>{color === "w" ? "Putih" : "Hitam"}</strong>
                    <span>
                      {name}
                      {elo ? " (" + elo + ")" : ""}
                    </span>
                    {game.moveTimes?.some(Boolean) && (
                      <time
                        aria-label={
                          "Sisa waktu " + (color === "w" ? "putih" : "hitam")
                        }
                      >
                        {playerClock(color)}
                      </time>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {!customEditing && (
          <button className="button secondary" onClick={onSave}>
            <Bookmark size={16} /> Simpan
          </button>
        )}
        <button className="button secondary" onClick={onNewGame}>
          <Plus size={15} /> New Game
        </button>
        <button className="button primary" onClick={onImport}>
          <ArrowDownToLine size={16} /> Impor permainan
        </button>
      </div>
      <div className="analysis-grid">
        <section className="board-section">
          <div className="board-and-eval">
            <EvalBar
              cp={evaluation?.cp}
              mate={evaluation?.mate}
              flipped={flipped}
              active={!!evaluation}
              pending={!!evaluation && !result}
            />
            <div className="board-main">
              <Board
                fen={fen}
                flipped={flipped}
                onMove={playMove}
                disabled={customEditing}
                editMode={customEditing}
                onEditSquare={editSquare}
                onDeleteDropSquare={deleteDraggedPiece}
                lastMove={currentMove}
                arrow={
                  settings.showArrows
                    ? result?.lines
                        .slice(0, settings.multiPV)
                        .map((line) => line.pv[0])
                    : undefined
                }
                theme={settings.boardTheme}
              />
            </div>
          </div>
          <NavigationControls
            ply={ply}
            total={game.moves.length}
            onChange={setPly}
            onFlip={() => setFlipped((f) => !f)}
          />
        </section>
        <div className="analysis-sidebar">
          <div className="analysis-sidebar-content">
            <aside className="analysis-panel">
              <div className="panel-tabs">
                {(customEditing
                  ? [["editor", "Atur buah"]]
                  : [
                      ["review", "Ulasan"],
                      ["engine", "Engine"],
                      ["notes", "Catatan"],
                      ["options", "Opsi"],
                    ]
                ).map(([value, label]) => (
                  <button
                    className={tab === value ? "active" : ""}
                    key={value}
                    onClick={() => setTab(value)}
                  >
                    {label}
                    {value === "engine" && <span className="tab-dot" />}
                  </button>
                ))}
                <IconButton
                  label="Tentang analisis"
                  onClick={() => setShowInfo(true)}
                >
                  <CircleHelp size={15} />
                </IconButton>
              </div>
              {!customEditing && (
                <div className="engine-status">
                  <div className="engine-chip">
                    <Cpu size={15} />
                    <strong>Stockfish 19</strong>
                    <span>{settings.engine}</span>
                  </div>
                  <button
                    className="text-button engine-settings-link"
                    onClick={() => setTab("options")}
                  >
                    Ganti engine <ArrowRight size={13} />
                  </button>
                </div>
              )}
              {!customEditing && (error || engineError) && (
                <div className="error-message" role="alert">
                  {error || engineError}
                  <button onClick={() => setError("")}>×</button>
                </div>
              )}
              {tab === "review" && !customEditing && (
                <>
                  <div className="review-overview">
                    <div className="review-overview-heading">
                      <div className="section-label">
                        AKURASI PERMAINAN{" "}
                        <button
                          onClick={() => setShowInfo(true)}
                          aria-label="Metode akurasi"
                        >
                          <CircleHelp size={13} />
                        </button>
                      </div>
                      <button
                        className="text-button review-action-button"
                        onClick={runReview}
                        disabled={status !== "ready" || !game.moves.length}
                      >
                        {reviewing ? (
                          <>
                            <span>Hentikan ulasan</span>
                            <span>{progress}%</span>
                          </>
                        ) : (
                          <span>
                            {review.length
                              ? "Analisis ulang"
                              : "Analisis seluruh permainan"}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="accuracy-scores">
                      <div>
                        <span className="color-dot white" />
                        <span>Putih</span>
                        <strong>
                          {accuracy("w")}
                          <small>%</small>
                        </strong>
                      </div>
                      <span className="score-divider" />
                      <div>
                        <span className="color-dot black" />
                        <span>Hitam</span>
                        <strong>
                          {accuracy("b")}
                          <small>%</small>
                        </strong>
                      </div>
                    </div>
                    {reviewing && (
                      <div className="review-progress">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    {classificationCounts.length > 0 && (
                      <div
                        className="classification-summary"
                        tabIndex={0}
                        role="region"
                        aria-label="Ringkasan penilaian langkah"
                      >
                        {classificationCounts.map(({ key, count }) => (
                          <div key={key}>
                            <span style={{ color: LABELS[key].color }}>
                              {LABELS[key].symbol}
                            </span>
                            <strong>{count}</strong>
                            <small>{LABELS[key].label}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="notation-heading">
                    <span>Notasi permainan</span>
                    <span>{game.moves.length} ply</span>
                  </div>
                  <MoveList {...notationProps} />
                  <div className="coach-card">
                    <div className="coach-label">
                      <span className="coach-avatar">
                        {currentBook ? (
                          <BookOpen size={17} />
                        ) : (
                          <Lightbulb size={17} />
                        )}
                      </span>
                      <strong>
                        {currentBook
                          ? "Book Move"
                          : currentReview
                            ? LABELS[currentReview.annotation].label
                            : currentMove
                              ? "Menilai langkah…"
                              : "Catatan pelatih"}
                      </strong>
                      {(currentBook || currentReview) && (
                        <span className="coach-move">{currentMove?.san}</span>
                      )}
                    </div>
                    <p>{coachText}</p>
                  </div>
                </>
              )}
              {tab === "engine" && !customEditing && (
                <div className="engine-details">
                  <div className="line-heading">
                    <h3>Variasi terbaik</h3>
                  </div>
                  {result?.lines.length ? (
                    result.lines.map((line, i) => (
                      <button
                        className="engine-line"
                        key={i}
                        onClick={() => {
                          const uci = line.pv[0];
                          if (uci)
                            playMove(uci.slice(0, 2), uci.slice(2, 4), uci[4]);
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
                          <p>{pvToSan(fen, line.pv, 8).join(" ")}</p>
                        </div>
                        <ArrowRight size={15} />
                      </button>
                    ))
                  ) : (
                    <div className="empty-inline">
                      {position.isGameOver()
                        ? gameStatus(position)
                        : !settings.liveEngine
                          ? "Aktifkan live engine di tab Opsi untuk menganalisis posisi."
                          : "Engine sedang menyiapkan variasi…"}
                    </div>
                  )}
                  <div className="notation-heading">
                    <span>Notasi permainan</span>
                    <span>{game.moves.length} ply</span>
                  </div>
                  <MoveList {...notationProps} />
                </div>
              )}
              {customEditing && (
                <div className="piece-editor">
                  <p>Pilih buah lalu klik petak, atau seret buah ke papan.</p>
                  {["w", "b"].map((color) => (
                    <div className="piece-editor-group" key={color}>
                      <strong>{color === "w" ? "Putih" : "Hitam"}</strong>
                      <div>
                        {["q", "r", "b", "n", "p"].map((type) => {
                          const code =
                            color === "w" ? type.toUpperCase() : type;
                          const names: Record<string, string> = {
                            q: "Menteri",
                            r: "Benteng",
                            b: "Gajah",
                            n: "Kuda",
                            p: "Pion",
                          };
                          return (
                            <button
                              key={code}
                              aria-label={
                                (color === "w" ? "Putih " : "Hitam ") +
                                names[type]
                              }
                              className={editorPiece === code ? "active" : ""}
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "application/x-kuda-piece",
                                  code,
                                )
                              }
                              onClick={() => {
                                setEditorPiece(code);
                                setEditorSquare(undefined);
                              }}
                            >
                              <img
                                src={
                                  "/pieces/" +
                                  color +
                                  type.toUpperCase() +
                                  ".svg"
                                }
                                alt=""
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p>
                    {editorSquare
                      ? "Petak " + editorSquare + " dipilih"
                      : editorPiece
                        ? "Buah siap diletakkan"
                        : "Pilih petak berisi buah untuk menghapusnya"}
                  </p>
                  <div className="piece-editor-actions">
                    <button
                      className="button secondary"
                      disabled={
                        !editorSquare ||
                        new Chess(game.startFen).get(
                          editorSquare as import("chess.js").Square,
                        )?.type === "k"
                      }
                      onClick={deleteEditorSquare}
                    >
                      <Trash2 size={15} /> Hapus buah
                    </button>
                    <button className="button secondary" onClick={resetEditor}>
                      <RotateCcw size={15} /> Reset
                    </button>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => {
                      onCustomEditingChange(false);
                      setEditorPiece(undefined);
                      setEditorSquare(undefined);
                      setTab("review");
                    }}
                  >
                    Selesai mengatur
                  </button>
                </div>
              )}
              {tab === "options" && !customEditing && (
                <div className="engine-options">
                  <div className="settings-section">
                    <label htmlFor="engine-choice">Pilih engine</label>
                    <select
                      id="engine-choice"
                      value={settings.engine}
                      onChange={(e) => {
                        stopReview();
                        setEvaluation(undefined);
                        evaluationCache.current.clear();
                        onSettingsChange({
                          ...settings,
                          engine: e.target.value as Settings["engine"],
                        });
                      }}
                    >
                      <option value="lite">Stockfish 19 Lite</option>
                      <option value="full">Stockfish 19 Full</option>
                    </select>
                    <p>
                      {settings.engine === "lite"
                        ? "Ringan untuk analisis sehari-hari."
                        : "Model lebih besar, sekitar 95 MB saat pertama dimuat."}
                    </p>
                  </div>
                  <div className="settings-section">
                    <label className="board-sound-setting">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={settings.liveEngine}
                        onChange={(e) =>
                          onSettingsChange({
                            ...settings,
                            liveEngine: e.target.checked,
                          })
                        }
                      />
                      Live engine
                    </label>
                  </div>
                  <div className="settings-section">
                    <label htmlFor="engine-depth">Batas depth</label>
                    <select
                      id="engine-depth"
                      value={settings.engineDepth}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          engineDepth: Number(e.target.value),
                        })
                      }
                    >
                      <option value={0}>Otomatis · mengikuti waktu</option>
                      {[8, 12, 16, 20, 24, 30].map((depth) => (
                        <option key={depth} value={depth}>
                          Depth {depth}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-section">
                    <label htmlFor="analysis-time">
                      Waktu analisis{" "}
                      <strong>{settings.analysisMs / 1000} detik</strong>
                    </label>
                    <input
                      id="analysis-time"
                      type="range"
                      min="200"
                      max="10000"
                      step="100"
                      value={settings.analysisMs}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          analysisMs: Number(e.target.value),
                        })
                      }
                    />
                    <p>
                      Analisis posisi berhenti saat batas waktu atau depth
                      tercapai. Ulasan seluruh permainan memakai 350 ms per
                      posisi.
                    </p>
                  </div>
                  <div className="settings-section">
                    <label className="board-sound-setting">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={settings.showArrows}
                        onChange={(e) =>
                          onSettingsChange({
                            ...settings,
                            showArrows: e.target.checked,
                          })
                        }
                      />
                      Tampilkan panah engine
                    </label>
                    <p>Berlaku di semua tab analisis.</p>
                  </div>
                  <div className="settings-section">
                    <label htmlFor="variation-count">Jumlah variasi</label>
                    <select
                      id="variation-count"
                      value={settings.multiPV}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          multiPV: Number(e.target.value),
                        })
                      }
                    >
                      {[1, 2, 3].map((count) => (
                        <option key={count} value={count}>
                          {count} variasi
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {tab === "notes" && !customEditing && (
                <div className="notes-panel">
                  <MessageSquareText size={27} />
                  <h3>Ide yang layak diingat.</h3>
                  <p>
                    Catatan untuk posisi ini tersimpan otomatis di browser Anda.
                  </p>
                  <label htmlFor="position-note">
                    {ply
                      ? `Setelah ${Math.ceil(ply / 2)}. ${currentMove?.san}`
                      : "Posisi awal"}
                  </label>
                  <textarea
                    id="position-note"
                    value={notes[fen] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [fen]: e.target.value }))
                    }
                    placeholder="Apa rencanamu? Ancaman apa yang perlu diperhatikan?"
                    rows={9}
                  />
                  <span className="saved-note">
                    <Check size={13} /> Tersimpan di perangkat
                  </span>
                  <button
                    className="button secondary"
                    onClick={() =>
                      downloadFile(
                        "kuda-catatan.txt",
                        `FEN: ${fen}\n\n${notes[fen] ?? ""}`,
                      )
                    }
                  >
                    <ArrowDownToLine size={15} /> Ekspor catatan
                  </button>
                </div>
              )}
            </aside>
            <section className="eval-chart-card">
              <div className="card-heading">
                <div>
                  <TrendingUp size={16} />
                  <h3>Alur permainan</h3>
                </div>
                <span>Evaluasi dari sudut putih</span>
              </div>
              <EvaluationChart
                review={mainReview}
                total={mainGame.moves.length}
                ply={activeVariation ? activeVariation.forkPly : ply}
                onSelect={notationProps.onChange}
              />
            </section>
          </div>
        </div>
        <div className="board-under">
          <span>
            <span className="status-dot" />
            {gameStatus(position)}
          </span>
          <span>
            ← → navigasi <kbd>F</kbd> balik papan
          </span>
          <div className="export-actions board-export-actions">
            <button
              className="text-button"
              onClick={() => downloadFile("kuda-position.fen", fen)}
            >
              Ekspor FEN <ArrowDownToLine size={13} />
            </button>
            <button
              className="text-button"
              onClick={() => downloadFile("kuda-game.pgn", toPgn(game))}
            >
              Ekspor PGN <ArrowDownToLine size={13} />
            </button>
          </div>
        </div>
        {activeVariation && (
          <div className="variation-notice">
            <GitBranch size={15} />
            <span>Anda menjelajahi variasi baru.</span>
            <button
              onClick={() => {
                stopReview();
                setActiveVariationId(undefined);
                setPly(Math.min(ply, mainGame.moves.length));
              }}
            >
              Kembali ke jalur utama
            </button>
          </div>
        )}
      </div>
      {showInfo && (
        <Modal
          title="Memahami hasil analisis"
          onClose={() => setShowInfo(false)}
        >
          <div className="prose">
            <p>
              Evaluasi positif menguntungkan putih; negatif menguntungkan hitam.
              M menunjukkan jarak menuju skakmat menurut engine.
            </p>
            <p>
              Akurasi adalah estimasi aplikasi berdasarkan perubahan peluang
              menang dari evaluasi Stockfish, dengan kurva publik yang juga
              digunakan Lichess. Label langkah memakai ambang aplikasi sendiri
              dan tidak sama dengan skor resmi platform lain.
            </p>
            <p>
              Peluang terlewat menandai kesempatan taktis berupa tangkapan atau
              skak yang diabaikan: keunggulan minimal +2 turun di bawah +1, atau
              posisi sekitar seimbang (−0,5 sampai +0,5) turun ke −2 atau lebih
              buruk, dari sudut pemain yang melangkah. Kedua evaluasi memerlukan
              depth minimal 12. Skor akurasi tetap dihitung dari penurunan
              peluang menang.
            </p>
            <p>
              Brilian memakai aturan lokal: pilihan utama engine pada depth
              minimal 12 yang mengorbankan buah, tetap mempertahankan posisi,
              dan tidak langsung mendapatkan kembali material dalam variasi
              utama. Ini perkiraan aplikasi, bukan label resmi platform lain.
            </p>
            <p>
              Book Move dikenali dari posisi dan langkah dalam database opening
              Lichess yang tersimpan lokal. Transposisi ikut dikenali. Langkah
              di luar database belum tentu buruk. Label ini terpisah dari skor
              akurasi Stockfish.
            </p>
            <p>
              Ulasan cepat memakai 350 ms per posisi. Posisi rumit atau
              pengorbanan mungkin membutuhkan pencarian lebih lama. Buka tab
              Opsi dan naikkan waktu analisis untuk memeriksanya.
            </p>
            <p>
              Stockfish lite memakai jaringan yang lebih kecil daripada versi
              penuh. Catatan pelatih memakai aturan dan hasil engine, tanpa LLM
              atau API eksternal.
            </p>
            <a
              href="https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html"
              target="_blank"
              rel="noreferrer"
            >
              Dokumentasi evaluasi Stockfish ↗
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EvaluationChart({
  review,
  total,
  ply,
  onSelect,
}: {
  review: ReviewMove[];
  total: number;
  ply: number;
  onSelect: (n: number) => void;
}) {
  const { values, segments } = reviewSegments(review);
  const x = (i: number) => 10 + (i / Math.max(1, total)) * 780;
  const y = (cp: number) => 55 - 39 * Math.tanh(cp / 400);
  return (
    <div className="eval-chart">
      <svg
        viewBox="0 0 800 110"
        preserveAspectRatio="none"
        aria-label="Grafik evaluasi permainan"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78a38d" stopOpacity=".3" />
            <stop offset="100%" stopColor="#78a38d" stopOpacity=".02" />
          </linearGradient>
        </defs>
        <line
          x1="10"
          x2="790"
          y1="55"
          y2="55"
          stroke="#dfe4dc"
          strokeDasharray="4 5"
        />
        {segments.map((segment, index) => {
          const path = segment
            .map((point) => `${x(point.ply)},${y(point.cp)}`)
            .join(" ");
          return (
            <g key={index}>
              <polygon
                points={`${x(segment[0].ply)},100 ${path} ${x(segment.at(-1)!.ply)},100`}
                fill="url(#chart-fill)"
              />
              <polyline
                points={path}
                fill="none"
                stroke="#5b8e72"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
        <line
          x1={x(ply)}
          x2={x(ply)}
          y1="9"
          y2="99"
          stroke="#9da799"
          strokeDasharray="3 3"
        />
        {review
          .filter((item) =>
            [
              "best",
              "brilliant",
              "inaccuracy",
              "mistake",
              "blunder",
              "miss",
            ].includes(item.annotation),
          )
          .map((item) => (
            <circle
              key={`${item.ply}-${item.annotation}`}
              className="evaluation-marker"
              cx={x(item.ply)}
              cy={y(values.get(item.ply) ?? item.after.cp)}
              r="4"
              style={{ fill: LABELS[item.annotation].color }}
              stroke="white"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${LABELS[item.annotation].label}: ${item.san}`}</title>
            </circle>
          ))}
      </svg>
      {!review.length && (
        <div className="chart-empty">
          Jalankan analisis untuk melihat perjalanan permainan.
        </div>
      )}
      <div className="chart-scrubber">
        {Array.from({ length: total + 1 }, (_, i) => (
          <button
            key={i}
            aria-label={`Lihat posisi ply ${i}`}
            title={`Ply ${i}`}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
      <div className="chart-axis">
        <span>Awal permainan</span>
        <span>Langkah {Math.ceil(total / 2)}</span>
      </div>
    </div>
  );
}
