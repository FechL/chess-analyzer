import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION } from "chess.js";
import { AppearanceContext } from "../lib/preferences";
import Board from "./Board";
import SettingsBoardPreview from "./SettingsBoardPreview";

const appearance = { notationStyle: "letters", pieceTheme: "classic", colorMode: "system" } as const;

describe("Board coordinates preference", () => {
  it("preserves coordinates when an existing account has no explicit preference", () => {
    const html = renderToStaticMarkup(<AppearanceContext.Provider value={appearance}><Board fen={DEFAULT_POSITION} disabled /></AppearanceContext.Provider>);
    expect(html.match(/class="coordinate /g)).toHaveLength(16);
  });
  it.each([false, true])("hides all coordinates with flipped=%s, including the settings preview", flipped => {
    const html = renderToStaticMarkup(<AppearanceContext.Provider value={{ ...appearance, showCoordinates: false }}><Board fen={DEFAULT_POSITION} flipped={flipped} disabled /><SettingsBoardPreview boardTheme="sage" pieceTheme="classic" /></AppearanceContext.Provider>);
    expect(html).not.toContain('class="coordinate ');
    expect(html).toContain("chessboard");
  });
});
