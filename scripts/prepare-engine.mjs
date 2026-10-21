import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("stockfish/package.json"));
const pkg = JSON.parse(
  await readFile(path.join(source, "package.json"), "utf8"),
);
const major = pkg.version.split(".")[0];
const stem = `stockfish-${major}-lite-single`;
const target = new URL("../public/engine/", import.meta.url);
await mkdir(target, { recursive: true });
// The worker resolves the WASM from its own URL: stockfish.js -> stockfish.wasm.
await copyFile(
  path.join(source, "bin", `${stem}.js`),
  new URL("stockfish.js", target),
);
await copyFile(
  path.join(source, "bin", `${stem}.wasm`),
  new URL("stockfish.wasm", target),
);
await copyFile(
  path.join(source, "Copying.txt"),
  new URL("COPYING.txt", target),
);
await writeFile(
  new URL("version.json", target),
  JSON.stringify(
    {
      version: pkg.version,
      build: stem,
      source: "https://github.com/nmrugg/stockfish.js",
    },
    null,
    2,
  ),
);
console.log(
  `Stockfish ${pkg.version} lite single-threaded siap di public/engine.`,
);

// Optional full neural network build, selected from the analysis options.
for (const extension of ["js", "wasm"]) {
  await copyFile(
    path.join(source, "bin", `stockfish-${major}-single.${extension}`),
    new URL(`stockfish-full.${extension}`, target),
  );
}
