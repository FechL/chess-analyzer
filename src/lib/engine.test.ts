import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POSITION } from "chess.js";
import { LocalEngine } from "./engine";

class WorkerStub {
  static instances: WorkerStub[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: string[] = [];
  terminate = vi.fn();
  constructor(public url: string) {
    WorkerStub.instances.push(this);
  }
  postMessage(message: string) {
    this.messages.push(message);
  }
  emit(data: string) {
    this.onmessage?.({ data });
  }
}
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
describe("Stockfish UCI lifecycle", () => {
  const instances: LocalEngine[] = [];
  beforeEach(() => {
    WorkerStub.instances = [];
    vi.stubGlobal("Worker", WorkerStub);
    vi.useFakeTimers();
  });
  afterEach(() => {
    instances.forEach((e) => e.destroy());
    instances.length = 0;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const ready = async () => {
    const engine = new LocalEngine();
    instances.push(engine);
    const worker = WorkerStub.instances.at(-1)!;
    expect(worker.messages[0]).toBe("uci");
    worker.emit("uciok");
    expect(worker.messages).toContain("setoption name Hash value 64");
    worker.emit("readyok");
    await engine.ready;
    return { engine, worker };
  };
  it("waits for initialization, parses multiple PVs, and resolves bestmove", async () => {
    const { engine, worker } = await ready();
    const promise = engine.analyze(DEFAULT_POSITION, { ms: 400, multiPV: 2 });
    await flush();
    expect(worker.messages).toContain("setoption name MultiPV value 2");
    expect(worker.messages.at(-1)).toBe("go movetime 400");
    worker.emit("info depth 12 multipv 1 score cp 31 pv e2e4 e7e5");
    worker.emit("info depth 12 multipv 2 score cp 25 pv d2d4 d7d5");
    worker.emit("bestmove e2e4 ponder e7e5");
    const result = await promise;
    expect(result.cp).toBe(31);
    expect(result.depth).toBe(12);
    expect(result.lines).toHaveLength(2);
    expect(result.bestmove).toBe("e2e4");
  });
  it("serializes searches so a response cannot be assigned to a different position", async () => {
    const { engine, worker } = await ready();
    const first = engine.analyze(DEFAULT_POSITION, { ms: 200 });
    const second = engine.analyze(DEFAULT_POSITION, { ms: 500 });
    await flush();
    expect(worker.messages.filter((m) => m.startsWith("go "))).toEqual([
      "go movetime 200",
    ]);
    worker.emit("info depth 8 score cp 20 pv e2e4");
    worker.emit("bestmove e2e4");
    await first;
    await flush();
    expect(worker.messages.filter((m) => m.startsWith("go "))).toEqual([
      "go movetime 200",
      "go movetime 500",
    ]);
    worker.emit("info depth 13 score cp 35 pv d2d4");
    worker.emit("bestmove d2d4");
    expect((await second).bestmove).toBe("d2d4");
  });
  it("stops a pending search and terminates workers on teardown", async () => {
    const { engine, worker } = await ready();
    const pending = engine.analyze(DEFAULT_POSITION);
    await flush();
    engine.stop();
    expect(worker.messages.at(-1)).toBe("stop");
    engine.destroy();
    await expect(pending).rejects.toThrow("Engine ditutup");
    expect(worker.terminate).toHaveBeenCalled();
  });
  it("reports a loading timeout rather than remaining stuck forever", async () => {
    const engine = new LocalEngine();
    instances.push(engine);
    const failure = expect(engine.ready).rejects.toThrow("terlalu lama");
    await vi.advanceTimersByTimeAsync(30000);
    await failure;
    expect(WorkerStub.instances[0].terminate).toHaveBeenCalled();
  });
  it("handles terminal positions without asking the engine to search", async () => {
    const { engine, worker } = await ready();
    const result = await engine.analyze("6k1/8/8/8/8/8/5PPP/4r1K1 w - - 0 1");
    expect(result.cp).toBe(-10000);
    expect(result.bestmove).toBe("");
    expect(worker.messages.some((m) => m.startsWith("go "))).toBe(false);
  });
});
