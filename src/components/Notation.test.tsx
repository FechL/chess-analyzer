import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppearanceContext } from "../lib/preferences";
import type { Appearance } from "../lib/preferences";
import * as i18n from "../lib/i18n";
import { NotationMove, NotationText } from "./Notation";

afterEach(() => vi.restoreAllMocks());
const appearance: Appearance = {
  notationStyle: "letters",
  pieceTheme: "merida",
  colorMode: "system",
};

describe("Notation preferences", () => {
  it.each(["letters", "pieces", "both"] as const)(
    "renders the selected %s style and piece theme",
    (notationStyle) => {
      const html = renderToStaticMarkup(
        <AppearanceContext.Provider value={{ ...appearance, notationStyle }}>
          <NotationMove san="Nf3" color="b" />
        </AppearanceContext.Provider>,
      );
      if (notationStyle === "letters") expect(html).not.toContain("<img");
      else expect(html).toContain("/pieces/merida/bN.svg");
      expect(html).toContain(
        notationStyle === "pieces" ? "/>f3</span>" : ">Nf3</span>",
      );
    },
  );

  it("localizes notation letters and promotions in Indonesian", () => {
    vi.spyOn(i18n, "useI18n").mockReturnValue({
      language: "id",
      t: <T,>(value: T) => i18n.translate(value, "id"),
    });
    const html = renderToStaticMarkup(
      <AppearanceContext.Provider value={appearance}>
        <NotationMove san="Nf3" color="w" />
        <NotationMove san="e8=Q+" color="w" />
      </AppearanceContext.Provider>,
    );
    expect(html).toContain(">Kf3</span>");
    expect(html).toContain(">e8=M+</span>");
  });

  it("formats known SAN in coach prose, including checks, without matching inside other words", () => {
    const html = renderToStaticMarkup(
      <AppearanceContext.Provider
        value={{ ...appearance, notationStyle: "pieces" }}
      >
        <NotationText
          text="Try Nf3+; Nf3+foo stays unchanged. Then O-O."
          moves={[
            { san: "Nf3+", color: "w" },
            { san: "O-O", color: "b" },
          ]}
        />
      </AppearanceContext.Provider>,
    );
    expect(html).toContain("/pieces/merida/wN.svg");
    expect(html).toContain("/pieces/merida/bK.svg");
    expect(html).toContain("Nf3+foo stays unchanged.");
    expect(html.match(/class="notation-san"/g)).toHaveLength(2);
  });
});
