import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "./chess";
const key = "kuda-board-animation";
const event = "kuda-board-animation-change";
function enabled() {
  return readStorage(key, true);
}
export function setBoardAnimation(value: boolean) {
  writeStorage(key, value);
  window.dispatchEvent(new Event(event));
}
function subscribe(listener: () => void) {
  window.addEventListener(event, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(event, listener);
    window.removeEventListener("storage", listener);
  };
}
export function useBoardAnimation() {
  return useSyncExternalStore(subscribe, enabled, () => true);
}
