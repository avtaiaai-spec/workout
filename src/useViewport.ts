import { useEffect } from "react";

/** Keep a focused field inside the visual viewport when a mobile keyboard opens. */
export function useViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      const height = viewport?.height ?? window.innerHeight;
      const offset = viewport?.offsetTop ?? 0;
      document.documentElement.style.setProperty(
        "--visual-height",
        `${height}px`,
      );
      const field = document.activeElement;
      const editing =
        field instanceof HTMLTextAreaElement ||
        (field instanceof HTMLInputElement &&
          !["checkbox", "file", "radio", "button", "submit"].includes(
            field.type,
          ));
      const keyboard = editing && height < window.innerHeight - 100;
      document.documentElement.dataset.keyboardOpen = String(keyboard);
      cancelAnimationFrame(frame);
      if (!editing || window.innerWidth > 740) return;
      frame = requestAnimationFrame(() => {
        const rect = field.getBoundingClientRect();
        const modal = field.closest<HTMLElement>(".modal");
        const timerHeight = modal
          ? 0
          : (document.querySelector(".timer-dock")?.getBoundingClientRect()
              .height ?? 0);
        const navigation =
          !keyboard && !modal
            ? (document.querySelector(".bottom-nav")?.getBoundingClientRect()
                .height ?? 0)
            : 0;
        const top = offset + timerHeight + 16;
        const bottom = offset + height - navigation - 16;
        if (rect.top >= top && rect.bottom <= bottom) return;
        const shift =
          rect.top - (top + Math.max(0, bottom - top - rect.height) / 2);
        (modal ?? window).scrollBy({ top: shift, behavior: "instant" });
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("workout:focus-field", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("workout:focus-field", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
}
