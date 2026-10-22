export const ANALYSIS_SHORTCUTS = [
  {
    key: "r",
    shift: false,
    display: "R",
    action: "return",
    label: "Kembali ke langkah terakhir notasi asli",
    hint: "Notasi asli",
  },
  {
    key: "arrowleft",
    shift: true,
    display: "Shift+←",
    action: "start",
    label: "Ke posisi awal",
  },
  {
    key: "arrowright",
    shift: true,
    display: "Shift+→",
    action: "end",
    label: "Ke posisi terakhir",
  },
  {
    key: "a",
    shift: false,
    display: "A",
    setting: "showArrows",
    label: "Panah engine",
    hint: "Panah",
  },
  {
    key: "c",
    shift: false,
    display: "C",
    setting: "showPieceAnnotation",
    label: "Kategori pada buah",
    hint: "Kategori",
  },
  {
    key: "e",
    shift: false,
    display: "E",
    setting: "liveEngine",
    label: "Live engine",
    hint: "Live engine",
  },
  {
    key: "n",
    shift: true,
    display: "Shift+N",
    action: "new",
    label: "New Game",
  },
  {
    key: "i",
    shift: true,
    display: "Shift+I",
    action: "import",
    label: "Impor permainan",
  },
  {
    key: "s",
    shift: true,
    display: "Shift+S",
    action: "save",
    label: "Simpan",
  },
] as const;

type ShortcutEvent = Pick<
  KeyboardEvent,
  | "key"
  | "shiftKey"
  | "ctrlKey"
  | "metaKey"
  | "altKey"
  | "repeat"
  | "isComposing"
  | "defaultPrevented"
>;

export function getAnalysisShortcut(event: ShortcutEvent) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return undefined;
  return ANALYSIS_SHORTCUTS.find(
    (shortcut) =>
      shortcut.key === event.key.toLowerCase() &&
      shortcut.shift === event.shiftKey,
  );
}
