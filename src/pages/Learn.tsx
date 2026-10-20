import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  GraduationCap,
  Lightbulb,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import Board from "../components/Board";
import { Modal, NavigationControls, ProgressRing } from "../components/Common";
import { LESSONS, OPENINGS, PUZZLES } from "../data/content";
import type { Exercise, Opening } from "../data/content";
import { readStorage, writeStorage } from "../lib/chess";
import type { Settings } from "../App";

export function OpeningsPage({
  settings,
  onAnalyze,
}: {
  settings: Settings;
  onAnalyze: (fen: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Opening>();
  const [completed, setCompleted] = useState<string[]>(() =>
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
          <div className="eyebrow">OPENING EXPLORER</div>
          <h1>
            Langkah pertama.
            <br />
            Rencana yang lebih besar<span>.</span>
          </h1>
          <p>Jangan hanya menghafal. Temukan alasan di balik setiap langkah.</p>
        </div>
        <div className="learning-counter">
          <GitOpening />
          <strong>{OPENINGS.length}</strong>
          <span>
            opening pilihan
            <br />
            untuk repertoarmu
          </span>
        </div>
      </div>
      <div className="feature-banner">
        <div className="feature-chess-icon">♘</div>
        <div>
          <span className="small-label">REKOMENDASI UNTUK MEMULAI</span>
          <h2>Italian Game. Klasik untuk sebuah alasan.</h2>
          <p>
            Kontrol pusat, kembangkan buah, dan amankan raja. Semua dalam satu
            opening.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => setSelected(OPENINGS[0])}
        >
          Pelajari sekarang <ArrowRight size={16} />
        </button>
      </div>
      <div className="catalog-toolbar">
        <div className="segmented">
          {[
            ["all", "Semua opening"],
            ["w", "Untuk putih"],
            ["b", "Untuk hitam"],
          ].map(([id, label]) => (
            <button
              className={filter === id ? "active" : ""}
              key={id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari opening atau kode ECO…"
            aria-label="Cari opening"
          />
        </label>
      </div>
      <div className="opening-grid">
        {openings.map((o, i) => {
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
                  setSelected(o);
                }
              }}
              onClick={() => setSelected(o)}
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
                <span className="eco-label">{o.eco}</span>
                {completed.includes(o.id) && (
                  <span className="complete-badge">
                    <Check size={13} /> Dipelajari
                  </span>
                )}
              </div>
              <div className="opening-card-content">
                <div className="opening-card-meta">
                  <span>{o.side === "w" ? "● Putih" : "● Hitam"}</span>
                  <span>{o.level}</span>
                </div>
                <h3>
                  {o.name}
                  <ArrowRight size={18} />
                </h3>
                <p>{o.description}</p>
                <div className="opening-moves">
                  {o.moves.slice(0, 6).map((m, j) => (
                    <span key={j}>
                      {j % 2 === 0 ? `${Math.floor(j / 2) + 1}. ` : ""}
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!openings.length && (
        <div className="empty-state">
          <Search size={32} />
          <h3>Opening belum ditemukan</h3>
          <p>Coba nama, kode ECO, atau filter lain.</p>
        </div>
      )}
      <p className="content-note">
        Repertoar lokal terkurasi · Jalur contoh untuk belajar, bukan database
        statistik pertandingan.
      </p>
      {selected && (
        <Modal
          title={selected.name}
          onClose={() => setSelected(undefined)}
          wide
        >
          <div className="study-layout">
            <div>
              <LineTrainer
                key={selected.id}
                fen={DEFAULT_POSITION}
                moves={selected.moves}
                color={selected.side}
                theme={settings.boardTheme}
                title="Latih urutan opening"
                onComplete={() => {
                  const next = [...new Set([...completed, selected.id])];
                  setCompleted(next);
                  writeStorage("kuda-openings", next);
                }}
                onAnalyze={(fen) => {
                  onAnalyze(fen, selected.name);
                  setSelected(undefined);
                }}
              />
            </div>
            <div className="study-theory">
              <span className="subtle-pill">
                {selected.eco} · {selected.category}
              </span>
              <h3>Pahami idenya.</h3>
              <p>{selected.description}</p>
              <ol>
                {selected.ideas.map((idea, i) => (
                  <li key={i}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {idea}
                  </li>
                ))}
              </ol>
              <div className="study-tip">
                <Lightbulb size={18} />
                <p>{selected.tip}</p>
              </div>
              <p className="muted">
                Mainkan buah {selected.side === "w" ? "putih" : "hitam"} pada
                mode latihan. Lawan membalas otomatis sesuai jalur contoh.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function GitOpening() {
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
          <div className="eyebrow">AKADEMI KUDA</div>
          <h1>
            Pahami satu ide.
            <br />
            Naik satu tingkat<span>.</span>
          </h1>
          <p>Pelajaran singkat. Papan interaktif. Pemahaman yang bertahan.</p>
        </div>
        <div className="academy-progress">
          <ProgressRing percent={percent} size={62} />
          <div>
            <strong>Perjalanan belajarmu</strong>
            <span>
              {completed.length} dari {LESSONS.length} pelajaran selesai
            </span>
          </div>
        </div>
      </div>
      <div className="academy-feature">
        <div className="academy-feature-copy">
          <span className="small-label">MULAI DARI FONDASI</span>
          <h2>
            Permainan hebat dimulai
            <br />
            dari kebiasaan kecil.
          </h2>
          <p>
            Kuasai pusat, aktifkan buah, dan jaga raja. Jadikan tiga prinsip ini
            bagian dari setiap permainan.
          </p>
          <button
            className="button primary"
            onClick={() =>
              setSelected(
                LESSONS.find((l) => !completed.includes(l.id)) ?? LESSONS[0],
              )
            }
          >
            Lanjutkan belajar <ArrowRight size={16} />
          </button>
        </div>
        <div className="academy-illustration" aria-hidden="true">
          <div className="illustration-board" />
          {["wN", "wK", "wB"].map((p, i) => (
            <img
              className={`hero-piece piece-${i}`}
              key={p}
              src={`/pieces/${p}.svg`}
              alt=""
            />
          ))}
          <span className="illustration-spark spark-1">✦</span>
          <span className="illustration-spark spark-2">✦</span>
          <span className="illustration-note">
            <CheckCheck size={15} /> Sedikit latihan, setiap hari.
          </span>
        </div>
      </div>
      <div className="catalog-toolbar">
        <div className="segmented wrap">
          {categories.map((c) => (
            <button
              className={category === c ? "active" : ""}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="muted">Belajar dengan ritmemu sendiri</span>
      </div>
      <div className="lesson-grid">
        {LESSONS.filter(
          (l) => category === "Semua" || l.category === category,
        ).map((l, i) => (
          <button
            key={l.id}
            className="lesson-card"
            onClick={() => setSelected(l)}
          >
            <div className="lesson-top">
              <span className={`lesson-icon tone-${i % 3}`}>
                {l.category === "Taktik" ? (
                  <Target size={24} />
                ) : l.category === "Endgame" ? (
                  <Flag size={24} />
                ) : l.category === "Skakmat" ? (
                  <Trophy size={24} />
                ) : (
                  <GraduationCap size={24} />
                )}
              </span>
              {completed.includes(l.id) ? (
                <span className="lesson-done">
                  <Check size={14} /> Selesai
                </span>
              ) : (
                <span className="lesson-number">
                  {String(LESSONS.indexOf(l) + 1).padStart(2, "0")}
                </span>
              )}
            </div>
            <span className="small-label">
              {l.category} · {l.level}
            </span>
            <h3>{l.title}</h3>
            <p>{l.description}</p>
            <div className="lesson-bottom">
              <span>
                <Clock3 size={13} />
                {l.minutes} menit
              </span>
              <span>
                Mulai pelajaran <ArrowRight size={14} />
              </span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <Modal
          title={selected.title}
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
              title={selected.description}
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
                {selected.category} · {selected.minutes} menit
              </span>
              <h3>Ide yang perlu dibawa.</h3>
              <ol>
                {selected.theory.map((t, i) => (
                  <li key={i}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {t}
                  </li>
                ))}
              </ol>
              <div className="study-tip">
                <Lightbulb size={18} />
                <p>
                  Baca posisi, periksa ancaman, lalu coba langkahmu langsung di
                  papan.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
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
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>(() =>
    readStorage("kuda-puzzles", []),
  );
  const puzzle = PUZZLES[index];
  return (
    <div className="page puzzle-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">LATIHAN TAKTIK</div>
          <h1>
            Lihat yang tidak terlihat<span>.</span>
          </h1>
          <p>Latih mata untuk menemukan peluang dalam satu posisi.</p>
        </div>
        <div className="puzzle-counter">
          <Target size={23} />
          <strong>
            {completed.length}
            <span>/{PUZZLES.length}</span>
          </strong>
          <span>tantangan selesai</span>
        </div>
      </div>
      <div className="puzzle-layout">
        <section className="puzzle-board-card">
          <div className="puzzle-title">
            <span className="subtle-pill">{puzzle.level}</span>
            <h2>{puzzle.title}</h2>
            <span>
              {index + 1} / {PUZZLES.length}
            </span>
          </div>
          <LineTrainer
            key={puzzle.id}
            fen={puzzle.fen}
            moves={puzzle.solution}
            color={puzzle.fen.split(" ")[1] as "w" | "b"}
            theme={settings.boardTheme}
            title={puzzle.description}
            hint={puzzle.hint}
            explanation={puzzle.explanation}
            startTraining
            puzzleMode
            onComplete={() => {
              const next = [...new Set([...completed, puzzle.id])];
              setCompleted(next);
              writeStorage("kuda-puzzles", next);
            }}
            onAnalyze={(fen) => onAnalyze(fen, puzzle.title)}
          />
          <div className="puzzle-navigation">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ChevronLeft size={15} /> Sebelumnya
            </button>
            <button
              className="button primary"
              onClick={() => setIndex((i) => (i + 1) % PUZZLES.length)}
            >
              Tantangan berikutnya <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <aside className="puzzle-sidebar">
          <div className="puzzle-sidebar-head">
            <Sparkles size={19} />
            <h3>Latihan kecil, dampak besar.</h3>
            <p>
              Periksa skak, tangkapan, lalu ancaman. Luangkan waktu sebelum
              menggerakkan buah.
            </p>
          </div>
          <span className="section-label">KOLEKSI TANTANGAN</span>
          {PUZZLES.map((p, i) => (
            <button
              key={p.id}
              className={`puzzle-list-item ${index === i ? "active" : ""}`}
              onClick={() => setIndex(i)}
            >
              <span>
                {completed.includes(p.id) ? (
                  <Check size={16} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <strong>{p.title}</strong>
                <small>{p.category}</small>
              </div>
              <ChevronRight size={15} />
            </button>
          ))}
          <div className="study-tip">
            <BookOpen size={18} />
            <p>
              Tantangan di sini disusun untuk belajar pola, tanpa rating
              kompetitif atau statistik pemain buatan.
            </p>
          </div>
        </aside>
      </div>
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
  onComplete: () => void;
  onAnalyze: (fen: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [training, setTraining] = useState(startTraining);
  const [feedback, setFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [alternateFen, setAlternateFen] = useState<string>();
  const counted = useRef(false);
  const chess = useMemo(() => {
    if (alternateFen) return new Chess(alternateFen);
    const c = new Chess(fen);
    moves.slice(0, step).forEach((m) => c.move(m));
    return c;
  }, [fen, moves, step, alternateFen]);
  const done = step === moves.length;
  const isOpponent = training && !done && chess.turn() !== color;
  const last = chess.history({ verbose: true }).at(-1);
  useEffect(() => {
    if (isOpponent) {
      const timer = setTimeout(() => setStep((s) => s + 1), 550);
      return () => clearTimeout(timer);
    }
  }, [isOpponent, step]);
  useEffect(() => {
    if (done && training && !revealed && !counted.current) {
      counted.current = true;
      onComplete();
    }
  }, [done, training, revealed, onComplete]);
  const reset = (train: boolean) => {
    setTraining(train);
    setStep(0);
    setFeedback("");
    setShowHint(false);
    setRevealed(false);
    setAlternateFen(undefined);
    counted.current = false;
  };
  const attempt = (from: string, to: string, promotion = "q") => {
    try {
      const copy = new Chess(chess.fen());
      const m = copy.move({ from, to, promotion });
      if (m.san === moves[step]) {
        setStep((s) => s + 1);
        setFeedback("Tepat. Lanjutkan idemu!");
        return true;
      }
      // Accept any immediate checkmate when a single-move mate is the exercise objective.
      if (
        step === moves.length - 1 &&
        moves[step].endsWith("#") &&
        copy.isCheckmate()
      ) {
        setAlternateFen(copy.fen());
        setStep(moves.length);
        setFeedback(`Tepat! ${m.san} juga memberi skakmat.`);
        return true;
      }
      setFeedback(
        "Langkah legal, tetapi belum sesuai ide latihan. Periksa petunjuk dan coba lagi.",
      );
      return false;
    } catch {
      return false;
    }
  };
  return (
    <div className="line-trainer">
      {!puzzleMode && (
        <div className="trainer-mode">
          <button
            className={!training ? "active" : ""}
            onClick={() => reset(false)}
          >
            <BookOpen size={14} /> Pelajari
          </button>
          <button
            className={training ? "active" : ""}
            onClick={() => reset(true)}
          >
            <Target size={14} /> Latihan
          </button>
        </div>
      )}
      <div className="trainer-instruction">
        <span className="status-dot" />
        {done
          ? revealed
            ? "Jawaban ditampilkan"
            : "Jalur selesai!"
          : isOpponent
            ? "Lawan membalas…"
            : training
              ? `${color === "w" ? "Putih" : "Hitam"} melangkah`
              : "Jelajahi urutan langkah"}
        <span>
          {step}/{moves.length}
        </span>
      </div>
      <Board
        fen={chess.fen()}
        flipped={color === "b"}
        theme={theme}
        lastMove={last}
        onMove={training ? attempt : undefined}
        disabled={!training || isOpponent || done}
      />
      {!training && (
        <NavigationControls
          ply={step}
          total={moves.length}
          onChange={setStep}
        />
      )}
      <div
        className={`exercise-feedback ${done && !revealed ? "success" : ""}`}
        aria-live="polite"
      >
        {done ? (
          <>
            <CheckCheck size={18} />
            <span>
              {explanation ||
                "Kamu sudah mempelajari jalur ini. Ulangi beberapa kali sampai memahami idenya."}
            </span>
          </>
        ) : (
          feedback || title
        )}
      </div>
      {!done && training && (
        <div className="trainer-actions">
          <button
            className="text-button"
            onClick={() => setShowHint((v) => !v)}
          >
            <Lightbulb size={15} /> Petunjuk
          </button>
          <button
            className="text-button"
            onClick={() => {
              setRevealed(true);
              setTraining(false);
              setStep(moves.length);
            }}
          >
            Lihat jawaban
          </button>
        </div>
      )}
      {showHint && !done && (
        <div className="hint-box">
          {hint ||
            `Langkah berikutnya: ${moves[step]}. Ingat ide perkembangan dan kontrol pusat.`}
        </div>
      )}
      {done && (
        <div className="trainer-actions">
          <button className="button secondary" onClick={() => reset(true)}>
            <RotateCcw size={14} /> Ulangi latihan
          </button>
          <button
            className="text-button"
            onClick={() => onAnalyze(chess.fen())}
          >
            Analisis posisi <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
