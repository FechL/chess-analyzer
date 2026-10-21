import { describe, expect, it } from "vitest";
import { translate } from "./i18n";
describe("application languages", () => {
  it("translates interface and learning content and preserves Indonesian", () => {
    expect(translate("Pengaturan", "en")).toBe("Settings");
    expect(translate("Pengaturan", "id")).toBe("Pengaturan");
    expect(translate("Kuasai pusat dengan e4 dan siapkan d4.", "en")).toBe(
      "Control the center with e4 and prepare d4.",
    );
  });
  it("preserves branding and translates piece labels and dynamic move numbers", () => {
    expect(translate("kuda", "en")).toBe("kuda");
    expect(translate("a7 hitam kuda", "en")).toBe("a7 black knight");
    expect(translate("Langkah 31/48", "en")).toBe("Move 31/48");
    expect(translate("Catatan pelajaran pribadi", "en")).not.toContain(
      "pelaking",
    );
  });
});
