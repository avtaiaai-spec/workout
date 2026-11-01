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
test("создание по шагам, диапазон, черновик, расписание и фактическая запись", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator(".bottom-nav a")).toHaveText([
    "План",
    "Журнал",
    "Прогресс",
  ]);
  await expect(page.locator(".timer-dock")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Открыть таймер отдыха", exact: true })
    .click();
  await page
    .getByLabel("Произвольный отдых, секунд", { exact: true })
    .fill("1");
  await page.getByRole("button", { name: "Старт", exact: true }).click();
  await expect(page.locator(".timer-dock")).toBeVisible();
  await expect(page.locator(".timer-dock")).toHaveCount(0, { timeout: 5000 });
  await page.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Каталог17/ })).toBeVisible();
  await page
    .getByRole("button", { name: `Выбрать: ${smith}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: `Выбрать: ${plank}`, exact: true })
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
  await expect(page.locator(".plan-exercise")).toHaveCount(2);
  await page.getByLabel(`Вес: ${smith}`, { exact: true }).fill("22,6");
  await page.getByLabel(`Подходов: ${smith}`, { exact: true }).fill("4");
  await page.getByLabel(`Повторения: ${smith}`, { exact: true }).fill("10");
  await page.getByLabel(`Повторы до: ${smith}`, { exact: true }).fill("12");
  await page.getByLabel(`Отдых: ${smith}`, { exact: true }).fill("60");
  await page.getByLabel(`Отдых: ${smith}`, { exact: true }).blur();
  await page.reload();
  await expect(page.getByLabel(`Вес: ${smith}`, { exact: true })).toHaveValue(
    "22,6",
  );
  await page.locator(".plan-item-toggle").filter({ hasText: plank }).click();
  await page.getByLabel(`Подходов: ${plank}`, { exact: true }).fill("2");
  await page.getByLabel(`Секунды: ${plank}`, { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Далее: название", exact: true })
    .click();
  await page
    .getByLabel("Название тренировки", { exact: true })
    .fill("Мой личный план");
  await page.getByRole("button", { name: "2. Подходы", exact: true }).click();
  await expect(
    page.locator(".plan-item-toggle").filter({ hasText: plank }),
  ).toContainText("2 с");
  await page
    .getByRole("button", { name: "Далее: название", exact: true })
    .click();
  await expect(
    page.getByLabel("Название тренировки", { exact: true }),
  ).toHaveValue("Мой личный план");
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
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await page.getByLabel("Повторы подхода 1", { exact: true }).fill("11");
  await page.getByRole("button", { name: /Записать подход/ }).click();
  await expect(page.locator(".done-button.checked")).toHaveCount(1);
  await expect(page.locator(".timer-dock")).toBeVisible();
  await page
    .getByRole("button", { name: /Отменить отметку подход 1:/ })
    .click();
  await expect(page.locator(".done-button.checked")).toHaveCount(0);
  await page.getByRole("button", { name: /Записать подход/ }).click();
  await page.getByLabel("Вес подхода 2", { exact: true }).fill("25,3");
  await page.getByRole("button", { name: /Записать подход/ }).click();
  const data = await readData(page);
  expect(data.templates[0].items[0].sets[0].reps).toBe(10);
  expect(data.sessions[0].items[0].sets[0].recordedAt).toBeGreaterThan(0);
  expect(data.sessions[0].items[0].sets[0].reps).toBe(11);
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
test("замена после выполненного подхода, свободное переключение, сворачивание и восстановление", async ({
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
  await page.getByRole("button", { name: /Записать подход/ }).click();
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
  await page.getByLabel("Вес подхода 1", { exact: true }).fill("24,7");
  await page
    .getByRole("button", { name: "Свернуть тренировку", exact: true })
    .click();
  await expect(page.locator(".bottom-nav a")).toHaveCount(3);
  await expect(page.locator(".resume-dock")).toContainText(
    "Вернуться к тренировке",
  );
  await page.reload();
  await page.locator(".resume-dock").click();
  await expect(page.getByLabel("Вес подхода 1", { exact: true })).toHaveValue(
    "24,7",
  );
  await expect(page.locator(".timer-dock")).toBeVisible();
  await selectExercise(page, plank);
  await expect(
    page.getByRole("heading", { name: plank, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Таймер подхода · 45 с", exact: true })
    .first()
    .click();
  await expect(page.locator(".effort-timer")).toContainText("Подход");
  await page
    .getByRole("button", { name: "Увеличить отдых на 15 секунд", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Пропустить отдых", exact: true })
    .click();
  await expect(page.locator(".effort-timer")).toBeVisible();
  await page
    .getByRole("button", { name: "Остановить таймер подхода", exact: true })
    .click();
  await expect(page.locator(".timer-dock")).toHaveCount(0);
  await selectExercise(page, chest);
  await expect(page.getByLabel("Вес подхода 1", { exact: true })).toHaveValue(
    "24,7",
  );
  await page.getByRole("button", { name: /Записать подход/ }).click();
  await page
    .getByRole("button", { name: "Пропустить оставшиеся", exact: true })
    .click();
  const skipped = await readData(page);
  expect(skipped.sessions[0].items[1].remainingSkipped).toBe(true);
  expect(skipped.sessions[0].items[1].skipped).toBe(false);
  expect(skipped.sessions[0].items[1].sets[0].done).toBe(true);
  await page
    .getByRole("button", { name: "Вернуть оставшиеся", exact: true })
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
  const done = await readData(page);
  expect(done.sessions[0].items[0].sets[0].done).toBe(true);
  expect(done.templates[0].items).toHaveLength(7);
});
test("без плана: сохранить факт, создать шаблон и повторить из журнала", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Начать без плана", exact: true })
    .click();
  await expect(page.locator(".session-clock")).toBeVisible();
  await expect(page.locator(".bottom-nav")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Добавить упражнения", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Выбрать: ${chest}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить выбранные · 1", exact: true })
    .click();
  await page.getByLabel("Вес подхода 1", { exact: true }).fill("18,7");
  await page.getByRole("button", { name: /Записать подход/ }).click();
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
  await expect(
    page.getByRole("heading", { name: "Журнал", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Повторить тренировку", exact: true })
    .click();
  await expect(page.locator(".done-button.checked")).toHaveCount(0);
  await expect(page.getByLabel("Вес подхода 1", { exact: true })).toHaveValue(
    "18,7",
  );
  const state = await readData(page);
  expect(state.templates).toHaveLength(1);
  expect(state.templates[0].name).toBe("Мой экспромт");
  expect(state.sessions).toHaveLength(2);
  expect(state.sessions[1].originSessionId).toBe(state.sessions[0].id);
  expect(state.sessions[1].startedAt).toBeGreaterThan(
    state.sessions[0].startedAt,
  );
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
  await expect(page.locator(".stat-grid")).toContainText("1Завершено занятий");
});
test("другая дата: явное выполнение сейчас; перенос одной даты не меняет серию", async ({
  page,
}) => {
  await ready(page);
  const state = visualState(false);
  const today = localDate(),
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
  const actual = (await readData(page)).sessions.find(
    (s) => s.status === "active",
  )!;
  expect(actual.date).toBe(today);
  expect(actual.occurrenceId).toBe(`weekly:${today}`);
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
