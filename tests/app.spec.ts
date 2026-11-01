import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mandatoryIds } from "../src/catalog";
const smith = "Жим штанги лёжа на горизонтальной скамье в тренажёре Смита";
const plank = "Планка на предплечьях";
async function presets(page: any) {
  await page.goto("/#workouts");
  await page
    .getByRole("button", {
      name: "Добавить мои три готовые тренировки",
      exact: true,
    })
    .click();
  await expect(page.locator(".template-card")).toHaveCount(3);
}
test("новый путь: своя тренировка, единый план упражнения, дни на главной, фактические подходы и копия", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".home-workout")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Новая тренировка", exact: true })
    .click();
  await page.getByLabel("Название тренировки").fill("Мой личный план");
  await page.getByLabel("Название тренировки").blur();
  await page
    .getByRole("button", { name: "Выбрать упражнения", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Упражнения17/ }),
  ).toBeVisible();
  await page
    .locator(".category-card")
    .filter({ has: page.locator("b", { hasText: /^Грудь$/ }) })
    .click();
  await page
    .getByRole("button", { name: `Выбрать: ${smith}`, exact: true })
    .click();
  await page.locator(".exercise-info").filter({ hasText: smith }).click();
  await expect(
    page.getByRole("dialog").locator(".exercise-photo > img"),
  ).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .locator(".exercise-photo > img")
        .evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 1000,
        ),
    )
    .toBe(true);
  await expect(page.getByRole("dialog")).toContainText(
    "Опустите гриф по направляющим к груди",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .locator(".category-card")
    .filter({ has: page.locator("b", { hasText: /^Пресс$/ }) })
    .click();
  await page
    .getByRole("button", { name: `Выбрать: ${plank}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить выбранные · 2", exact: true })
    .click();
  await expect(page.locator(".plan-exercise")).toHaveCount(2);
  await expect(page.getByLabel("Вес подхода 1", { exact: true })).toHaveCount(
    0,
  );
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).fill("22,6");
  await page.getByLabel(`Подходов: ${smith}`, { exact: true }).fill("4");
  await page.getByLabel(`Повторения: ${smith}`, { exact: true }).fill("12");
  await page.getByLabel(`Отдых: ${smith}`, { exact: true }).fill("60");
  await page.getByLabel(`Подходов: ${plank}`, { exact: true }).fill("2");
  await page.getByLabel(`Секунды: ${plank}`, { exact: true }).fill("1");
  await page.getByLabel(`Секунды: ${plank}`, { exact: true }).blur();
  await page
    .getByRole("button", { name: "Сохранить тренировку", exact: true })
    .click();
  await expect(page.locator(".template-card")).toHaveCount(1);
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Сегодня", exact: true })
    .click();
  const weekday = await page.evaluate(() => new Date().getDay());
  const dayName = [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ][weekday];
  await page
    .getByRole("button", { name: `Тренируюсь: ${dayName}`, exact: true })
    .click();
  await page
    .getByLabel(`Тренировка: ${dayName} 1`, { exact: true })
    .selectOption({ label: "Мой личный план" });
  await page
    .getByRole("button", { name: "Сохранить расписание", exact: true })
    .click();
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Календарь", exact: true })
    .click();
  await page.getByRole("button", { name: today, exact: true }).click();
  await expect(page.locator(".plan-row")).toContainText("Мой личный план");
  await page
    .getByRole("button", { name: "Начать Мой личный план", exact: true })
    .click();
  await expect(page.getByLabel("Вес подхода 4", { exact: true })).toHaveValue(
    "22,6",
  );
  await expect(
    page.getByLabel("Повторы подхода 4", { exact: true }),
  ).toHaveValue("12");
  await page
    .getByRole("button", { name: `Выполнить подход 1: ${smith}`, exact: true })
    .click();
  await page.getByLabel("Вес подхода 2", { exact: true }).fill("25,3");
  await page.getByLabel("Повторы подхода 2", { exact: true }).fill("8");
  await page
    .getByRole("button", { name: `Выполнить подход 2: ${smith}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Увеличить отдых на 15 секунд", exact: true })
    .click();
  await expect(page.locator(".timer-toggle")).toContainText("Отдых ·");
  await page
    .getByRole("button", { name: "Таймер подхода · 1 с", exact: true })
    .first()
    .click();
  await expect(page.locator(".effort-timer")).toContainText("Время вышло");
  await page
    .getByRole("button", { name: `Выполнить подход 1: ${plank}`, exact: true })
    .click();
  await expect(page.locator(".done-button.checked")).toHaveCount(3);
  await expect(page.locator(".save-status")).toContainText("Сохранено");
  await page.reload();
  await expect(page.locator(".done-button.checked")).toHaveCount(3);
  await expect(page.getByLabel("Вес подхода 2", { exact: true })).toHaveValue(
    "25,3",
  );
  await page.getByRole("button", { name: "Завершить", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Осталось 3 подходов");
  await page
    .getByRole("button", { name: "Завершить и сохранить", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Посмотреть результаты", exact: true })
    .click();
  await page.getByRole("button", { name: "К обзору", exact: true }).click();
  await expect(page.locator(".history-list")).toContainText("Мой личный план");
  await page
    .locator(".exercise-links")
    .getByRole("button", { name: smith, exact: true })
    .click();
  await page.getByRole("button", { name: "История", exact: true }).click();
  await expect(page.getByRole("dialog").locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Прогресс", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: /График/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Тренировки", exact: true })
    .click();
  await page
    .locator(".template-card")
    .getByRole("button", { name: "Изменить", exact: true })
    .click();
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).fill("77");
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).blur();
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
  const file = await pending;
  const backup = JSON.parse(
    (await readFile((await file.path())!, "utf8")).replace(/^\uFEFF/, ""),
  );
  expect(backup.version).toBe(2);
  expect(backup.sessions[0].items[0].sets[0].weight).toBe(22.6);
  expect(backup.sessions[0].items[0].sets[1].weight).toBe(25.3);
  expect(
    backup.templates[0].items[0].sets.every((s: any) => s.weight === 77),
  ).toBe(true);
  await page.getByLabel("Режим импорта").selectOption("replace");
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole("button", { name: "Подтвердить полную замену", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("восстановлена");
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("Данные не изменены");
  expect(errors).toEqual([]);
});
test("17 новых изображений и основные функции доступны офлайн на 360 px", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await presets(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Мои тренировки", exact: true }),
  ).toBeVisible();
  const media = await page.evaluate(
    async (ids) =>
      Promise.all(
        ids.map(async (id) => {
          const r = await fetch(`./media/exercises/${id}.webp`);
          return (
            r.ok &&
            r.headers.get("content-type")?.includes("image/webp") &&
            (await r.blob()).size > 30000
          );
        }),
      ),
    mandatoryIds,
  );
  expect(media).toEqual(Array(17).fill(true));
  await page
    .getByRole("button", { name: "Изменить", exact: true })
    .first()
    .click();
  await expect(page.locator(".plan-exercise")).toHaveCount(7);
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).fill("23,7");
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).blur();
  await page.reload();
  await expect(page.getByLabel(`Вес: ${smith}`, { exact: true })).toHaveValue(
    "23,7",
  );
  for (const route of [
    "today",
    "workouts",
    "catalog",
    "calendar",
    "progress",
    "body",
  ]) {
    await page.goto("/#" + route);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
});
test("замеры: создать, сравнить, изменить, удалить, экспортировать и восстановить", async ({
  page,
}) => {
  await page.goto("/#body");
  await expect(
    page.getByRole("heading", { name: "Замеры тела", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".measurement-record")).toHaveCount(0);
  for (const row of [
    { date: "2026-09-01", weight: "70,4", waist: "80,5" },
    { date: "2026-10-01", weight: "69.2", waist: "78,1" },
  ]) {
    await page
      .getByRole("button", { name: "Добавить замер", exact: true })
      .click();
    await page.getByLabel("Дата замера", { exact: true }).fill(row.date);
    await page.getByLabel("Вес, кг", { exact: true }).fill(row.weight);
    await page.getByLabel("Талия, см", { exact: true }).fill(row.waist);
    await page
      .getByRole("button", { name: "Сохранить замер", exact: true })
      .click();
  }
  await expect(page.locator(".measurement-record")).toHaveCount(2);
  await expect(page.locator(".measurement-delta")).toContainText("69,2 кг");
  await page
    .getByLabel("Показатель замеров", { exact: true })
    .selectOption("waist");
  await expect(page.locator(".measurement-delta")).toContainText("78,1 см");
  await expect(page.locator(".measurement-delta")).toContainText("-2,4 см");
  await page
    .getByRole("button", { name: "2026-10-01: 78,1 см", exact: true })
    .click();
  await expect(page.locator(".chart-value")).toContainText("2026-10-01");
  await page
    .getByRole("button", { name: "Изменить замер 2026-10-01", exact: true })
    .click();
  await page.getByLabel("Талия, см", { exact: true }).fill("77,8");
  await page
    .getByRole("button", { name: "Сохранить замер", exact: true })
    .click();
  await expect(page.locator(".measurement-delta")).toContainText("77,8 см");
  await page.reload();
  await expect(page.locator(".measurement-record")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Добавить замер", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сохранить замер", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Укажите хотя бы один замер",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт CSV", exact: true }).click();
  expect((await csv).suggestedFilename()).toContain("zamery");
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
  const file = await exported;
  const raw = (await readFile((await file.path())!, "utf8")).replace(
    /^\uFEFF/,
    "",
  );
  const backup = JSON.parse(raw);
  expect(backup.measurements).toHaveLength(2);
  expect(
    backup.measurements.find((m: any) => m.date === "2026-10-01").values.waist,
  ).toBe(77.8);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .getByRole("button", { name: "Удалить замер 2026-09-01", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Удалить эту запись", exact: true })
    .click();
  await expect(page.locator(".measurement-record")).toHaveCount(1);
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  await page.getByLabel("Режим импорта").selectOption("replace");
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page
    .getByRole("button", { name: "Подтвердить полную замену", exact: true })
    .click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".measurement-record")).toHaveCount(2);
});
