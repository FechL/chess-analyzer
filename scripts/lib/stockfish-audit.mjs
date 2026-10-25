import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const require = createRequire(import.meta.url);
const positionKey = (fen) => fen.split(" ").slice(0, 4).join(" ");

/** Offline, one-thread Stockfish Full analysis with a resumable position cache. */
export async function stockfishAudit(cachePath) {
  let pending;
  let latest;
  const principalVariations = new Map();
  let engineName;
  let child;
  let failure;
  let cache = {};
  try {
    cache = JSON.parse(await readFile(cachePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const keepAlive = setInterval(() => {}, 1_000);
  let finishStartup;
  let failStartup;
  const startup = new Promise((resolve, reject) => {
    finishStartup = resolve;
    failStartup = reject;
  });
  const startupTimeout = setTimeout(
    () => failStartup(new Error("Stockfish did not initialize")),
    60_000,
  );
  const onLine = (line) => {
    if (line.startsWith("Stockfish ")) setTimeout(finishStartup, 0);
    if (line.startsWith("id name ")) engineName = line.slice(8);
    if (
      line.startsWith("info depth") &&
      !/\b(?:lowerbound|upperbound)\b/.test(line)
    ) {
      const score = line.match(/\bscore (cp|mate) (-?\d+)/);
      const pv = line.match(/\bpv (.+)/);
      if (score && pv) {
        const index = Number(line.match(/\bmultipv (\d+)/)?.[1] || 1);
        const evaluation = {
          cp:
            score[1] === "cp"
              ? Number(score[2])
              : Math.sign(Number(score[2])) *
                (20_000 - Math.abs(Number(score[2]))),
          mate: score[1] === "mate" ? Number(score[2]) : undefined,
          depth: Number(line.match(/\bdepth (\d+)/)?.[1]),
          pv: pv[1].split(" "),
        };
        principalVariations.set(index, evaluation);
        if (index === 1) latest = evaluation;
      }
    }
    if (!pending || !pending.match(line)) return;
    const { resolve } = pending;
    pending = undefined;
    // Let the engine finish its async search callback before the next command.
    setTimeout(() => resolve(line), 0);
  };
  const engine = process.env.STOCKFISH_PATH
    ? (() => {
        child = spawn(process.env.STOCKFISH_PATH, [], {
          stdio: ["pipe", "pipe", "inherit"],
        });
        child.on("error", (error) => {
          failure = error;
          failStartup(error);
          pending?.reject(error);
        });
        createInterface({ input: child.stdout }).on("line", onLine);
        return { processCommand: (value) => child.stdin.write(`${value}\n`) };
      })()
    : require("stockfish")("single", onLine);
  function command(value, match) {
    if (failure) return Promise.reject(failure);
    if (pending) throw new Error("Concurrent UCI command");
    return new Promise((resolve, reject) => {
      const fail = (error) => {
        clearTimeout(timeout);
        pending = undefined;
        reject(error);
      };
      const timeout = setTimeout(
        () => fail(new Error(`Stockfish timed out: ${value}`)),
        60_000,
      );
      pending = {
        match,
        reject: fail,
        resolve: (line) => {
          clearTimeout(timeout);
          resolve(line);
        },
      };
      engine.processCommand(value);
    });
  }
  // Wait for the engine banner: Stockfish.js replaces its early command queue
  // during WASM initialization, whose duration varies between computers.
  try {
    await startup;
    clearTimeout(startupTimeout);
    await command("uci", (line) => line === "uciok");
    if (!engineName?.startsWith("Stockfish 19") || /Lite/i.test(engineName)) {
      throw new Error(
        `This audit requires Stockfish 19 Full; received ${engineName}`,
      );
    }
    engine.processCommand("setoption name Threads value 1");
    engine.processCommand("setoption name Hash value 64");
    await command("isready", (line) => line === "readyok");
  } catch (error) {
    clearTimeout(startupTimeout);
    clearInterval(keepAlive);
    child?.kill();
    throw error;
  }
  let searches = 0;
  async function save() {
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(`${cachePath}.tmp`, JSON.stringify(cache));
    await rename(`${cachePath}.tmp`, cachePath);
  }
  return {
    name: engineName,
    async variations(fen, count = 6, nodes = 3_000_000) {
      principalVariations.clear();
      latest = undefined;
      engine.processCommand(`setoption name MultiPV value ${count}`);
      engine.processCommand("setoption name Clear Hash");
      engine.processCommand(`position fen ${fen}`);
      try {
        await command(`go nodes ${nodes}`, (line) =>
          line.startsWith("bestmove "),
        );
        return [...principalVariations.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, value]) => ({ ...value, nodes }));
      } finally {
        engine.processCommand("setoption name MultiPV value 1");
      }
    },
    async analyze(fen, nodes = 60_000) {
      const key = positionKey(fen);
      if (cache[key]?.nodes >= nodes) return cache[key];
      latest = undefined;
      engine.processCommand("setoption name Clear Hash");
      engine.processCommand(`position fen ${fen}`);
      const best = await command(`go nodes ${nodes}`, (line) =>
        line.startsWith("bestmove "),
      );
      if (!latest) throw new Error(`No score for ${fen}`);
      const value = { ...latest, best: best.split(" ")[1], nodes };
      cache[key] = value;
      searches++;
      if (searches % 50 === 0) await save();
      return value;
    },
    save,
    async close() {
      await save();
      clearInterval(keepAlive);
      child?.kill();
    },
    get searches() {
      return searches;
    },
  };
}
