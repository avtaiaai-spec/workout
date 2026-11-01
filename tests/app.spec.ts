import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mandatoryIds } from "../src/catalog";
import { presets, smith } from "./helpers";
test("17 новых изображений и основные функции доступны офлайн на 360 px", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "План", exact: true }),
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
    page.getByRole("heading", { name: "План", exact: true }),
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
  await page.locator(".template-card > summary").first().click();
  await page
    .getByRole("button", { name: "Изменить", exact: true })
    .first()
    .click();
  await expect(page.locator(".plan-exercise")).toHaveCount(7);
  await page.locator(".plan-item-toggle").first().click();
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).fill("23,7");
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).blur();
  await page.reload();
  await page.locator(".plan-item-toggle").first().click();
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
  await expect(
    page.locator(".measurement-stats .stat-card > small:first-of-type"),
  ).toHaveText(["Вес", "Грудь", "Талия", "Бёдра"]);
  for (const row of [
    { date: "2026-09-01", weight: "70,4", waist: "80,5", chest: "96,3" },
    { date: "2026-10-01", weight: "69.2", waist: "78,1", chest: "95,6" },
  ]) {
    await page
      .getByRole("button", { name: "Добавить замер", exact: true })
      .click();
    await page.getByLabel("Дата замера", { exact: true }).fill(row.date);
    await page.getByLabel("Вес, кг", { exact: true }).fill(row.weight);
    await page.getByLabel("Талия, см", { exact: true }).fill(row.waist);
    await page.getByLabel("Грудь, см", { exact: true }).fill(row.chest);
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
    .locator(".page-tools")
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
    .locator(".page-tools")
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
