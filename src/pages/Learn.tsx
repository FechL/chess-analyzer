import Title from "../components/Title";
// i18n: rendered text
import { pieceAsset } from "../lib/preferences";
import { useI18n } from "@/lib/i18n";
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
import { LESSONS, OPENINGS } from "../data/content";
import type { Exercise } from "../data/content";
import { readStorage, writeStorage } from "../lib/chess";
import {
  cachedPuzzles,
  consumePuzzle,
  ensurePuzzles,
} from "../lib/lichess-puzzles";
import type { LichessPuzzle, PuzzleDifficulty } from "../lib/lichess-puzzles";
import type { Settings } from "../App";

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
          <Title as="h2">{t("Italian Game. Klasik untuk sebuah alasan.")}</Title>
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
  onAnalyze,
}: {
  settings: Settings;
  onAnalyze: (fen: string, name: string) => void;
}) {
  const { t } = useI18n();

  const [theme, setTheme] = useState("mix");
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("normal");
  const [queue, setQueue] = useState<LichessPuzzle[]>(() =>
    cachedPuzzles("mix", "normal"),
  );
  const [puzzle, setPuzzle] = useState<LichessPuzzle | undefined>(
    () => cachedPuzzles("mix", "normal")[0],
  );
  const [completed, setCompleted] = useState<string[]>(() =>
    readStorage("kuda-lichess-completed", []),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const load = async (next = false) => {
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    if (next && puzzle) consumePuzzle(theme, difficulty, puzzle.id);
    try {
      const available = await ensurePuzzles(theme, difficulty);
      if (id !== requestId.current) return;
      setQueue(available);
      setPuzzle(available[0]);
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
    setQueue(available);
    void load();
    return () => {
      requestId.current++;
    };
  }, [theme, difficulty]);
  const complete = () => {
    if (!puzzle) return;
    const next = [...new Set([...completed, puzzle.id])];
    setCompleted(next);
    writeStorage("kuda-lichess-completed", next);
    consumePuzzle(theme, difficulty, puzzle.id);
    const id = requestId.current;
    void ensurePuzzles(theme, difficulty)
      .then((items) => {
        if (id === requestId.current) setQueue(items);
      })
      .catch((e) => {
        if (id === requestId.current) setError((e as Error).message);
      });
  };
  return (
    <div className="page puzzle-page">
      <div className="page-intro">
        <div>
          <Title as="h1">{t("Puzzle")}</Title>
          <p>{t("Temukan langkah terbaik dari permainan nyata di Lichess.")}</p>
        </div>
        <div className="puzzle-counter">
          <Target size={22} />
          <strong>{t(completed.length)}</strong>
          <span>{t("puzzle selesai")}</span>
        </div>
      </div>
      <div className="puzzle-layout">
        <section className="puzzle-board-card">
          {t(
            puzzle ? (
              <>
                <div className="puzzle-title">
                  <span className="subtle-pill">
                    {t("Rating ")}
                    {t(puzzle.rating)}
                  </span>
                  <Title as="h2">
                    {t("Puzzle #")}
                    {t(puzzle.id)}
                  </Title>
                  <a href={puzzle.url} target="_blank" rel="noreferrer">
                    {t("Lichess ↗")}
                  </a>
                </div>
                <LineTrainer
                  key={puzzle.id}
                  fen={puzzle.fen}
                  moves={puzzle.solution}
                  color={puzzle.fen.split(" ")[1] as "w" | "b"}
                  theme={settings.boardTheme}
                  title={t(
                    "Temukan langkah terbaik. Periksa skak, tangkapan, dan ancaman.",
                  )}
                  hint="Cari langkah yang memaksa balasan lawan."
                  explanation="Puzzle selesai. Semua langkah solusi sudah ditemukan."
                  startTraining
                  puzzleMode
                  onComplete={complete}
                  onAnalyze={(fen) =>
                    onAnalyze(fen, "Puzzle Lichess #" + puzzle.id)
                  }
                />
              </>
            ) : (
              <div className="puzzle-loading" role="status">
                {t(
                  busy
                    ? "Mengambil puzzle dari Lichess…"
                    : "Pilih tema untuk memulai puzzle.",
                )}
              </div>
            ),
          )}
          <div className="puzzle-navigation">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void load(true)}
            >
              {t("Puzzle berikutnya ")}
              <ArrowRight size={15} />
            </button>
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
        </section>
        <aside className="puzzle-sidebar">
          <div className="puzzle-sidebar-head">
            <Target size={22} />
            <Title as="h3">{t("Puzzle Lichess")}</Title>
            <p>
              {t(
                "Antrean berisi hingga 5 puzzle dan diisi ulang setelah puzzle selesai.",
              )}
            </p>
          </div>
          <div className="puzzle-filter">
            <label htmlFor="puzzle-theme">{t("Tema puzzle")}</label>
            <select
              id="puzzle-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="mix">{t("Campuran")}</option>
              <option value="mateIn1">{t("Mat dalam 1 langkah")}</option>
              <option value="fork">{t("Garpu")}</option>
              <option value="pin">{t("Ikatan")}</option>
              <option value="endgame">{t("Endgame")}</option>
              <option value="sacrifice">{t("Pengorbanan")}</option>
            </select>
          </div>
          <div className="puzzle-filter">
            <label htmlFor="puzzle-difficulty">{t("Kesulitan")}</label>
            <select
              id="puzzle-difficulty"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as PuzzleDifficulty)
              }
            >
              <option value="easiest">{t("Sangat mudah")}</option>
              <option value="easier">{t("Mudah")}</option>
              <option value="normal">{t("Normal")}</option>
              <option value="harder">{t("Sulit")}</option>
              <option value="hardest">{t("Sangat sulit")}</option>
            </select>
          </div>
          <div className="puzzle-queue-count">
            <strong>
              {t(queue.length)}
              {t("/5")}
            </strong>{" "}
            <span>{t("puzzle tersimpan")}</span>
          </div>
          <a
            className="puzzle-source"
            href="https://database.lichess.org/#puzzles"
            target="_blank"
            rel="noreferrer"
          >
            {t("Sumber: database puzzle Lichess · CC0 ↗")}
          </a>
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
  const { t } = useI18n();

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
      <Board
        fen={chess.fen()}
        flipped={color === "b"}
        theme={theme}
        lastMove={last}
        onMove={training ? attempt : undefined}
        disabled={!training || isOpponent || done}
      />
      {t(
        !training && (
          <NavigationControls
            ply={step}
            total={moves.length}
            onChange={setStep}
          />
        ),
      )}
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
      {t(
        !done && training && (
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
              }}
            >
              {t("Lihat jawaban")}
            </button>
          </div>
        ),
      )}
      {t(
        showHint && !done && (
          <div className="hint-box">
            {t(
              hint ||
                `Langkah berikutnya: ${moves[step]}. Ingat ide perkembangan dan kontrol pusat.`,
            )}
          </div>
        ),
      )}
      {t(
        done && (
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
