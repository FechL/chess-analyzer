import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardShell } from "./dashboard-shell";

describe("Sidebar display name", () => {
  it.each(["aliy", "aLiY", "ALIY", "the player"])("preserves the saved capitalization of %s", (name) => {
    const html = renderToStaticMarkup(
      <DashboardShell
        brand={{ name: "kuda" }}
        title="Game Analysis"
        navigation={[]}
        secondaryNavigation={[{ id: "profile", label: name, preserveLabel: true }]}
      />,
    );
    expect(html).toContain(`translate="no" style="text-transform:none">${name}</span>`);
  });
});
