import { expect, Page } from "@playwright/test";
import { initialState, seedTemplates } from "../src/catalog";
import { createSession, localDate, shiftDate, State } from "../src/model";
export const smith =
  "Жим штанги лёжа на горизонтальной скамье в тренажёре Смита";
export const chest = "Жим в тренажёре от груди вперёд";
export const plank = "Планка на предплечьях";
export async function readData(page: Page): Promise<State> {
  return page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const r = indexedDB.open("moi-trenirovki", 1);
        r.onsuccess = () => {
          const db = r.result;
          const q = db.transaction("state").objectStore("state").get("main");
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
          q.onerror = () => reject(q.error);
        };
      }),
  );
}
export async function writeData(page: Page, state: State) {
  await page.evaluate(
    (data) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("moi-trenirovki", 1);
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction("state", "readwrite");
          tx.objectStore("state").put(data, "main");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    JSON.parse(JSON.stringify(state)),
  );
  await page.reload();
}
export async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "План", exact: true }),
  ).toBeVisible();
}
export async function presets(page: Page) {
  await page.goto("/#plan");
  const button = page.getByRole("button", {
    name: "Добавить мои три готовые тренировки",
    exact: true,
  });
  if (await button.isVisible()) await button.click();
  await expect(page.locator(".template-card")).toHaveCount(3);
}
export async function appearance(page: Page, name: string) {
  await page
    .locator(".page-tools")
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}
export async function finish(page: Page) {
  await page
    .getByRole("button", { name: "Меню тренировки", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Управление занятием", exact: true })
    .getByRole("button", { name: "Завершить тренировку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Завершить и сохранить", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Тренировка сохранена", exact: true }),
  ).toBeVisible();
}
export async function selectExercise(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Список упражнений", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .locator(".choose-row")
    .filter({ has: page.locator("b", { hasText: name }) })
    .first()
    .click();
}
export function visualState(active = false) {
  const state = initialState();
  state.templates = seedTemplates();
  state.seeded.push("personal-v1");
  const today = localDate();
  const complete = createSession(
    state.templates[0],
    undefined,
    Date.now() - 86400000,
  );
  complete.id = "design-completed";
  complete.date = shiftDate(today, -1);
  complete.status = "completed";
  complete.endedAt = complete.startedAt + 1800000;
  complete.items[0].sets[0].done = true;
  complete.items[0].sets[1].done = true;
  state.sessions = [complete];
  state.rules = [
    {
      id: "design-rule",
      templateId: state.templates[0].id,
      start: today,
      once: true,
      weekdays: [],
    },
  ];
  state.measurements = [
    {
      id: "body-a",
      date: shiftDate(today, -10),
      createdAt: Date.now() - 864000000,
      values: { weight: 70.4, chest: 96.3, waist: 80.5, hips: 100 },
      note: "Первый замер",
    },
    {
      id: "body-b",
      date: today,
      createdAt: Date.now(),
      values: { weight: 69.2, chest: 95.6, waist: 79.4, hips: 99.6 },
      note: "Второй замер",
    },
  ];
  if (active) {
    const a = createSession(
      state.templates[0],
      `design-rule:${today}`,
      Date.now() - 120000,
    );
    a.id = "design-active";
    a.items[0].sets[0].done = true;
    a.currentSetId = a.items[0].sets[1].id;
    a.items[0].sets[0].weight = 22.6;
    state.sessions.push(a);
    state.restEnd = Date.now() + 90000;
  }
  return state;
}
