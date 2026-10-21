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
  RotateCcw,
  TrendingUp,
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
import { mergeReview, retainReview, reviewSegments } from "../lib/review";
import type { Settings } from "../App";

export default function Analysis({
  game,
  setGame,
  settings,
  onSave,
  onImport,
  onPositionChange,
}: {
  game: GameData;
  setGame: (game: GameData) => void;
  settings: Settings;
  onSave: () => void;
  onImport: () => void;
  onPositionChange: (fen: string) => void;
}) {
  const [ply, setPly] = useState(Math.min(14, game.moves.length));
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState("review");
  const [evaluation, setEvaluation] = useState<Evaluation>();
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewMove[]>(() => {
    const cached = readStorage<{ pgn: string; items: ReviewMove[] }>(
      "kuda-last-review",
      { pgn: "", items: [] },
    );
    return cached.pgn === toPgn(game) ? cached.items : [];
  });
  const [reviewing, setReviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [showArrow, setShowArrow] = useState(true);
  const [branches, setBranches] = useState<GameData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    readStorage("kuda-notes", {}),
  );
  const { engine, status, error: engineError } = useEngine();
  const reviewEngine = useRef<LocalEngine | null>(null);
  const reviewId = useRef(0);
  const evaluationCache = useRef(new Map<string, Evaluation>());
  const history = useMemo(() => historyOf(game), [game]);
  const position = useMemo(() => positionAt(game, ply), [game, ply]);
  const fen = position.fen();
  useEffect(() => {
    onPositionChange(fen);
  }, [fen, onPositionChange]);
  useEffect(() => {
    if (review.length)
      writeStorage("kuda-last-review", { pgn: toPgn(game), items: review });
  }, [game, review]);
  const bookMoves = useMemo(
    () =>
      history.map((move) =>
        findBookMove(move.before, move.from + move.to + (move.promotion ?? "")),
      ),
    [history],
  );
  const displayReview = useMemo(
    () =>
      review.map((item) =>
        bookMoves[item.ply - 1]
          ? { ...item, annotation: "book" as const }
          : item,
      ),
    [review, bookMoves],
  );
  const currentMove = history[ply - 1];
  const currentBook = bookMoves[ply - 1];
  const currentReview = displayReview.find((r) => r.ply === ply);
  const result = evaluation?.fen === fen ? evaluation : undefined;

  useEffect(() => {
    if (status !== "ready" || !engine.current || reviewing) return;
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
      setBusy(true);
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
          onInfo: (value) => {
            if (active) setEvaluation(value);
          },
        });
        if (!active) return;
        remember(after);
        setEvaluation(after);
        if (currentMove && before) {
          const item = annotate(before, after, currentMove, ply);
          setReview((items) => mergeReview(retainReview(items, history), item));
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setBusy(false);
      }
    }, 80);
    return () => {
      active = false;
      clearTimeout(timer);
      instance.stop();
    };
  }, [
    fen,
    currentMove,
    ply,
    history,
    status,
    settings.analysisMs,
    settings.multiPV,
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
      if (ply < game.moves.length) setBranches((b) => [game, ...b].slice(0, 8));
      stopReview();
      setReview((items) => retainReview(items, history.slice(0, ply)));
      setGame({
        ...game,
        moves: [...game.moves.slice(0, ply), m.san],
        result: c.isCheckmate()
          ? c.turn() === "w"
            ? "0-1"
            : "1-0"
          : c.isDraw()
            ? "1/2-1/2"
            : "*",
        event: game.event,
      });
      setPly(ply + 1);
      return true;
    } catch {
      return false;
    }
  }
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
    const instance = new LocalEngine();
    reviewEngine.current = instance;
    setReviewing(true);
    setProgress(0);
    setReview([]);
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
        setReview([...items]);
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
  const accuracy = (color: "w" | "b") => {
    const items = review.filter((r) => r.color === color);
    return items.length
      ? (items.reduce((s, r) => s + r.accuracy, 0) / items.length).toFixed(1)
      : "—";
  };
  const classificationCounts = (
    ["brilliant", "best", "excellent", "good", "miss", "inaccuracy", "mistake", "blunder"] as const
  ).map((key) => ({
    key,
    count: displayReview.filter((item) => item.annotation === key).length,
  })).filter(({ count }) => count > 0);
  const coachText = currentBook
    ? `${currentMove.san} adalah Book Move dalam ${currentBook.name} (${currentBook.eco}).`
    : currentReview
      ? currentReview.annotation === "brilliant"
        ? `${currentReview.san} adalah langkah Brilian: pengorbanan material yang tetap kuat menurut Stockfish. Lihat variasi engine untuk memahami kelanjutannya.`
        : currentReview.annotation === "miss"
          ? `${currentReview.san} melewatkan peluang taktis untuk ${currentReview.before.cp * (currentReview.color === "w" ? 1 : -1) >= 200 ? "meraih keunggulan menang" : "mempertahankan keseimbangan"}. Pertimbangkan ${currentReview.bestSan}, lalu periksa kelanjutannya pada variasi engine.`
        : ["blunder", "mistake", "inaccuracy"].includes(currentReview.annotation)
        ? `${currentReview.san} menurunkan estimasi peluang menang ${currentReview.loss.toFixed(1)} poin persentase. Pertimbangkan ${currentReview.bestSan}, lalu lihat variasi engine untuk memahami respons lawan.`
        : `${currentReview.san} ${currentReview.annotation === "best" ? "sesuai pilihan utama Stockfish" : "mempertahankan posisi dengan baik"}. ${currentMove?.isCapture() ? "Langkah ini menangkap buah lawan." : currentMove?.isKingsideCastle() || currentMove?.isQueensideCastle() ? "Rokade mengamankan raja dan mengaktifkan benteng." : "Lanjutkan dengan memeriksa ancaman lawan dan aktivitas buah."}`
      : position.isCheckmate()
        ? gameStatus(position)
        : result?.lines[0]
          ? `Stockfish menyarankan ${pvToSan(fen, result.lines[0].pv, 1)[0]}. ${position.isCheck() ? "Raja sedang skak: tangani ancaman terlebih dahulu." : material(fen) === 0 ? "Material seimbang. Perhatikan aktivitas buah dan keselamatan raja." : `Selisih material ${Math.abs(material(fen))} poin untuk ${material(fen) > 0 ? "putih" : "hitam"}. Evaluasi juga memperhitungkan posisi.`}`
          : currentMove
            ? "Stockfish sedang menilai langkah ini secara otomatis…"
            : "Mainkan langkah untuk melihat penilaian otomatis.";
  return (
    <div className="page analysis-page">
      <div className="workspace-toolbar">
        <div className="live-move-rating" role="status" aria-live="polite">
          {currentMove && (
            <>
              <span
                style={{
                  color: currentBook
                    ? LABELS.book.color
                    : currentReview
                      ? LABELS[currentReview.annotation].color
                      : undefined,
                }}
              >
                {currentBook ? (
                  <BookOpen size={17} />
                ) : currentReview ? (
                  LABELS[currentReview.annotation].symbol
                ) : (
                  <LoaderCircle size={16} className="spin" />
                )}
              </span>
              <strong>
                {currentBook
                  ? "Book Move"
                  : currentReview
                    ? LABELS[currentReview.annotation].label
                    : status === "error" || error
                      ? "Penilaian tidak tersedia"
                      : "Menilai langkah…"}
              </strong>
              <span>{currentMove.san}</span>
            </>
          )}
        </div>
        <button className="button secondary" onClick={onSave}>
          <Bookmark size={16} /> Simpan
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
                lastMove={currentMove}
                arrow={
                  showArrow && tab === "engine"
                    ? result?.lines.slice(0, 3).map((line) => line.pv[0])
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
                {[
                  ["review", "Ulasan"],
                  ["engine", "Engine"],
                  ["notes", "Catatan"],
                ].map(([value, label]) => (
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
              <div className="engine-status">
                <div className="engine-chip">
                  <Cpu size={15} />
                  <strong>Stockfish 19</strong>
                  <span>lite</span>
                </div>
                <span
                  className={`local-state ${status === "error" ? "is-error" : ""}`}
                >
                  <span className="status-dot" />
                  {status === "loading"
                    ? "Memuat…"
                    : status === "error"
                      ? "Gagal dimuat"
                      : busy
                        ? "Menganalisis"
                        : "Lokal aktif"}
                </span>
              </div>
              {(error || engineError) && (
                <div className="error-message" role="alert">
                  {error || engineError}
                  <button onClick={() => setError("")}>×</button>
                </div>
              )}
              {tab === "review" && (
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
                      <div className="classification-summary" tabIndex={0}
                        role="region" aria-label="Ringkasan penilaian langkah">
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
                  <MoveList
                    moves={game.moves}
                    ply={ply}
                    onChange={setPly}
                    review={displayReview}
                    bookMoves={bookMoves}
                    startFen={game.startFen}
                  />
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
              {tab === "engine" && (
                <div className="engine-details">
                  <div className="line-heading">
                    <h3>Variasi terbaik</h3>
                    <button
                      className={`text-button ${showArrow ? "green" : ""}`}
                      onClick={() => setShowArrow((v) => !v)}
                    >
                      {showArrow ? "Sembunyikan" : "Tampilkan"} panah
                    </button>
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
                        : "Engine sedang menyiapkan variasi…"}
                    </div>
                  )}
                  <div className="notation-heading">
                    <span>Notasi permainan</span>
                    <span>{game.moves.length} ply</span>
                  </div>
                  <MoveList
                    moves={game.moves}
                    ply={ply}
                    onChange={setPly}
                    review={displayReview}
                    bookMoves={bookMoves}
                    startFen={game.startFen}
                  />
                </div>
              )}
              {tab === "notes" && (
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
                review={displayReview}
                total={game.moves.length}
                ply={ply}
                onSelect={setPly}
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
        {branches.length > 0 && (
          <div className="variation-notice">
            <GitBranch size={15} />
            <span>Anda menjelajahi variasi baru.</span>
            <button
              onClick={() => {
                const previous = branches[0];
                setBranches((b) => b.slice(1));
                stopReview();
                setReview([]);
                setGame(previous);
                setPly(Math.min(ply, previous.moves.length));
              }}
            >
              Kembali ke jalur sebelumnya
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
              skak yang diabaikan: keunggulan minimal +2 turun di bawah +1,
              atau posisi sekitar seimbang (−0,5 sampai +0,5) turun ke −2
              atau lebih buruk, dari sudut pemain yang melangkah. Kedua evaluasi
              memerlukan depth minimal 12. Skor akurasi tetap dihitung dari
              penurunan peluang menang.
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
              Engine dan naikkan waktu pada Pengaturan untuk memeriksanya.
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
            ["best", "brilliant", "inaccuracy", "mistake", "blunder", "miss"]
              .includes(item.annotation),
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
