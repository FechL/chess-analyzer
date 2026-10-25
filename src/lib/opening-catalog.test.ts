import { createHash } from "node:crypto";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { OPENINGS } from "../data/content";
import { openingLines, openingPositions } from "./opening-training";
import sources from "../data/opening-line-sources.json";
import londonCandidates from "../data/london-training-lines.json";
import audit from "../../docs/opening-audit-rejections.json";

const positionKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");
describe("published opening training catalog", () => {
  it("expands London with multi-turn practice branches while retaining established line identities", () => {
    const london = openingLines(
      OPENINGS.find((opening) => opening.id === "london")!,
    );
    expect(london[0].id).toBe("dacaabb9178b");
    const extensions = london.filter((line) => line.source?.training);
    expect(extensions.length).toBeGreaterThan(25);
    for (const line of extensions) {
      const { moves } = openingPositions(line);
      expect(
        moves.slice(line.source!.bookPly).filter((move) => move.color === "w")
          .length,
        line.name,
      ).toBeGreaterThanOrEqual(3);
    }
  });
  for (const opening of OPENINGS) {
    it(`${opening.name}: asks for one consistent learner move at each position`, () => {
      const choices = new Map<string, string>();
      for (const line of openingLines(opening)) {
        const { moves } = openingPositions(line);
        for (const move of moves) {
          if (move.color !== opening.side) continue;
          const key = positionKey(move.before);
          const previous = choices.get(key);
          if (previous)
            expect(move.lan, `${line.name}: ${move.san}`).toBe(previous);
          choices.set(key, move.lan);
        }
      }
    });
    it(`${opening.name}: only publishes checked, distinct lines ending on the learner's move`, () => {
      const lines = openingLines(opening);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0].intro).toBe(true);
      const ids = new Set<string>();
      const finalPositions = new Set<string>();
      for (const line of lines) {
        expect(ids.has(line.id), line.name).toBe(false);
        ids.add(line.id);
        const { moves, positions } = openingPositions(line);
        expect(moves.at(-1)?.color, line.name).toBe(opening.side);
        expect(new Chess(positions.at(-1)).isGameOver(), line.name).toBe(false);
        const finalKey = positionKey(positions.at(-1)!);
        expect(finalPositions.has(finalKey), line.name).toBe(false);
        finalPositions.add(finalKey);
        expect(line.quality, line.name).toBeDefined();
        expect(line.quality!.checkedMoves, line.name).toBe(
          moves.filter((move) => move.color === opening.side).length,
        );
        expect(line.quality!.maxLossCp, line.name).toBeLessThanOrEqual(
          sources.maxLossCp,
        );
        expect(line.quality!.minScoreCp, line.name).toBeGreaterThanOrEqual(
          -sources.maxTrainingDeficitCp,
        );
        expect(line.source, line.name).toBeDefined();
        const addedPlies = line.moves.length - line.source!.bookPly;
        expect(addedPlies, line.name).toBe(
          line.source!.continuation ? line.source!.continuation.plies || 1 : 0,
        );
        if (line.source!.continuation) {
          expect(line.source!.continuation.nodes).toBeGreaterThanOrEqual(
            sources.continuationNodes,
          );
          if (!line.source!.training) {
            expect(moves[line.source!.bookPly - 1].color, line.name).not.toBe(
              opening.side,
            );
          }
        }
        if (line.source!.training) {
          // Seed IDs describe provenance, including seeds removed by repertoire pruning.
          const candidate = londonCandidates.find(
            (item) => item.id === line.id,
          );
          expect(candidate, line.name).toBeDefined();
          expect(candidate!.source.seedLineId).toBe(line.source!.seedLineId);
          expect(candidate!.moves).toEqual(line.moves);
          expect(line.source!.references?.length, line.name).toBeGreaterThan(0);
        }
        // Changed move sequences get a new identity, so previous completion
        // cannot silently mark a corrected challenge as already practiced.
        if (!line.id.endsWith("-intro")) {
          expect(line.id, line.name).toBe(
            createHash("sha256")
              .update(line.moves.join(" "))
              .digest("hex")
              .slice(0, 12),
          );
        } else {
          expect(line.moves).toEqual(opening.moves);
        }
        if (!line.intro) {
          expect(
            lines.some(
              (other) =>
                other.moves.length > line.moves.length &&
                line.moves.every((move, index) => other.moves[index] === move),
            ),
            `Redundant prefix: ${line.name}`,
          ).toBe(false);
        }
      }
    });
  }

  it("removes the conflicting Sicilian challenges in favor of the longer retained line", () => {
    const sicilian = openingLines(
      OPENINGS.find((item) => item.id === "sicilian")!,
    );
    const removed = ["0f3f7ead5abf", "24237808014b"];
    for (const id of removed) {
      expect(sicilian.some((line) => line.id === id)).toBe(false);
      const conflict = audit.families.sicilian.conflicts.find(
        (item) => item.id === id,
      )!;
      expect(conflict).toBeDefined();
      const kept = sicilian.find(
        (line) => line.id === conflict.retainedLineId,
      )!;
      expect(kept).toBeDefined();
      expect(kept.moves.length).toBeGreaterThan(16);
      expect(kept.moves[conflict.ply - 1]).toBe(conflict.retainedSan);
    }
  });

  it("accounts for every audited candidate separately from quality rejections", () => {
    for (const opening of OPENINGS) {
      const summary =
        sources.families[opening.id as keyof typeof sources.families];
      expect(summary.accepted).toBe(openingLines(opening).length);
      expect(summary.input).toBe(
        summary.accepted +
          summary.rejected +
          summary.conflicts +
          summary.deficits +
          summary.duplicates +
          summary.prefixes,
      );
    }
  });

  it("excludes the reported Sicilian eighth challenge with a disadvantaged Black position", () => {
    const id = "8dc6f39c8d62";
    const sicilian = openingLines(
      OPENINGS.find((item) => item.id === "sicilian")!,
    );
    expect(sicilian.some((line) => line.id === id)).toBe(false);
    const removed = audit.families.sicilian.deficits.find(
      (line) => line.id === id,
    )!;
    expect(removed).toBeDefined();
    expect(removed.minScoreCp).toBeLessThan(-sources.maxTrainingDeficitCp);
  });

  it("does not teach the Caro-Kann queen blunder from the old second challenge", () => {
    const opening = OPENINGS.find((item) => item.id === "caro-kann")!;
    const blunder = ["e4", "c6", "c4", "d5", "exd5", "Qxd5"];
    const position = new Chess();
    blunder.forEach((move) => position.move(move));
    expect(position.move("cxd5").captured).toBe("q");
    expect(
      openingLines(opening).some((line) =>
        blunder.every((move, index) => line.moves[index] === move),
      ),
    ).toBe(false);
  });
});
