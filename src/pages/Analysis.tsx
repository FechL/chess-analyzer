import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowDownToLine,
  ArrowRight,
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
  Sparkles,
  Square,
  Target,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import Board, { EvalBar } from "../components/Board";
import {
  IconButton,
  Modal,
  MoveList,
  NavigationControls,
  PlayerRow,
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
import { OPENINGS } from "../data/content";
import type { Settings } from "../App";

export default function Analysis({
  game,
  setGame,
  settings,
  onOpening,
  onPositionChange,
}: {
  game: GameData;
  setGame: (game: GameData) => void;
  settings: Settings;
  onOpening: () => void;
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
  const [practice, setPractice] = useState<ReviewMove>();
  const [practiceMessage, setPracticeMessage] = useState("");
  const [practiceSolved, setPracticeSolved] = useState(false);
  const [branches, setBranches] = useState<GameData[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    readStorage("kuda-notes", {}),
  );
  const { engine, status, error: engineError } = useEngine();
  const reviewEngine = useRef<LocalEngine | null>(null);
  const reviewId = useRef(0);
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
  const currentMove = history[ply - 1];
  const currentReview = review.find((r) => r.ply === ply);
  const result = evaluation?.fen === fen ? evaluation : undefined;
  const currentOpening = OPENINGS.filter((o) =>
    game.moves.slice(0, ply).every((m, i) => o.moves[i] === m),
  ).sort((a, b) => a.moves.length - b.moves.length)[0];

  useEffect(() => {
    if (status !== "ready" || !engine.current) return;
    let active = true;
    const instance = engine.current;
    const timer = setTimeout(() => {
      setBusy(true);
      instance
        .analyze(fen, {
          ms: settings.analysisMs,
          multiPV: settings.multiPV,
          onInfo: (e) => {
            if (active) setEvaluation(e);
          },
        })
        .then((e) => {
          if (active) {
            setEvaluation(e);
            setBusy(false);
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setBusy(false);
          }
        });
    }, 160);
    return () => {
      active = false;
      clearTimeout(timer);
      instance.stop();
    };
  }, [fen, status, settings.analysisMs, settings.multiPV, engine]);
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
      setReview([]);
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
      const items: ReviewMove[] = [];
      for (let i = 0; i < history.length; i++) {
        if (id !== reviewId.current) return;
        const after = await instance.analyze(history[i].after, { ms: 350 });
        if (id !== reviewId.current) return;
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
  const mistakes = review.filter((r) =>
    ["mistake", "blunder"].includes(r.annotation),
  );
  const coachText = currentReview
    ? ["blunder", "mistake", "inaccuracy"].includes(currentReview.annotation)
      ? `${currentReview.san} menurunkan estimasi peluang menang ${currentReview.loss.toFixed(1)} poin persentase. Pertimbangkan ${currentReview.bestSan}, lalu lihat variasi engine untuk memahami respons lawan.`
      : `${currentReview.san} ${currentReview.annotation === "best" ? "sesuai pilihan utama Stockfish" : "mempertahankan posisi dengan baik"}. ${currentMove?.isCapture() ? "Langkah ini menangkap buah lawan." : currentMove?.isKingsideCastle() || currentMove?.isQueensideCastle() ? "Rokade mengamankan raja dan mengaktifkan benteng." : "Lanjutkan dengan memeriksa ancaman lawan dan aktivitas buah."}`
    : position.isCheckmate()
      ? gameStatus(position)
      : result?.lines[0]
        ? `Stockfish menyarankan ${pvToSan(fen, result.lines[0].pv, 1)[0]}. ${position.isCheck() ? "Raja sedang skak: tangani ancaman terlebih dahulu." : material(fen) === 0 ? "Material seimbang. Perhatikan aktivitas buah dan keselamatan raja." : `Selisih material ${Math.abs(material(fen))} poin untuk ${material(fen) > 0 ? "putih" : "hitam"}. Evaluasi juga memperhitungkan posisi.`}`
        : "Jalankan ulasan untuk menemukan momen penting dan mempelajari alternatif yang lebih baik.";
  return (
    <div className="page analysis-page">
      <div className="analysis-grid">
        <section className="board-section">
          <div className="board-and-eval">
            <EvalBar
              cp={result?.cp}
              mate={result?.mate}
              flipped={flipped}
              active={!!result}
            />
            <div className="board-main">
              <PlayerRow
                name={flipped ? game.white : game.black}
                color={flipped ? "w" : "b"}
                active={position.turn() === (flipped ? "w" : "b")}
                right={
                  <span className="player-side">
                    {flipped ? "PUTIH" : "HITAM"}
                  </span>
                }
              />
              <Board
                fen={fen}
                flipped={flipped}
                onMove={playMove}
                lastMove={currentMove}
                arrow={
                  showArrow && tab === "engine" ? result?.bestmove : undefined
                }
                theme={settings.boardTheme}
              />
              <PlayerRow
                name={flipped ? game.black : game.white}
                color={flipped ? "b" : "w"}
                active={position.turn() === (flipped ? "b" : "w")}
                right={
                  <span className="player-side">
                    {flipped ? "HITAM" : "PUTIH"}
                  </span>
                }
              />
            </div>
          </div>
          <NavigationControls
            ply={ply}
            total={game.moves.length}
            onChange={setPly}
            onFlip={() => setFlipped((f) => !f)}
          />
          <div className="board-under">
            <span>
              <span className="status-dot" />
              {gameStatus(position)}
            </span>
            <span>
              ← → navigasi <kbd>F</kbd> balik papan
            </span>
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
        </section>
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
                <div className="section-label">
                  AKURASI PERMAINAN{" "}
                  <button
                    onClick={() => setShowInfo(true)}
                    aria-label="Metode akurasi"
                  >
                    <CircleHelp size={13} />
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
                <button
                  className={`review-button ${reviewing ? "running" : ""}`}
                  onClick={runReview}
                  disabled={status !== "ready" || !game.moves.length}
                >
                  {reviewing ? (
                    <>
                      <Square size={14} />
                      <span>Hentikan ulasan</span>
                      <span>{progress}%</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>
                        {review.length
                          ? "Analisis ulang permainan"
                          : "Analisis seluruh permainan"}
                      </span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                {reviewing && (
                  <div className="review-progress">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                )}
                <div className="classification-summary">
                  {(["best", "inaccuracy", "mistake", "blunder"] as const).map(
                    (key) => (
                      <div key={key}>
                        <span style={{ color: LABELS[key].color }}>
                          {LABELS[key].symbol}
                        </span>
                        <strong>
                          {review.length
                            ? review.filter((r) => r.annotation === key).length
                            : "—"}
                        </strong>
                        <small>{LABELS[key].label}</small>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="notation-heading">
                <span>Notasi permainan</span>
                <span>{game.moves.length} ply</span>
              </div>
              <MoveList
                moves={game.moves}
                ply={ply}
                onChange={setPly}
                review={review}
                startFen={game.startFen}
              />
              <div className="coach-card">
                <div className="coach-label">
                  <span className="coach-avatar">
                    <Lightbulb size={17} />
                  </span>
                  <strong>
                    {currentReview
                      ? LABELS[currentReview.annotation].label
                      : "Catatan pelatih"}
                  </strong>
                  {currentReview && (
                    <span className="coach-move">{currentReview.san}</span>
                  )}
                </div>
                <p>{coachText}</p>
                {mistakes.length > 0 && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setPractice(
                        currentReview && mistakes.includes(currentReview)
                          ? currentReview
                          : mistakes[0],
                      );
                      setPracticeMessage("");
                      setPracticeSolved(false);
                    }}
                  >
                    Latih posisi ini <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </>
          )}
          {tab === "engine" && (
            <div className="engine-details">
              <div className="evaluation-head">
                <div>
                  <span className="section-label">EVALUASI POSISI</span>
                  <h2>{result ? formatEval(result.cp, result.mate) : "—"}</h2>
                  <p>
                    {result
                      ? result.cp > 80
                        ? "Putih lebih unggul"
                        : result.cp < -80
                          ? "Hitam lebih unggul"
                          : "Posisi relatif seimbang"
                      : "Menunggu hasil engine"}
                  </p>
                </div>
                <span className="depth-badge">
                  depth {result?.depth ?? "—"}
                </span>
              </div>
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
                      <strong>{formatEval(line.cp, line.mate)}</strong>
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
              <div className="engine-explainer">
                <Cpu size={18} />
                <div>
                  <strong>Komputasi di perangkat Anda</strong>
                  <p>
                    1 thread · 64 MiB hash · {settings.analysisMs / 1000}{" "}
                    detik/posisi. Klik variasi untuk mencoba langkah pertamanya.
                  </p>
                </div>
              </div>
              <div className="notation-heading">
                <span>Notasi permainan</span>
                <span>{game.moves.length} ply</span>
              </div>
              <MoveList
                moves={game.moves}
                ply={ply}
                onChange={setPly}
                review={review}
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
      </div>
      <div className="analysis-bottom">
        <section className="eval-chart-card">
          <div className="card-heading">
            <div>
              <TrendingUp size={16} />
              <h3>Alur permainan</h3>
            </div>
            <span>Evaluasi dari sudut putih</span>
          </div>
          <EvaluationChart
            review={review}
            total={game.moves.length}
            ply={ply}
            onSelect={setPly}
          />
        </section>
        <section className="opening-callout">
          <span className="opening-icon">
            <GitBranch size={23} />
          </span>
          <div>
            <span className="small-label">PAHAMI LANGKAH PERTAMA</span>
            <h3>
              {currentOpening && ply
                ? currentOpening.name
                : "Bangun repertoar opening"}
            </h3>
            <p>Pelajari ide di balik langkah, lalu coba langsung di papan.</p>
            <button className="text-button" onClick={onOpening}>
              Jelajahi opening <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
      {review.length > 0 && (
        <section className="critical-moments">
          <div className="card-heading">
            <div>
              <Target size={17} />
              <h3>Momen untuk dipelajari</h3>
            </div>
            <span>
              {review.length}/{game.moves.length} langkah ditinjau
            </span>
          </div>
          <div className="critical-moment-grid">
            {[...review]
              .filter((r) => r.loss > 3)
              .sort((a, b) => b.loss - a.loss)
              .slice(0, 4)
              .map((r) => (
                <button
                  key={r.ply}
                  className="critical-moment"
                  onClick={() => {
                    setPly(r.ply);
                    setTab("review");
                  }}
                >
                  <span
                    className="critical-symbol"
                    style={{ color: LABELS[r.annotation].color }}
                  >
                    {LABELS[r.annotation].symbol}
                  </span>
                  <div>
                    <strong>
                      {Math.ceil(r.ply / 2)}
                      {r.color === "b" ? "…" : "."} {r.san}
                    </strong>
                    <span>
                      {LABELS[r.annotation].label} · Coba {r.bestSan}
                    </span>
                  </div>
                  <span className="critical-loss">
                    −{r.loss.toFixed(1)}
                    <small>poin peluang</small>
                  </span>
                </button>
              ))}
            {!review.some((r) => r.loss > 3) && (
              <p className="empty-inline">
                Belum ada penurunan peluang besar pada langkah yang ditinjau.
              </p>
            )}
          </div>
        </section>
      )}
      <div className="workspace-footer">
        <span>
          <span className="status-dot" /> Analisis lokal. Tanpa akun. Tanpa
          batas harian.
        </span>
        <div className="export-actions">
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
      {practice && (
        <Modal
          title="Coba langkah yang lebih baik"
          onClose={() => setPractice(undefined)}
        >
          <p className="modal-description">
            {practice.color === "w" ? "Putih" : "Hitam"} melangkah. Gantikan{" "}
            {practice.san} dengan pilihan utama engine.
          </p>
          <div className="practice-board">
            <Board
              fen={practice.before.fen}
              flipped={practice.color === "b"}
              theme={settings.boardTheme}
              disabled={practiceSolved}
              arrow={practiceSolved ? practice.before.bestmove : undefined}
              onMove={(from, to, prom = "q") => {
                const move = practice.before.bestmove;
                if (from + to + (move.length === 5 ? prom : "") === move) {
                  setPracticeSolved(true);
                  setPracticeMessage(
                    `Tepat! ${practice.bestSan} adalah pilihan utama engine pada ulasan ini.`,
                  );
                } else
                  setPracticeMessage(
                    "Langkah legal, tetapi ada pilihan yang lebih kuat. Coba lagi.",
                  );
                return false;
              }}
            />
          </div>
          <div
            className={`exercise-feedback ${practiceSolved ? "success" : ""}`}
            aria-live="polite"
          >
            {practiceMessage || "Periksa skak, tangkapan, dan ancaman."}
          </div>
          <button
            className="button secondary"
            onClick={() => {
              setPracticeSolved(true);
              setPracticeMessage(`Pilihan engine: ${practice.bestSan}`);
            }}
          >
            Lihat jawaban
          </button>
          {mistakes.length > 1 && (
            <button
              className="button primary"
              onClick={() => {
                const i = mistakes.findIndex((m) => m.ply === practice.ply);
                setPractice(mistakes[(i + 1) % mistakes.length]);
                setPracticeMessage("");
                setPracticeSolved(false);
              }}
            >
              Posisi berikutnya <ArrowRight size={15} />
            </button>
          )}
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
  const points = review.length
    ? [review[0].before.cp, ...review.map((r) => r.after.cp)]
    : [];
  const x = (i: number) => 10 + (i / Math.max(1, total)) * 780;
  const y = (cp: number) => 55 - 39 * Math.tanh(cp / 400);
  const path = points.map((cp, i) => `${x(i)},${y(cp)}`).join(" ");
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
        {points.length > 1 && (
          <>
            <polygon
              points={`10,100 ${path} ${x(points.length - 1)},100`}
              fill="url(#chart-fill)"
            />
            <polyline
              points={path}
              fill="none"
              stroke="#5b8e72"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        <line
          x1={x(ply)}
          x2={x(ply)}
          y1="9"
          y2="99"
          stroke="#9da799"
          strokeDasharray="3 3"
        />
        {points[ply] !== undefined && (
          <circle
            cx={x(ply)}
            cy={y(points[ply])}
            r="4"
            fill="#3c7455"
            stroke="white"
            strokeWidth="2"
          />
        )}
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
