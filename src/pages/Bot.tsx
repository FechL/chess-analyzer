// i18n: rendered text
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Clock3,
  Flag,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Undo2,
} from "lucide-react";
import Board from "../components/Board";
import { Modal, MoveList, PlayerRow } from "../components/Common";
import { useEngine } from "../hooks/useEngine";
import { gameStatus, parseGame, pvToSan } from "../lib/chess";
import type { GameData } from "../lib/chess";
import type { Settings } from "../App";

const LEVELS = [
  {
    id: 0,
    name: "Teman belajar",
    person: "Nara",
    skill: 0,
    ms: 120,
    description: "Mulai dengan tenang. Ada ruang untuk mencoba dan belajar.",
    icon: "seed",
  },
  {
    id: 1,
    name: "Pemain santai",
    person: "Raka",
    skill: 4,
    ms: 220,
    description: "Lawan yang lebih teliti untuk menguji kebiasaan baikmu.",
    icon: "leaf",
  },
  {
    id: 2,
    name: "Pemain klub",
    person: "Aruna",
    skill: 10,
    ms: 450,
    description:
      "Siap menemukan taktik dan memanfaatkan langkah yang terlewat.",
    icon: "sun",
  },
  {
    id: 3,
    name: "Tantangan penuh",
    person: "Atlas",
    skill: 20,
    ms: 1000,
    description: "Stockfish pada kekuatan penuh dalam batas waktu satu detik.",
    icon: "mountain",
  },
];
function cloneGame(c: Chess) {
  const next = new Chess();
  next.loadPgn(c.pgn());
  return next;
}
export default function BotPage({
  settings,
  analysisFen,
  onReview,
}: {
  settings: Settings;
  analysisFen: string;
  onReview: (game: GameData) => void;
}) {
  const { t } = useI18n();

  const [chess, setChess] = useState(() => new Chess());
  const [level, setLevel] = useState(0);
  const [side, setSide] = useState("w");
  const [human, setHuman] = useState<"w" | "b">("w");
  const [time, setTime] = useState(0);
  const [clocks, setClocks] = useState({ w: 0, b: 0 });
  const [fromPosition, setFromPosition] = useState(false);
  const [started, setStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [hint, setHint] = useState("");
  const [hintArrow, setHintArrow] = useState("");
  const [error, setError] = useState("");
  const [confirmResign, setConfirmResign] = useState(false);
  const { engine, status, error: engineError } = useEngine();
  const request = useRef(0);
  const fen = chess.fen();
  const current = LEVELS[level];
  const ended = chess.isGameOver() || !!outcome;
  const history = chess.history({ verbose: true });
  useEffect(() => {
    if (
      !started ||
      ended ||
      chess.turn() === human ||
      status !== "ready" ||
      !engine.current
    )
      return;
    const id = ++request.current;
    const instance = engine.current;
    setThinking(true);
    setHint("");
    setHintArrow("");
    const timer = setTimeout(() => {
      instance
        .analyze(fen, { ms: current.ms, skill: current.skill })
        .then((result) => {
          if (id !== request.current) return;
          if (result.bestmove && result.bestmove !== "(none)") {
            const c = cloneGame(chess);
            c.move({
              from: result.bestmove.slice(0, 2),
              to: result.bestmove.slice(2, 4),
              promotion: result.bestmove[4],
            });
            setChess(c);
          }
          setThinking(false);
        })
        .catch((e) => {
          if (id === request.current) {
            setError(e.message);
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
  }, [fen, started, ended, human, status, current.ms, current.skill]);
  useEffect(() => {
    if (!started || ended || !time) return;
    const turn = chess.turn();
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - last) / 1000;
      last = now;
      setClocks((c) => ({ ...c, [turn]: Math.max(0, c[turn] - elapsed) }));
    }, 100);
    return () => clearInterval(timer);
  }, [fen, started, ended, time]);
  useEffect(() => {
    if (started && time && !ended && (clocks.w <= 0 || clocks.b <= 0)) {
      request.current++;
      engine.current?.stop();
      setOutcome(
        `Waktu ${clocks.w <= 0 ? "putih" : "hitam"} habis. Permainan selesai.`,
      );
    }
  }, [clocks, started, time, ended]);
  const start = () => {
    request.current++;
    engine.current?.stop();
    setChess(fromPosition ? new Chess(analysisFen) : new Chess());
    setHuman(
      side === "random"
        ? Math.random() < 0.5
          ? "w"
          : "b"
        : (side as "w" | "b"),
    );
    setClocks({ w: time * 60, b: time * 60 });
    setStarted(true);
    setOutcome("");
    setHint("");
    setHintArrow("");
    setError("");
  };
  const move = (from: string, to: string, promotion = "q") => {
    if (!started || ended || thinking || chess.turn() !== human) return false;
    try {
      const c = cloneGame(chess);
      c.move({ from, to, promotion });
      setChess(c);
      setHint("");
      setHintArrow("");
      return true;
    } catch {
      return false;
    }
  };
  const undo = () => {
    request.current++;
    engine.current?.stop();
    const c = cloneGame(chess);
    c.undo();
    if (c.turn() !== human) c.undo();
    setChess(c);
    setOutcome("");
    setThinking(false);
    setHint("");
    setHintArrow("");
  };
  const getHint = async () => {
    if (!engine.current || chess.turn() !== human || ended) return;
    const id = request.current;
    const currentFen = fen;
    setHint("Mencari ide…");
    try {
      const e = await engine.current.analyze(fen, { ms: 600, skill: 20 });
      if (request.current === id && currentFen === chess.fen()) {
        setHint(
          `Coba ${pvToSan(fen, [e.bestmove])[0] ?? "memeriksa ancaman lawan"}. Perhatikan arah panah di papan.`,
        );
        setHintArrow(e.bestmove);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const review = () => {
    const game = parseGame(chess.pgn());
    game.white = human === "w" ? "Anda" : current.person;
    game.black = human === "b" ? "Anda" : current.person;
    game.event = `Latihan vs ${current.person}`;
    if (outcome.includes("menyerah"))
      game.result = human === "w" ? "0-1" : "1-0";
    onReview(game);
  };
  const clock = (color: "w" | "b") => {
    const seconds = Math.ceil(clocks[color]);
    return (
      <span
        className={`chess-clock ${started && !ended && chess.turn() === color ? "clock-active" : ""}`}
      >
        {t(
          time
            ? `${Math.floor(seconds / 60)
                .toString()
                .padStart(
                  2,
                  "0",
                )}:${(seconds % 60).toString().padStart(2, "0")}`
            : "∞",
        )}
      </span>
    );
  };
  return (
    <div className="page bot-page">
      <div className="bot-layout">
        <section className="bot-board-area">
          <PlayerRow
            name={current.person}
            color={human === "w" ? "b" : "w"}
            subtitle={t(thinking ? "Sedang berpikir…" : current.name)}
            active={thinking}
            right={clock(human === "w" ? "b" : "w")}
          />
          <Board
            fen={fen}
            flipped={human === "b"}
            theme={settings.boardTheme}
            onMove={move}
            lastMove={history.at(-1)}
            disabled={!started || ended || thinking || chess.turn() !== human}
            arrow={hintArrow}
          />
          <PlayerRow
            name="Anda"
            color={human}
            subtitle={t(
              started ? "Nikmati permainannya." : "Siap untuk langkah pertama?",
            )}
            active={started && !ended && chess.turn() === human}
            right={clock(human)}
          />
          <div className="bot-board-actions">
            <button
              className="button secondary"
              disabled={!started || !history.length}
              onClick={undo}
            >
              <Undo2 size={15} />
              {t(" Ulang langkah")}
            </button>
            <button
              className="button secondary"
              disabled={
                !started ||
                ended ||
                thinking ||
                chess.turn() !== human ||
                status !== "ready"
              }
              onClick={getHint}
            >
              <Lightbulb size={15} />
              {t(" Petunjuk")}
            </button>
            <button
              className="button subtle"
              disabled={!started || ended}
              onClick={() => setConfirmResign(true)}
            >
              <Flag size={15} />
              {t(" Menyerah")}
            </button>
          </div>
          {t(
            hint && (
              <div className="hint-box" aria-live="polite">
                <Lightbulb size={16} />
                {t(hint)}
              </div>
            ),
          )}
          {t(
            started && (
              <div
                className={`bot-game-status ${ended ? "finished" : ""}`}
                aria-live="polite"
              >
                {t(
                  ended ? (
                    <TrophyIcon />
                  ) : thinking ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <span className="status-dot" />
                  ),
                )}
                <span>{t(outcome || gameStatus(chess))}</span>
                {t(
                  ended && (
                    <button className="text-button" onClick={review}>
                      {t("Ulas permainan ")}
                      <ArrowRight size={14} />
                    </button>
                  ),
                )}
              </div>
            ),
          )}
        </section>
        <aside className="bot-config">
          <div className="bot-engine-status">
            <span className="subtle-pill">
              <CpuIcon />
              {t(" Stockfish lokal")}
            </span>
          </div>
          <div className="bot-persona">
            <div className={`bot-avatar avatar-${level}`}>
              <img
                src={`/pieces/${level % 2 === 0 ? "wN" : "bN"}.svg`}
                alt={t("")}
              />
              <span className="status-dot" />
            </div>
            <span className="small-label">{t("TEMAN LATIHANMU")}</span>
            <h2>{t(current.person)}</h2>
            <p>{t(current.description)}</p>
          </div>
          <div className="config-group">
            <label>{t("Pilih tantangan")}</label>
            <div className="bot-levels">
              {t(
                LEVELS.map((l) => (
                  <button
                    key={l.id}
                    className={level === l.id ? "active" : ""}
                    disabled={started && !ended}
                    onClick={() => setLevel(l.id)}
                  >
                    <span>{t(l.id + 1)}</span>
                    <div>
                      <strong>{t(l.person)}</strong>
                      <small>{t(l.name)}</small>
                    </div>
                    {t(level === l.id && <CheckIcon />)}
                  </button>
                )),
              )}
            </div>
          </div>
          <div className="config-group">
            <label>{t("Main sebagai")}</label>
            <div className="color-choices">
              {t(
                [
                  ["w", "Putih"],
                  ["random", "Acak"],
                  ["b", "Hitam"],
                ].map(([id, label]) => (
                  <button
                    className={side === id ? "active" : ""}
                    key={id}
                    disabled={started && !ended}
                    onClick={() => setSide(id)}
                  >
                    {t(
                      id === "random" ? (
                        <Swords size={19} />
                      ) : (
                        <img src={`/pieces/${id}K.svg`} alt={t("")} />
                      ),
                    )}
                    {t(label)}
                  </button>
                )),
              )}
            </div>
          </div>
          <div className="config-group">
            <label htmlFor="bot-time">
              <Clock3 size={14} />
              {t(" Waktu permainan")}
            </label>
            <select
              id="bot-time"
              value={time}
              disabled={started && !ended}
              onChange={(e) => setTime(Number(e.target.value))}
            >
              <option value={0}>{t("Tanpa batas · latihan santai")}</option>
              <option value={5}>{t("5 menit per pemain")}</option>
              <option value={10}>{t("10 menit per pemain")}</option>
            </select>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={fromPosition}
              disabled={started && !ended}
              onChange={(e) => setFromPosition(e.target.checked)}
            />
            {t(" ")}
            {t("Mulai dari posisi analisis terakhir")}
          </label>
          {t(
            (error || engineError) && (
              <div className="error-message">{t(error || engineError)}</div>
            ),
          )}
          <button
            className="button primary full"
            disabled={status !== "ready"}
            onClick={start}
          >
            {t(
              status === "loading" ? (
                <LoaderCircle className="spin" size={16} />
              ) : started ? (
                <RotateCcw size={16} />
              ) : (
                <Play size={16} />
              ),
            )}
            {t(" ")}
            {t(
              status === "loading"
                ? "Menyiapkan Stockfish…"
                : started
                  ? "Mulai ulang permainan"
                  : "Mulai permainan",
            )}
          </button>
          {t(
            started && (
              <button
                className="text-button full"
                onClick={() => {
                  request.current++;
                  engine.current?.stop();
                  setStarted(false);
                  setThinking(false);
                  setOutcome("");
                }}
              >
                {t("Ubah pengaturan permainan")}
              </button>
            ),
          )}
          <p className="bot-note">
            <Shield size={14} />
            {t(
              " Level adalah preset latihan, bukan rating Elo terkalibrasi. Jam pada mode latihan dapat dipulihkan dengan memulai ulang.",
            )}
          </p>
          {t(
            history.length > 0 && (
              <div className="bot-notation">
                <div className="notation-heading">
                  <span>{t("Langkah permainan")}</span>
                  <button className="text-button" onClick={review}>
                    {t("Analisis ")}
                    <ArrowRight size={12} />
                  </button>
                </div>
                <MoveList
                  moves={history.map((m) => m.san)}
                  ply={history.length}
                  startFen={history[0].before}
                />
              </div>
            ),
          )}
        </aside>
      </div>
      {t(
        confirmResign && (
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
                  request.current++;
                  engine.current?.stop();
                  setThinking(false);
                  setOutcome("Anda menyerah. Bot menang.");
                  setConfirmResign(false);
                }}
              >
                {t("Menyerah")}
              </button>
            </div>
          </Modal>
        ),
      )}
    </div>
  );
}
function CpuIcon() {
  const { t } = useI18n();

  return <Bot size={14} />;
}
function CheckIcon() {
  const { t } = useI18n();

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
function TrophyIcon() {
  const { t } = useI18n();

  return <Sparkles size={18} />;
}
