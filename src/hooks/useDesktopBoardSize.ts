import { useLayoutEffect, useRef } from "react";

/** Fit the board around the actual header, controls, and footer height. */
export function useDesktopBoardSize() {
  const pageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const viewport = page?.closest<HTMLElement>(".dashboard-main-scroll");
    const board = page?.querySelector<HTMLElement>(".chessboard-wrap");
    const section = page?.querySelector<HTMLElement>(".board-section");
    if (!page || !viewport || !board || !section) return;

    const desktop = window.matchMedia("(min-width: 1281px)");
    let frame = 0;
    const measure = () => {
      if (!desktop.matches) {
        page.style.removeProperty("--desktop-board-column");
        return;
      }
      const boardRect = board.getBoundingClientRect();
      // The evaluation bar adds width beside the board, but no extra height.
      const evaluationWidth = section.getBoundingClientRect().width - boardRect.width;
      const surroundingHeight = page.getBoundingClientRect().height - boardRect.height;
      const available = viewport.clientHeight - surroundingHeight - 2;
      const column = Math.max(200, Math.floor(available + evaluationWidth));
      const value = `${column}px`;
      if (page.style.getPropertyValue("--desktop-board-column") !== value)
        page.style.setProperty("--desktop-board-column", value);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(page);
    observer.observe(viewport);
    observer.observe(board);
    desktop.addEventListener("change", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      desktop.removeEventListener("change", schedule);
      page.style.removeProperty("--desktop-board-column");
    };
  }, []);

  return pageRef;
}
