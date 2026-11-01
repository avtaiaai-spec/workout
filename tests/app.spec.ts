import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const smith = "Жим штанги лёжа на горизонтальной скамье в тренажёре Смита";
const plank = "Планка на предплечьях";
test("полный путь: создать, выбрать, запланировать, записать, восстановить, завершить и экспортировать", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Новая тренировка", exact: true })
    .click();
  await page.getByLabel("Название тренировки").fill("Проверка моего ритма");
  await page.getByLabel("Название тренировки").blur();
  await page
    .getByRole("button", { name: "Добавить упражнения", exact: true })
    .click();
  await page
    .locator(".category-card")
    .filter({ has: page.locator("b", { hasText: /^Грудь$/ }) })
    .click();
  await page
    .getByRole("button", { name: `Выбрать: ${smith}`, exact: true })
    .click();
  await page.locator(".exercise-info").filter({ hasText: smith }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Опустите гриф по направляющим к груди",
  );
  await expect(
    page.getByRole("dialog").locator(".illustration svg[role=img]"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .locator(".category-card")
    .filter({ has: page.locator("b", { hasText: /^Пресс$/ }) })
    .click();
  await page
    .getByRole("button", { name: `Выбрать: ${plank}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Добавить выбранные · 2" }).click();
  await expect(page.locator(".workout-item")).toHaveCount(2);
  await page.getByLabel("Вес подхода 1", { exact: true }).fill("22,6");
  await page.getByLabel("Повторы подхода 1", { exact: true }).fill("12");
  await page.getByLabel("Секунды подхода 1", { exact: true }).fill("1");
  await page.getByLabel("Секунды подхода 1", { exact: true }).blur();
  await page
    .locator(".workout-item")
    .first()
    .locator(".set-options summary")
    .first()
    .click();
  await page
    .getByLabel("Точное время отдыха 1", { exact: true })
    .first()
    .fill("60");
  await page
    .getByLabel("Точное время отдыха 1", { exact: true })
    .first()
    .blur();
  await page
    .getByRole("button", { name: "Все тренировки", exact: true })
    .click();
  const card = page.locator(".template-card").filter({
    has: page.getByRole("heading", { name: "Проверка моего ритма" }),
  });
  await card.getByRole("button", { name: "В план", exact: true }).click();
  await page.getByLabel("Повторять каждую неделю").check();
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const weekday = await page.evaluate(() => new Date().getDay());
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][weekday],
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Сохранить расписание" }).click();
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Календарь", exact: true })
    .click();
  await page.getByRole("button", { name: today, exact: true }).click();
  await expect(page.locator(".plan-row")).toContainText("Проверка моего ритма");
  await page
    .getByRole("button", { name: "Начать Проверка моего ритма", exact: true })
    .click();
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
    .click();
  await expect(page.locator(".effort-timer")).toContainText("Время вышло", {
    timeout: 5000,
  });
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
  await page.getByRole("button", { name: "Завершить и сохранить" }).click();
  await expect(page.getByRole("dialog")).toContainText("Тренировка сохранена");
  await page.getByRole("button", { name: "Посмотреть результаты" }).click();
  await expect(page.locator(".inline-stats")).toContainText("3 подходов");
  await page.getByRole("button", { name: "К обзору", exact: true }).click();
  await expect(page.locator(".history-list")).toContainText(
    "Проверка моего ритма",
  );
  await page
    .locator(".exercise-links")
    .getByRole("button", { name: smith })
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
    .filter({ hasText: "Проверка моего ритма" })
    .getByRole("button", { name: "Изменить", exact: true })
    .click();
  await page.getByLabel("Вес подхода 1", { exact: true }).fill("77");
  await page.getByLabel("Вес подхода 1", { exact: true }).blur();
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON" }).click();
  const file = await dl;
  const data = JSON.parse(
    (await readFile((await file.path())!, "utf8")).replace(/^\uFEFF/, ""),
  );
  const session = data.sessions.find(
    (s: any) => s.name === "Проверка моего ритма",
  );
  expect(session.items[0].sets[0].weight).toBe(22.6);
  expect(session.items[0].sets[1].weight).toBe(25.3);
  expect(data.templates.at(-1).items[0].sets[0].weight).toBe(77);
  await page
    .getByRole("combobox", { name: "Режим импорта" })
    .selectOption("replace");
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByRole("button", { name: "Подтвердить полную замену" }).click();
  await expect(page.getByRole("status")).toContainText("восстановлена");
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":9}'),
  });
  await expect(page.getByRole("alert")).toContainText("Данные не изменены");
  expect(errors).toEqual([]);
});
test("360 px, все разделы без переполнения и офлайн после первой загрузки", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Сегодня", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
    return r.scope;
  });
  await page.screenshot({
    path: "test-results/today-mobile.png",
    fullPage: true,
  });
  for (const route of [
    "today",
    "workouts",
    "catalog",
    "calendar",
    "progress",
  ]) {
    await page.goto("/#" + route);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ваш прогресс", exact: true }),
  ).toBeVisible();
  await page.goto("/#workouts");
  await page
    .getByRole("button", { name: "Изменить", exact: true })
    .first()
    .click();
  await expect(page.locator(".workout-item")).toHaveCount(7);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Вес подхода 1", { exact: true }).first().fill("23,7");
  await page.getByLabel("Вес подхода 1", { exact: true }).first().blur();
  await page.reload();
  await expect(
    page.getByLabel("Вес подхода 1", { exact: true }).first(),
  ).toHaveValue("23,7");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#today");
  await page.screenshot({
    path: "test-results/today-desktop.png",
    fullPage: true,
  });
});
