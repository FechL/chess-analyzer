import { useSyncExternalStore } from "react";
import type { BoardTransition } from "./board-effects";

const key = "kuda-board-sound";
const event = "kuda-board-sound-change";
let context: AudioContext | undefined;
export function unlockBoardSound() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    /* Audio is optional on unsupported browsers. */
  }
}
function enabled() {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}
export function setBoardSound(value: boolean) {
  try {
    localStorage.setItem(key, value ? "on" : "off");
  } catch {
    /* Keep UI usable when storage is unavailable. */
  }
  window.dispatchEvent(new Event(event));
  if (value) unlockBoardSound();
}
function subscribe(listener: () => void) {
  window.addEventListener(event, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(event, listener);
    window.removeEventListener("storage", listener);
  };
}
export function useBoardSound() {
  return useSyncExternalStore(subscribe, enabled, () => true);
}

export function playBoardSound(
  kind: BoardTransition["sound"] | "success" | "error",
) {
  if (!enabled()) return;
  unlockBoardSound();
  const audio = context;
  if (!audio) return;
  const play = () => {
    if (!enabled() || audio.state !== "running") return;
    const patterns = {
      move: [
        [520, 0, 0.065],
        [310, 0.025, 0.045],
      ],
      capture: [
        [180, 0, 0.09],
        [110, 0.025, 0.07],
      ],
      castle: [
        [420, 0, 0.06],
        [560, 0.065, 0.06],
      ],
      check: [
        [660, 0, 0.08],
        [880, 0.085, 0.1],
      ],
      success: [
        [523, 0.05, 0.12],
        [659, 0.16, 0.12],
        [1046, 0.27, 0.22],
      ],
      error: [
        [220, 0, 0.12],
        [147, 0.12, 0.18],
      ],
      end: [
        [523, 0, 0.1],
        [659, 0.1, 0.1],
        [784, 0.2, 0.16],
      ],
    };
    for (const [frequency, delay, duration] of patterns[kind]) {
      const start = audio.currentTime + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type =
        kind === "capture" || kind === "error" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * (kind === "success" ? 1 : 0.65),
        start + duration,
      );
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    }
  };
  if (audio.state === "running") play();
  else
    void audio
      .resume()
      .then(play)
      .catch(() => {});
}
