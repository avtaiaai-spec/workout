import { test, expect } from "@playwright/test";
import {
  ready,
  presets,
  readData,
  writeData,
  finish,
  selectExercise,
  visualState,
  smith,
  chest,
  plank,
} from "./helpers";
import { localDate, shiftDate, occurrences } from "../src/model";
async function plus(page: any) {
  const button = page.getByRole("button", {
    name: "Записать подход",
    exact: true,
  });
  await expect(button).toBeEnabled();
  await button.click();
}
async function planFields(page: any) {
  const details = page.locator(".exercise-plan-summary details");
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
}
test("план упражнения → + → исправление факта; следующие подходы берут заданный план", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator(".bottom-nav a")).toHaveText([
    "План",
    "Журнал",
    "Прогресс",
  ]);
  await expect(
    page.getByRole("button", { name: "Открыть таймер отдыха", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Каталог17/ })).toBeVisible();
  for (const name of [smith, plank])
    await page
      .getByRole("button", { name: `Выбрать: ${name}`, exact: true })
      .click();
  await page.locator(".exercise-info").filter({ hasText: smith }).click();
  await expect(
    page.getByRole("dialog").locator(".exercise-photo > img"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Выбрать: ${plank}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Добавить выбранные · 2", exact: true })
    .click();
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).fill("22,6");
  await page.getByLabel(`Подходов: ${smith}`, { exact: true }).fill("4");
  await page.getByLabel(`Повторения: ${smith}`, { exact: true }).fill("10");
  await page.getByLabel(`Отдых: ${smith}`, { exact: true }).fill("60");
  await page.getByLabel(`Отдых: ${smith}`, { exact: true }).blur();
  await page.reload();
  await expect(page.getByLabel(`Вес: ${smith}`, { exact: true })).toHaveValue(
    "22,6",
  );
  await page.locator(".plan-item-toggle").filter({ hasText: plank }).click();
  await page.getByLabel(`Секунды: ${plank}`, { exact: true }).fill("45");
  await page
    .getByRole("button", { name: "Далее: название", exact: true })
    .click();
  await page
    .getByLabel("Название тренировки", { exact: true })
    .fill("Мой личный план");
  await page
    .getByRole("button", { name: "Сохранить тренировку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Настроить расписание", exact: true })
    .click();
  const day = await page.evaluate(
    () =>
      [
        "Воскресенье",
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
      ][new Date().getDay()],
  );
  await page
    .getByRole("button", { name: `Тренируюсь: ${day}`, exact: true })
    .click();
  await page
    .getByLabel(`Тренировка: ${day} 1`, { exact: true })
    .selectOption({ label: "Мой личный план" });
  await page
    .getByRole("button", { name: "Сохранить расписание", exact: true })
    .click();
  await page
    .locator(".scheduled-workout")
    .getByRole("button", { name: "Начать", exact: true })
    .click();
  await expect(page.locator(".bottom-nav")).toHaveCount(0);
  await expect(page.locator(".recorded-set")).toHaveCount(0);
  await expect(page.locator(".set-table")).toHaveCount(0);
  await plus(page);
  await expect(page.locator(".recorded-set")).toHaveCount(1);
  await expect(page.locator(".recorded-set").first()).toContainText(
    "22,6 кг × 10",
  );
  await expect(page.locator(".exercise-rest.running")).toBeVisible();
  await page
    .getByRole("button", { name: "Изменить подход 1", exact: true })
    .click();
  await page.getByLabel("Вес подхода 1", { exact: true }).fill("25,3");
  await page.getByLabel("Повторы подхода 1", { exact: true }).fill("11");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await plus(page);
  await expect(page.locator(".recorded-set").nth(1)).toContainText(
    "22,6 кг × 10",
  );
  await page
    .getByRole("button", { name: "Отменить запись подхода 1", exact: true })
    .click();
  await expect(page.locator(".recorded-set")).toHaveCount(1);
  await plus(page);
  await expect(page.locator(".recorded-set")).toHaveCount(2);
  await expect(page.locator(".recorded-set").first()).toContainText(
    "22,6 кг × 10",
  );
  const data = await readData(page);
  expect(
    data.templates[0].items[0].sets.every(
      (s) => s.weight === 22.6 && s.reps === 10,
    ),
  ).toBe(true);
  expect(data.sessions[0].items[0].sets[0].recordedAt).toBeGreaterThan(0);
  await finish(page);
  await page
    .getByRole("button", { name: "Посмотреть результаты", exact: true })
    .click();
  await page.getByRole("button", { name: "К обзору", exact: true }).click();
  await expect(page.locator(".history-list")).toContainText("Мой личный план");
  await page.locator(".journal-entry .list-row").click();
  await page.getByLabel("Вес подхода 2", { exact: true }).fill("26,4");
  await page.getByLabel("Вес подхода 2", { exact: true }).blur();
  await page.goto("/#progress");
  await page.getByLabel("Упражнение для прогресса").selectOption("smith-bench");
  await expect(page.locator(".exercise-full-history tbody tr")).toHaveCount(2);
  await expect(page.locator(".exercise-full-history")).toContainText("26,4");
});
test("последовательность, таймеры внутри упражнений, сохранение при замене и перезагрузке", async ({
  page,
}) => {
  await ready(page);
  await presets(page);
  await page.locator(".template-card > summary").first().click();
  await page
    .locator(".template-card")
    .first()
    .getByRole("button", { name: "Начать", exact: true })
    .click();
  await plus(page);
  await page.locator(".exercise-management > summary").click();
  await page.getByRole("button", { name: "Заменить", exact: true }).click();
  await page
    .getByRole("button", { name: `Выбрать: ${chest}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить выбранные · 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: chest, exact: true }),
  ).toBeVisible();
  const replaced = await readData(page);
  expect(replaced.sessions[0].items[0].exercise.id).toBe("smith-bench");
  expect(replaced.sessions[0].items[0].sets).toHaveLength(1);
  expect(replaced.sessions[0].items[0].sets[0].done).toBe(true);
  expect(replaced.sessions[0].items[1].sets).toHaveLength(3);
  await planFields(page);
  await page.getByLabel("Вес следующих подходов", { exact: true }).fill("24,7");
  await plus(page);
  await page
    .getByRole("button", { name: "Свернуть тренировку", exact: true })
    .click();
  await expect(page.locator(".bottom-nav a")).toHaveCount(3);
  await page.reload();
  await page.locator(".resume-dock").click();
  await expect(page.locator(".recorded-set").first()).toContainText("24,7 кг");
  await expect(page.locator(".exercise-rest.running")).toBeVisible();
  await selectExercise(page, plank);
  await expect(page.locator(".exercise-rest.running")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Таймер подхода · 45 с", exact: true })
    .click();
  await expect(page.locator(".approach-countdown")).toContainText("Подход");
  await plus(page);
  await expect(page.locator(".recorded-set")).toContainText("45 с");
  await expect(page.locator(".approach-countdown")).toHaveCount(0);
  await expect(page.locator(".exercise-rest.running")).toBeVisible();
  const plankDeadline = (await readData(page)).sessions[0].items.find(
    (i) => i.exercise.id === "forearm-plank",
  )!.restEnd;
  await selectExercise(page, chest);
  await expect(page.locator(".exercise-rest.running")).toBeVisible();
  await page
    .getByRole("button", { name: "Увеличить отдых на 15 секунд", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Пропустить отдых", exact: true })
    .click();
  await expect(page.locator(".exercise-rest.running")).toHaveCount(0);
  expect(
    (await readData(page)).sessions[0].items.find(
      (i) => i.exercise.id === "forearm-plank",
    )!.restEnd,
  ).toBe(plankDeadline);
  await page.locator(".exercise-management > summary").click();
  await page
    .getByRole("button", { name: "Пропустить оставшиеся", exact: true })
    .click();
  const skipped = await readData(page);
  expect(skipped.sessions[0].items[1].remainingSkipped).toBe(true);
  expect(skipped.sessions[0].items[1].sets[0].done).toBe(true);
  await page
    .getByRole("button", { name: "Вернуть оставшиеся подходы", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Меню тренировки", exact: true })
    .click();
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await expect(page.locator(".session-clock")).toContainText("На паузе");
  await page.reload();
  await expect(page.locator(".session-clock")).toContainText("На паузе");
  await page
    .getByRole("button", { name: "Меню тренировки", exact: true })
    .click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await finish(page);
  await page
    .getByRole("button", { name: "Посмотреть результаты", exact: true })
    .click();
  expect((await readData(page)).templates[0].items).toHaveLength(7);
});
test("без плана, сохранение шаблона, повторение и история каждого прошлого занятия", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Начать без плана", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить упражнения", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Выбрать: ${chest}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить выбранные · 1", exact: true })
    .click();
  await planFields(page);
  await page.getByLabel("Вес следующих подходов", { exact: true }).fill("18,7");
  await plus(page);
  await finish(page);
  await page
    .getByLabel("Название нового шаблона", { exact: true })
    .fill("Мой экспромт");
  await page
    .getByRole("button", { name: "Сохранить как новый шаблон", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Посмотреть результаты", exact: true })
    .click();
  await page.getByRole("button", { name: "К обзору", exact: true }).click();
  await page
    .getByRole("button", { name: "Повторить тренировку", exact: true })
    .click();
  await expect(page.locator(".recorded-set")).toHaveCount(0);
  await expect(page.locator(".exercise-session-history")).toContainText(
    "18,7 кг × 10",
  );
  await expect(page.locator(".past-workout")).toHaveCount(1);
  await plus(page);
  await finish(page);
  await page
    .getByRole("button", { name: "Посмотреть результаты", exact: true })
    .click();
  await page.getByRole("button", { name: "К обзору", exact: true }).click();
  await page
    .getByRole("button", { name: "Повторить тренировку", exact: true })
    .first()
    .click();
  await expect(page.locator(".past-workout")).toHaveCount(2);
  const data = await readData(page);
  expect(data.templates).toHaveLength(1);
  expect(data.templates[0].name).toBe("Мой экспромт");
  expect(data.sessions.filter((s) => s.status === "completed")).toHaveLength(2);
  await page
    .getByRole("button", { name: "Меню тренировки", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Отменить тренировку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Подтвердить отмену", exact: true })
    .click();
  await page.goto("/#progress");
  await expect(page.locator(".stat-grid")).toContainText("2Завершено занятий");
});
test("план другого дня: выполнить сейчас, перенос только одной даты и запрет второго активного", async ({
  page,
}) => {
  await ready(page);
  const state = visualState(false),
    today = localDate(),
    tomorrow = shiftDate(today, 1);
  state.rules = [
    {
      id: "weekly",
      templateId: state.templates[0].id,
      start: today,
      once: false,
      weekdays: [new Date(today + "T12:00:00").getDay()],
    },
  ];
  await writeData(page, state);
  await page
    .locator(".scheduled-workout")
    .getByRole("button", { name: "Перенести", exact: true })
    .click();
  await page.getByLabel("Новая дата", { exact: true }).fill(tomorrow);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Перенести", exact: true })
    .click();
  const moved = await readData(page);
  expect(occurrences(moved, today, today)).toHaveLength(0);
  expect(occurrences(moved, tomorrow, tomorrow)).toHaveLength(1);
  expect(
    occurrences(moved, shiftDate(today, 7), shiftDate(today, 7)),
  ).toHaveLength(1);
  await page
    .locator(".scheduled-workout")
    .getByRole("button", { name: "Начать", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Выполнить сейчас?", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Выполнить сейчас", exact: true })
    .click();
  const active = (await readData(page)).sessions.find(
    (s) => s.status === "active",
  )!;
  expect(active.date).toBe(today);
  expect(active.occurrenceId).toBe(`weekly:${today}`);
  await page
    .getByRole("button", { name: "Свернуть тренировку", exact: true })
    .click();
  await page.locator(".template-card > summary").first().click();
  await page
    .locator(".template-card")
    .first()
    .getByRole("button", { name: "Начать", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Тренировка уже идёт", exact: true }),
  ).toBeVisible();
  expect(
    (await readData(page)).sessions.filter((s) => s.status === "active"),
  ).toHaveLength(1);
});
test("вес берётся из шаблона; все прошлые тренировки видны ниже подходов", async ({
  page,
}) => {
  await ready(page);
  const state = visualState(false),
    previous = state.sessions[0];
  previous.items[0].sets[0].weight = 35;
  previous.items[0].sets[1].weight = 30;
  await writeData(page, state);
  await page
    .locator(".scheduled-workout")
    .getByRole("button", { name: "Начать", exact: true })
    .click();
  await plus(page);
  await expect(page.locator(".recorded-set").first()).toContainText(
    "20 кг × 10",
  );
  await expect(page.locator(".exercise-session-history")).toContainText(
    "35 кг × 10",
  );
  await expect(page.locator(".exercise-session-history")).toContainText(
    "30 кг × 10",
  );
});
