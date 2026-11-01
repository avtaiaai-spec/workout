import { test, expect, Page } from "@playwright/test";
test.skip(
  !!process.env.SUBPATH_TEST,
  "Проверка базового оформления выполняется без подпапки",
);
async function readData(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const r = indexedDB.open("moi-trenirovki", 1);
        r.onsuccess = () => {
          const db = r.result;
          const request = db
            .transaction("state")
            .objectStore("state")
            .get("main");
          request.onsuccess = () => {
            resolve(request.result);
            db.close();
          };
          request.onerror = () => reject(request.error);
        };
      }),
  );
}
async function seedVisualData(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("moi-trenirovki", 1);
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction("state", "readwrite");
          const store = tx.objectStore("state");
          const q = store.get("main");
          q.onsuccess = () => {
            const state = q.result;
            const date = (d: Date) =>
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const today = date(new Date());
            const yesterday = date(new Date(Date.now() - 86400000));
            const completed = {
              ...structuredClone(state.templates[0]),
              id: "design-completed",
              templateId: state.templates[0].id,
              status: "completed",
              startedAt: Date.now() - 86400000,
              endedAt: Date.now() - 86400000 + 1800000,
              date: today,
              pausedAt: null,
              pausedMs: 0,
            };
            completed.items[0].sets[0].done = true;
            completed.items[0].sets[1].done = true;
            const active = {
              ...structuredClone(state.templates[0]),
              id: "design-active",
              templateId: state.templates[0].id,
              status: "active",
              startedAt: Date.now() - 120000,
              endedAt: null,
              date: today,
              pausedAt: null,
              pausedMs: 0,
              occurrenceId: `design-rule:${today}`,
            };
            active.items[0].sets[0].done = true;
            active.items[0].sets[0].weight = 22.6;
            active.note = "Сохранить при смене оформления";
            state.sessions = [completed, active];
            state.favorites = [state.exercises[0].id];
            state.rules = [
              {
                id: "design-rule",
                templateId: state.templates[0].id,
                start: today,
                weekdays: [],
                once: true,
              },
              {
                id: "design-next",
                templateId: state.templates[1].id,
                start: today,
                weekdays: [],
                once: true,
              },
            ];
            state.restEnd = Date.now() + 90000;
            store.put(state, "main");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Продолжить тренировку", exact: true }),
  ).toBeVisible();
}
async function appearance(page: Page, name: string) {
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}
function contrast(a: string, b: string) {
  const lum = (s: string) => {
    const x = s.trim().replace("#", "");
    return [0, 2, 4]
      .map((i) => parseInt(x.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const aa = lum(a),
    bb = lum(b);
  return (Math.max(aa, bb) + 0.05) / (Math.min(aa, bb) + 0.05);
}
for (const width of [360, 1440])
  for (const theme of ["light", "dark"] as const) {
    test(`Calm Studio: ${theme}, ${width}px — все экраны, состояния и контраст`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 360 ? 850 : 1050 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "Сегодня", exact: true }),
      ).toBeVisible();
      await seedVisualData(page);
      await appearance(page, theme === "light" ? "Светлая" : "Тёмная");
      await expect(
        page.getByRole("button", {
          name: theme === "light" ? "Светлая" : "Тёмная",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
      const tokens = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          [
            "bg",
            "surface",
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
          ].map((k) => [k, css.getPropertyValue("--" + k).trim()]),
        );
      });
      for (const bg of ["bg", "surface", "raised", "accent-light"]) {
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
        path: `test-results/calm-${theme}-${width}-settings.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Закрыть", exact: true }).click();
      for (const route of [
        "today",
        "workouts",
        "catalog",
        "calendar",
        "progress",
        "edit/personal-template-v1-0",
        "session/design-active",
      ]) {
        await page.goto("/#" + route);
        await expect(page.locator("main")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(() =>
            document.fonts.check('16px "Golos Text Variable"'),
          ),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route,
        ).toBe(true);
        if (width === 360)
          expect(
            await page.locator(".bottom-nav span").evaluateAll((elements) =>
              elements.every((el, i) => {
                const r = el.getBoundingClientRect();
                const next = elements[i + 1]?.getBoundingClientRect();
                return !next || r.right <= next.left;
              }),
            ),
            "Подписи навигации не пересекаются",
          ).toBe(true);
        if (route === "progress")
          await expect(page.getByRole("img", { name: /График/ })).toBeVisible();
        expect(
          await page
            .locator("body")
            .evaluate((el) => getComputedStyle(el).fontFamily),
        ).toContain("Golos Text");
        await page.screenshot({
          path: `test-results/calm-${theme}-${width}-${route.split("/")[0]}.png`,
          fullPage: true,
        });
      }
      await expect(page.locator(".current-set")).toHaveCount(1);
      await expect(
        page.getByRole("button", { name: /Записать подход/ }),
      ).toBeVisible();
      const field = page.getByLabel("Вес подхода 2", { exact: true }).first();
      await field.fill("27,3");
      await field.focus();
      await expect
        .poll(async () =>
          field.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const dock = document
              .querySelector(".timer-dock")!
              .getBoundingClientRect();
            const nav = document
              .querySelector(".bottom-nav")!
              .getBoundingClientRect();
            return (
              r.top >= dock.bottom &&
              r.bottom <= (nav.height ? nav.top : innerHeight)
            );
          }),
        )
        .toBe(true);
      const button = page.getByRole("button", { name: /Записать подход/ });
      await button.click();
      await expect(page.locator(".done-button.checked")).toHaveCount(2);
      await page
        .locator(".workout-item")
        .first()
        .getByRole("button", { name: /Техника:/ })
        .click();
      await expect(
        page.getByRole("dialog").locator(".illustration svg[role=img]"),
      ).toHaveCount(2);
      await page.screenshot({
        path: `test-results/calm-${theme}-${width}-technique.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Закрыть", exact: true }).click();
      await appearance(page, theme === "light" ? "Тёмная" : "Светлая");
      await page
        .getByRole("combobox", { name: "Режим импорта" })
        .selectOption("replace");
      await page.locator("input[type=file]").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"version":99}'),
      });
      await expect(page.getByRole("alert")).toContainText("Данные не изменены");
      await page.getByRole("button", { name: "Закрыть", exact: true }).click();
      expect(errors).toEqual([]);
    });
  }
test("тема устройства, сохранение ручного выбора, ранняя отрисовка и неизменность активного занятия", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(16, 25, 31)",
  );
  await seedVisualData(page);
  const before = await readData(page);
  await appearance(page, "Светлая");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(245, 248, 250)",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await appearance(page, "Тёмная");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  // Hold the app bundle: the synchronous paint hint must apply before React starts.
  await page.route("**/assets/*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto("/#session/design-active", { waitUntil: "commit" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(16, 25, 31)",
  );
  await expect(page.locator(".done-button.checked")).toHaveCount(1);
  await page.unroute("**/assets/*.js");
  const after = await readData(page);
  for (const key of [
    "sessions",
    "templates",
    "exercises",
    "favorites",
    "rules",
    "exceptions",
    "seeded",
    "restEnd",
    "effort",
  ])
    expect(after[key], key).toEqual(before[key]);
  await appearance(page, "Как на устройстве");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(245, 248, 250)",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(16, 25, 31)",
  );
  await page.reload();
  await expect(page.locator(".done-button.checked")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
});

test("клавиатура: поле остаётся в видимой области, навигация освобождает место", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await seedVisualData(page);
  await page.goto("/#session/design-active");
  const field = page.getByLabel("Вес подхода 2", { exact: true }).first();
  await field.fill("24,7");
  await page.evaluate(() => {
    const vv = window.visualViewport!;
    Object.defineProperty(vv, "height", { configurable: true, value: 420 });
    vv.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-keyboard-open",
    "true",
  );
  await expect(page.locator(".bottom-nav")).not.toBeVisible();
  await expect
    .poll(async () =>
      field.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document
          .querySelector(".timer-dock")!
          .getBoundingClientRect().bottom;
        return r.top >= top && r.bottom <= window.visualViewport!.height;
      }),
    )
    .toBe(true);
  await page.evaluate(() => {
    const vv = window.visualViewport!;
    Reflect.deleteProperty(vv, "height");
    vv.dispatchEvent(new Event("resize"));
  });
  await field.blur();
  await expect(page.locator(".bottom-nav")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-keyboard-open",
    "false",
  );
  await page.reload();
  await expect(
    page.getByLabel("Вес подхода 2", { exact: true }).first(),
  ).toHaveValue("24,7");
});
