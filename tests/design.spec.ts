import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  ready,
  visualState,
  writeData,
  readData,
  appearance,
  smith,
} from "./helpers";
function contrast(a: string, b: string) {
  const lum = (h: string) =>
    [0, 2, 4]
      .map(
        (i) =>
          parseInt(
            h
              .trim()
              .replace("#", "")
              .slice(i, i + 2),
            16,
          ) / 255,
      )
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  return (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
}
for (const [width, height] of [
  [390, 844],
  [375, 667],
  [1440, 1050],
])
  for (const theme of ["light", "dark"] as const) {
    test(`Mono Apricot ${theme} ${width}×${height}: все экраны, контраст, плотность`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await ready(page);
      await writeData(page, visualState(false));
      await appearance(page, theme === "light" ? "Светлая" : "Тёмная");
      await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
      const tokens = await page.evaluate(() => {
        const c = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          [
            "bg",
            "raised",
            "text",
            "muted",
            "accent",
            "accent-text",
            "on-accent",
            "accent-light",
            "control-border",
            "danger",
            "danger-bg",
            "disabled-bg",
            "disabled-text",
          ].map((k) => [k, c.getPropertyValue("--" + k).trim()]),
        );
      });
      for (const bg of ["bg", "raised", "accent-light"]) {
        expect(contrast(tokens.text, tokens[bg])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(tokens.muted, tokens[bg])).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrast(tokens.accent, tokens["on-accent"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["accent-text"], tokens["accent-light"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["control-border"], tokens.raised),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(tokens.danger, tokens["danger-bg"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["disabled-text"], tokens["disabled-bg"]),
      ).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({
        path: `test-results/mono-${theme}-${width}-settings.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Закрыть", exact: true }).click();
      await page.goto("/#plan");
      await expect(page.locator(".timer-dock")).toHaveCount(0);
      await mkdir("docs/mono-apricot", { recursive: true });
      await page.screenshot({
        path: `docs/mono-apricot/${theme}-${width}x${height}.png`,
        fullPage: false,
      });
      if (width === 390) {
        const layout = await page.evaluate(() => ({
          third: document
            .querySelectorAll(".template-card > summary")[2]
            .getBoundingClientRect().bottom,
          nav: document.querySelector(".bottom-nav")!.getBoundingClientRect()
            .top,
        }));
        expect(layout.third).toBeLessThanOrEqual(layout.nav);
      }
      for (const route of [
        "plan",
        "catalog",
        "planner",
        "journal",
        "progress",
        "body",
        "edit/personal-template-v1-0",
        "session/design-completed",
      ]) {
        await page.goto("/#" + route);
        await expect(page.locator("main")).toBeVisible();
        await page.evaluate(() => scrollTo(0, 0));
        expect(
          await page.evaluate(() => {
            const tools = document.querySelector(".page-tools");
            if (!tools) return true;
            const t = tools.getBoundingClientRect();
            return [
              ...document.querySelectorAll<HTMLElement>(
                "main button,main a,main input,main select,main summary",
              ),
            ]
              .filter((e) => !tools.contains(e) && e.getClientRects().length)
              .every((e) => {
                const r = e.getBoundingClientRect();
                return !(
                  r.left < t.right &&
                  r.right > t.left &&
                  r.top < t.bottom &&
                  r.bottom > t.top
                );
              });
          }),
          "Действия заголовка не перекрывают настройки",
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route,
        ).toBe(true);
        expect(
          await page
            .locator("body")
            .evaluate((el) => getComputedStyle(el).fontFamily),
        ).toContain("Segoe UI");
        await page.screenshot({
          path: `test-results/mono-${theme}-${width}-${route.split("/")[0]}.png`,
          fullPage: true,
        });
      }
      if (width < 741) {
        expect(
          await page
            .locator(".bottom-nav a")
            .evaluateAll((els) =>
              els.every((el) => el.getBoundingClientRect().width >= 44),
            ),
        ).toBe(true);
      }
      const activeState = visualState(true);
      activeState.settings.theme = theme;
      await writeData(page, activeState);
      await page.goto("/#session/design-active");
      await expect(page.locator(".bottom-nav")).toHaveCount(0);
      await expect(page.locator(".sidebar")).toHaveCount(0);
      await expect(page.locator(".current-set")).toHaveCount(1);
      await expect(
        page.getByRole("button", { name: /Записать подход/ }),
      ).toBeVisible();
      const field = page.getByLabel("Вес подхода 2", { exact: true });
      await field.fill("27,3");
      await field.focus();
      await expect
        .poll(() =>
          field.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.top >=
                document
                  .querySelector(".session-topbar")!
                  .getBoundingClientRect().bottom && r.bottom <= innerHeight
            );
          }),
        )
        .toBe(true);
      await page.screenshot({
        path: `test-results/mono-${theme}-${width}-active.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: /Записать подход/ }).click();
      await expect(page.locator(".done-button.checked")).toHaveCount(2);
      await page.getByRole("button", { name: "Техника", exact: true }).click();
      await expect(
        page.getByRole("dialog").locator(".exercise-photo > img"),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/mono-${theme}-${width}-technique.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Закрыть", exact: true }).click();
      expect(errors).toEqual([]);
    });
  }
test("раннее применение темы, выбор устройства и сохранность истории, активного занятия и таймеров", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 18, 18)",
  );
  await writeData(page, visualState(true));
  const before = await readData(page);
  await appearance(page, "Светлая");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(250, 250, 248)",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await appearance(page, "Тёмная");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.route("**/assets/*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto("/#plan", { waitUntil: "commit" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(18, 18, 18)",
  );
  await expect(page.locator(".resume-dock")).toBeVisible();
  await page.unroute("**/assets/*.js");
  const after = await readData(page);
  for (const key of [
    "sessions",
    "templates",
    "exercises",
    "retiredExercises",
    "favorites",
    "rules",
    "exceptions",
    "measurements",
    "trainingDays",
    "restEnd",
    "effort",
  ] as const)
    expect(after[key], key).toEqual(before[key]);
  await appearance(page, "Как на устройстве");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(250, 250, 248)",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 18, 18)",
  );
});
test("клавиатура: активное поле видно, нижняя панель не перекрывает сохранение", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await ready(page);
  await writeData(page, visualState(true));
  await page.goto("/#session/design-active");
  const field = page.getByLabel("Вес подхода 2", { exact: true });
  await field.fill("24,7");
  await page.evaluate(() => {
    const vv = visualViewport!;
    Object.defineProperty(vv, "height", { configurable: true, value: 340 });
    vv.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-keyboard-open",
    "true",
  );
  await expect
    .poll(() =>
      field.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.top >=
            document.querySelector(".session-topbar")!.getBoundingClientRect()
              .bottom && r.bottom <= visualViewport!.height
        );
      }),
    )
    .toBe(true);
  await page.evaluate(() => {
    const vv = visualViewport!;
    Reflect.deleteProperty(vv, "height");
    vv.dispatchEvent(new Event("resize"));
  });
  await field.blur();
  await page.reload();
  await expect(page.getByLabel("Вес подхода 2", { exact: true })).toHaveValue(
    "24,7",
  );
});

test("длинные названия и увеличение текста до 200% сохраняют доступ к действиям", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await ready(page);
  const state = visualState(false);
  state.templates[0].name = "ОченьДлинноеНазваниеБезПробелов".repeat(4);
  await writeData(page, state);
  for (const route of ["plan", "catalog", "journal", "progress"]) {
    await page.goto("/#" + route);
    await page.evaluate(() => {
      const nodes = [
        ...document.querySelectorAll<HTMLElement>(
          "h1,h2,h3,p,small,strong,b,button,summary,a,label",
        ),
      ];
      const sizes = nodes.map((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      );
      nodes.forEach(
        (el, index) => (el.style.fontSize = `${sizes[index] * 2}px`),
      );
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.goto("/#plan");
  await page.locator(".template-card > summary").first().click();
  await expect(
    page
      .locator(".template-card")
      .first()
      .getByRole("button", { name: "Начать", exact: true }),
  ).toBeEnabled();
});
