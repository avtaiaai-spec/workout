import type { State } from "./model";
export const THEME_KEY = "workout-appearance";
export function applyTheme(theme: State["settings"]["theme"]) {
  document.documentElement.dataset.theme = theme;
  // Only a synchronous paint hint. IndexedDB remains the source of truth.
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* Storage may be restricted. */
  }
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#10191F" : "#F5F8FA");
}
