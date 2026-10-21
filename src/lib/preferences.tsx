import { createContext, useContext } from "react";
export type Appearance = {
  notationStyle: "letters" | "pieces" | "both";
  pieceTheme: "classic" | "merida" | "celtic";
  colorMode: "light" | "dark";
};
export const AppearanceContext = createContext<Appearance>({
  notationStyle: "letters",
  pieceTheme: "classic",
  colorMode: "light",
});
export const useAppearance = () => useContext(AppearanceContext);
export function pieceAsset(
  color: string,
  type: string,
  theme: Appearance["pieceTheme"],
) {
  return (
    "/pieces/" +
    (theme === "classic" ? "" : theme + "/") +
    color +
    type.toUpperCase() +
    ".svg"
  );
}
