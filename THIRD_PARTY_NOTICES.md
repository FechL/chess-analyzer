# Third-party notices

## ObsidianUI Dashboard Shell

Source: https://www.obsidianui.dev/r/dashboard-shell.json
Repository: https://github.com/Atharvsinh-codez/ObsidianUI
The component source and stylesheet are vendored in src/components/block, with the original license below.

MIT License

Copyright (c) 2026 ObsidianUI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Stockfish.js and Stockfish

Stockfish.js lite single-threaded is distributed under GNU GPL v3.
Source and build instructions: https://github.com/nmrugg/stockfish.js
Upstream engine: https://github.com/official-stockfish/Stockfish
The precise installed release is pinned in package-lock.json; its COPYING license is copied to public/engine/COPYING.txt.
Engine assets are copied without modification by scripts/prepare-engine.mjs.

## Chess piece SVGs

Colin M. L. Burnett (Cburnett), from the Lichess piece set.
Source: https://github.com/lichess-org/lila/tree/master/public/piece/cburnett
License: GNU GPL v2 or later, as documented in https://github.com/lichess-org/lila/blob/master/COPYING.md

Additional piece themes are bundled from the same official Lichess repository:

- Merida by Armando Hernandez Marroquin, GNU GPL v2 or later.
- Celtic by Maurizio Monge, MIT.

Credits, upstream licensing notes, and license copies are included in public/pieces/ATTRIBUTION.md and each theme directory.

## Lichess puzzles

Puzzle data is fetched on demand from the official Lichess puzzle API.
Database: https://database.lichess.org/#puzzles
License: Creative Commons CC0 public domain dedication.

## Chess content

The opening variation data in src/data/opening-lines.json is derived from
https://github.com/lichess-org/chess-openings (a.tsv through e.tsv), retrieved
on 2026-10-25. The upstream dataset is dedicated to the public domain under CC0.
The license is included in docs/licenses/lichess-openings-CC0.txt.
The exact source revision and input hashes are recorded in
src/data/opening-line-sources.json. Training branches are quality-screened with
Stockfish 19 Full; engine continuations are identified separately from source
opening moves. See docs/OPENING_AUDIT.md for methodology, references for all twelve
openings, and reproduction instructions. Rebuild with
scripts/prepare-opening-lines.mjs and a local copy of those TSV files.

Opening explanations and exercise text in this app are newly written in Indonesian.
The Morphy Opera Game (Paris, 1858) is used as a historical example.
