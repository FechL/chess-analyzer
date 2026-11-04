import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AboutModal, { AboutPage } from "./AboutModal";
import * as i18n from "../lib/i18n";

afterEach(() => vi.restoreAllMocks());

describe("About content", () => {
  it("renders the mobile page without a dialog and with a back action", () => {
    const html = renderToStaticMarkup(<AboutPage onBack={() => {}} />);
    expect(html).toContain('class="page about-page"');
    expect(html).toContain('aria-label="Back"');
    expect(html).toContain("Kuda Chess Studio");
    expect(html).not.toContain("<dialog");
  });
  it("renders the complete English overview and credits without shortcut instructions", () => {
    const html = renderToStaticMarkup(<AboutModal onClose={() => {}} />);
    for (const text of [
      ">About<", "Review full games", "Play against a bot", "Learn opening lines",
      "Solve Lichess puzzles", "Learn piece movement", "Save games, mark favorites",
      "Loading public games or puzzles requires an internet connection.",
      "SOURCES &amp; TECHNOLOGY", "Interface components built with React and Tailwind",
    ]) expect(html).toContain(text);
    expect(html).not.toContain("<kbd");
    expect(html).not.toContain("Pintasan");
    expect(html).not.toContain("9 tutorial");
  });

  it("keeps the overview and navigation label in Indonesian when selected", () => {
    vi.spyOn(i18n, "useI18n").mockReturnValue({
      language: "id",
      t: <T,>(value: T) => i18n.translate(value, "id"),
    });
    const html = renderToStaticMarkup(<AboutModal onClose={() => {}} />);
    expect(html).toContain(">Tentang<");
    expect(html).toContain("Ulas permainan lengkap");
    expect(html).toContain("Mengambil permainan publik atau puzzle memerlukan koneksi internet.");
    expect(html).not.toContain("<kbd");
  });
});
