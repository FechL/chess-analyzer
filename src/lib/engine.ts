import { Chess } from "chess.js";
import { parseInfo } from "./chess";
import type { EngineLine, Evaluation } from "./chess";

export class LocalEngine {
  private worker: Worker;
  private queue: Promise<unknown> = Promise.resolve();
  private pending?: {
    fen: string;
    lines: Map<number, EngineLine>;
    resolve: (e: Evaluation) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    onInfo?: (e: Evaluation) => void;
  };
  private readyResolve!: () => void;
  private readyReject!: (e: Error) => void;
  private initTimer: ReturnType<typeof setTimeout>;
  private dead = false;
  ready: Promise<void>;
  constructor() {
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    // Attach a handler immediately: teardown during React StrictMode must not cause an unhandled rejection.
    this.ready.catch(() => {});
    this.worker = new Worker("/engine/stockfish.js");
    this.worker.onmessage = (e) => this.handle(String(e.data));
    this.worker.onerror = () =>
      this.fail(
        new Error(
          "Stockfish gagal dimuat. Jalankan npm run prepare:engine, lalu muat ulang halaman.",
        ),
      );
    this.initTimer = setTimeout(
      () =>
        this.fail(
          new Error(
            "Stockfish terlalu lama dimuat. Muat ulang halaman untuk mencoba kembali.",
          ),
        ),
      30000,
    );
    this.send("uci");
  }
  private send(cmd: string) {
    if (!this.dead) this.worker.postMessage(cmd);
  }
  private snapshot(): Evaluation {
    const p = this.pending!;
    const lines = [...p.lines.values()].sort((a, b) => a.multipv - b.multipv);
    return {
      fen: p.fen,
      lines,
      bestmove: lines[0]?.pv[0] ?? "",
      depth: lines[0]?.depth ?? 0,
      cp: lines[0]?.cp ?? 0,
      mate: lines[0]?.mate,
    };
  }
  private handle(text: string) {
    if (text === "uciok") {
      this.send("setoption name Hash value 64");
      this.send("isready");
    }
    if (text === "readyok") {
      clearTimeout(this.initTimer);
      this.readyResolve();
    }
    const p = this.pending;
    if (!p) return;
    const info = parseInfo(text, p.fen.split(" ")[1] as "w" | "b");
    if (info) {
      p.lines.set(info.multipv, info);
      p.onInfo?.(this.snapshot());
    }
    if (text.startsWith("bestmove ")) {
      clearTimeout(p.timer);
      const evaluation = this.snapshot();
      evaluation.bestmove = text.split(" ")[1];
      this.pending = undefined;
      p.resolve(evaluation);
    }
  }
  analyze(
    fen: string,
    options: {
      ms?: number;
      multiPV?: number;
      skill?: number;
      onInfo?: (e: Evaluation) => void;
    } = {},
  ): Promise<Evaluation> {
    const run = async () => {
      await this.ready;
      if (this.dead) throw new Error("Engine sudah dihentikan.");
      const chess = new Chess(fen);
      if (chess.isGameOver())
        return {
          fen,
          lines: [],
          bestmove: "",
          depth: 0,
          cp: chess.isCheckmate() ? (chess.turn() === "w" ? -10000 : 10000) : 0,
          mate: chess.isCheckmate() ? 0 : undefined,
        };
      return new Promise<Evaluation>((resolve, reject) => {
        const ms = options.ms ?? 650;
        this.pending = {
          fen,
          lines: new Map(),
          resolve,
          reject,
          onInfo: options.onInfo,
          timer: setTimeout(
            () =>
              this.fail(
                new Error(
                  "Analisis terhenti. Muat ulang untuk memulai ulang engine.",
                ),
              ),
            ms + 15000,
          ),
        };
        this.send(`setoption name MultiPV value ${options.multiPV ?? 1}`);
        this.send(`setoption name Skill Level value ${options.skill ?? 20}`);
        this.send(`position fen ${fen}`);
        this.send(`go movetime ${ms}`);
      });
    };
    const task = this.queue.then(run);
    this.queue = task.catch(() => {});
    return task;
  }
  stop() {
    if (this.pending) this.send("stop");
  }
  private fail(error: Error) {
    clearTimeout(this.initTimer);
    this.readyReject(error);
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = undefined;
    }
    this.dead = true;
    this.worker.terminate();
  }
  destroy() {
    this.fail(new Error("Engine ditutup."));
  }
}
