# Opening curriculum audit — 25 October 2026

## What was wrong

The previous course generator treated the Lichess opening-name database as a
teaching repertoire. That database records named positions, including dubious
historical gambits, traps, and different move orders reaching the same position.
Its legal moves and ECO labels do not make every move a suitable recommendation
for the learner.

The reported Caro–Kann challenge was a real example:
`1.e4 c6 2.c4 d5 3.exd5 Qxd5?? 4.cxd5`. The c4-pawn can capture the queen.
The old curriculum stopped immediately after `...Qxd5`, taught that move to Black,
and never showed the consequence. This branch is now rejected.

Many source entries also stop on an opponent move that defines a named variation.
Using those entries directly produced apparently identical challenges whose only
new move was played automatically by the opponent.

In the previous 1,156 named challenges, 606 ended on an opponent move. Removing
that automatic final move exposed 131 repeated learner paths. The twelve curated
introductions are audited alongside those named challenges.

## Sources researched

Move facts and labels come from the public-domain
[Lichess opening names repository](https://github.com/lichess-org/chess-openings).
`src/data/opening-line-sources.json` records the exact upstream commit and SHA-256
checksums of all five input TSV files. All source SAN is parsed with chess.js.
The unfiltered classification book used in Game Analysis is separate from the
filtered Opening Explorer curriculum.

The following official opening guides were reviewed for course scope, principal
branches, and the distinction between an opening's defining position and its
continuations. These are reference links; their teaching prose was not copied.

| Course         | Structures and branches checked                                                                           | Reference                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Italian        | Giuoco Piano/Pianissimo, Two Knights, Evans; development and central breaks                               | [Chess.com](https://www.chess.com/openings/Italian-Game)         |
| Sicilian       | Open/Closed, Najdorf, Dragon, Classical, Alapin; different pawn structures require different responses    | [Chess.com](https://www.chess.com/openings/Sicilian-Defense)     |
| Queen's Gambit | Declined, Accepted, Slav/Semi-Slav, Tarrasch; central tension and recovering c4                           | [Chess.com](https://www.chess.com/openings/Queens-Gambit)        |
| London         | Classical/accelerated move orders, Indian setups, Jobava; adapt to ...c5 and pressure on b2               | [Chess.com](https://www.chess.com/openings/London-System)        |
| Ruy López      | Closed, Berlin, Exchange, Open, Marshall; preserve the bishop and prepare central play                    | [Chess.com](https://www.chess.com/openings/Ruy-Lopez-Opening)    |
| Caro–Kann      | Classical, Advance, Exchange, Panov, Two Knights, Fantasy; ...d5, bishop development, central counterplay | [Chess.com](https://www.chess.com/openings/Caro-Kann-Defense)    |
| French         | Advance, Exchange, Tarrasch, Winawer, Classical, Rubinstein; attack the pawn chain and activate c8        | [Chess.com](https://www.chess.com/openings/French-Defense)       |
| King's Indian  | Classical/Orthodox, Sämisch, Averbakh, Fianchetto, Four Pawns; counterattack the white center             | [Chess.com](https://www.chess.com/openings/Kings-Indian-Defense) |
| Scandinavian   | ...Qxd5 with safe queen retreats and ...Nf6 setups; queen exposure and development tempi                  | [Chess.com](https://www.chess.com/openings/Scandinavian-Defense) |
| Scotch         | Classical, Schmidt/Mieses, Scotch/Göring gambits; open-center development and tactical move order         | [Chess.com](https://www.chess.com/openings/Scotch-Game)          |
| Petrov         | Classical and Nimzowitsch attacks; ...d6 before ...Nxe4 in the main line                                  | [Chess.com](https://www.chess.com/openings/Petrovs-Defense)      |
| English        | King's English, Four Knights, Symmetrical, Hedgehog, transpositions                                       | [Chess.com](https://www.chess.com/openings/English-Opening)      |

For the reported Accelerated Panov case, the standard recapture in the reference
is `3...cxd5`, not the queen capture:
[Accelerated Panov](https://www.chess.com/openings/Caro-Kann-Defense-Accelerated-Panov-Attack-2...d5-3.exd5-cxd5).

The official [Stockfish 19 release](https://stockfishchess.org/download/) and
[UCI documentation](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html)
underpin the offline quality checks. Stockfish is used for analysis, not as an
opening-name or historical authority.

## Audit results

1266 candidates were checked; 396 challenges are published. The original
quality screen rejected 58 candidates and merged 7 duplicate positions/prefixes.
The stricter learner-deficit publication gate removes a further 26 lines;
779 otherwise screened lines are removed to keep one learner response per
position. These conflicting alternatives are not necessarily bad chess moves.
All published challenges end on the learner's move.

| Course        | Checked | Published | Screen rejected | Deficit removed | Conflicts removed | Engine-extended | Merged |
| ------------- | ------- | --------- | --------------- | --------------- | ----------------- | --------------- | ------ |
| italian       | 110     | 18        | 9               | 0               | 82                | 13              | 1      |
| sicilian      | 248     | 42        | 6               | 11              | 186               | 30              | 3      |
| queens-gambit | 201     | 51        | 4               | 0               | 146               | 39              | 0      |
| london        | 64      | 42        | 0               | 0               | 22                | 39              | 0      |
| ruy-lopez     | 155     | 73        | 11              | 0               | 71                | 64              | 0      |
| caro-kann     | 70      | 35        | 3               | 2               | 29                | 30              | 1      |
| french        | 122     | 43        | 7               | 8               | 64                | 33              | 0      |
| kings-indian  | 74      | 32        | 0               | 1               | 41                | 27              | 0      |
| scandinavian  | 31      | 3         | 5               | 3               | 20                | 1               | 0      |
| scotch        | 39      | 8         | 7               | 0               | 24                | 5               | 0      |
| petrov        | 34      | 16        | 2               | 1               | 14                | 11              | 1      |
| english       | 118     | 33        | 4               | 0               | 80                | 27              | 1      |

## New publication rules

1. Replay each candidate legally, including all curated introductions. Reject
   terminal positions: these courses teach opening play rather than finished
   tactical puzzles.
2. Analyze every move the learner must play with Stockfish 19 Full, one thread,
   64 MiB hash, and a screening budget of 60,000 nodes per position. Shared
   positions are cached, but each learner move is checked against its own board.
3. Normalize scores to the player making the move. Compare the best position
   score before the move with the opponent's best reply after it. Reanalyze
   suspected mistakes with 500,000 nodes per position. Reject a branch if a
   learner move loses over 100 centipawns, leaves the learner worse than
   −150 centipawns, or permits a forced mate. These are curriculum thresholds,
   not official move classifications or proof of perfect play.
4. If the named source stops on the opponent's move, add the learner's best reply
   from a 500,000-node search, then apply the same quality check to that reply.
   `source.bookPly` preserves where the source ends; `source.continuation` records
   the engine and search depth/node budget for the added move. It is explicitly
   an engine continuation, not a newly invented book variation.
5. Every published challenge ends immediately after the learner's move. No
   challenge completes on an automatic opponent reply.
6. Merge equal final positions, accounting for the side to move, castling, and
   legal en passant. Remove redundant move prefixes; retain one deliberate
   introduction for each course. Shared early moves remain where the later
   positions require different decisions.
7. Place core structures before rare sidelines. A source entry does not receive
   priority merely because it is short.
8. Apply a stricter publication limit of −100 centipawns from the learner's
   perspective at every checked learner move, including the final one. The
   original −150 screening results remain recorded for provenance; a line that
   fails the tighter limit appears separately under `deficits`.
9. Choose one learner reply per canonical position across the whole course,
   including transpositions. Protect the defining introductory setup, then
   prefer longer challenges; existing curriculum order breaks equal-length
   ties. Reject the entire conflicting line without reserving its other moves.
   Alternative opponent moves remain allowed. This intentionally removes some
   named systems that require a different learner choice in the same position;
   the catalog is a consistent practice repertoire rather than all possible
   opening choices. Keep the original relative order and IDs of surviving lines.
10. Derive corrected line IDs from the full trained move sequence. Completion of
    an old, changed challenge cannot incorrectly count as completion of the new
    response. IDs and progress remain usable for unchanged sequences.

The generated manifest summarizes accepted/rejected counts by course. The full
`docs/opening-audit-rejections.json` contains every rejected candidate and the
first reason for rejection, including the exact move and engine comparison.
Separate `conflicts` entries record the rejected move, canonical position, and
retained line ID/reply. `deficits` entries record the worst audited learner score
and the stricter publication threshold.
This makes the curriculum changes inspectable instead of silently deleting bad
examples.

## Reproducing the checks

Use Node.js 24+ and the pinned source revision in the manifest. Download `a.tsv`
through `e.tsv` plus the GitHub commit metadata as `commit.json` into a directory.
Run:

```sh
node scripts/prepare-opening-lines.mjs /path/to/source /tmp/opening-audit-cache.json
npm test -- src/lib/opening-catalog.test.ts src/lib/opening-training.test.ts src/lib/opening-review.test.ts
npm run build
```

The generator defaults to the already installed Stockfish 19 Full WASM package.
For a faster offline audit, set `STOCKFISH_PATH` to an official native Stockfish 19
binary and use a separate cache file. The audit used the official Linux x86-64
release, whose archive SHA-256 is
`9defc0d4e55d49c65a6d042f3e571a39fcea499ade6dbe741b53b8c65e03611f`.
No network access or engine audit is needed when learners open the app: published
lines and their checks are bundled locally.

## Limits

The node budgets are finite. These checks remove concrete tactical errors and
weak recommendations at the stated thresholds; they do not certify a complete,
master-authored repertoire or resolve every theoretical disagreement. An opponent
may still play a dubious gambit, but the learner is taught a screened response.
The same opening can share many early moves across distinct branches; repeated
prefixes are useful only when the remaining decisions differ.

Overview explanations describe opening principles. Generic move prompts are not
position-specific annotations and should not be taken as evidence that a move is
best. Course links credit the opening-name data, reference guides, and Stockfish
separately.

## London expansion — 25 October 2026

The initial expansion produced 64 challenges: 14 established lines followed by
50 calculated training branches. The later consistency filter leaves 42 London
challenges, including 36 of those training branches. Surviving lines retain their
sequences, identities, and relative order. Removed seed IDs remain valid historical
provenance in the supplemental input; a seed need not itself remain published. The new
branches cover classical development, central exchanges, Indian fianchetto
setups, and Rapport–Jobava positions. These are calculated practice branches,
not additional official ECO names or copied master-game annotations.

`scripts/extend-london.mjs` starts from the previously audited London positions
and searches six alternative Black replies with Stockfish 19 Full, 3,000,000
nodes and MultiPV 6 per seed position. Each added branch contains six calculated
plies, including three subsequent White moves. Branches duplicating an existing
challenge, its non-intro prefix, or a final position are skipped. The normal
publication generator independently checks every White move at the existing
60,000/500,000-node quality gates. All 50 new candidates passed those checks.

The reproducible input is `src/data/london-training-lines.json`. Its SHA-256 is
recorded in the audit manifest. Each extension records its seed line ID, source
references, source-prefix length, MultiPV count, depth, node budget, and the
number of calculated plies. The source prefixes come from the audited Lichess
lines or the curated introduction; the additional move sequences are explicitly
attributed to Stockfish. [Chess.com's London guide](https://www.chess.com/openings/London-System)
provides the reference for the main structures and practical setup distinctions.

Regenerating the usual catalog includes these bundled extensions automatically.
To recalculate the extension candidates first, optionally run:

```sh
STOCKFISH_PATH=/path/to/stockfish-19 node scripts/extend-london.mjs /tmp/opening-audit-cache.json
node scripts/prepare-opening-lines.mjs /path/to/source /tmp/opening-audit-cache.json
```

Keep a separate cache for different engine builds, as described above.

## Reported Sicilian conflicts and disadvantaged ending

The former challenges 4 (`0f3f7ead5abf`) and 10 (`24237808014b`)
share the position after `1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6
5.Nc3 a6 6.Be3`, but ask Black to play `6...Ng4` and `6...e5`
respectively. Both are removed in favor of a longer retained challenge using
`6...e6` in that same position. The rule compares board positions, not challenge
numbers, so it also catches conflicts reached through different move orders.

The former challenge 8 (`8dc6f39c8d62`, Najdorf Neo-Classical Defense)
ends at `7...Nc6`. Its original audit minimum is −119 cp for Black. A separate
Stockfish 19 Full recheck of the final position at 3,000,000 nodes, depth 24,
returned +126 cp for White. It now fails the stricter −100 cp publication gate.
An evaluation is a finite-search estimate, not a guaranteed game result.
Challenge numbers change when lines are removed; regression checks use stable IDs.
