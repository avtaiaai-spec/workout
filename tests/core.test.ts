import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto";
import {
  catalog,
  initialState,
  seedTemplates,
  migrate,
  mandatoryIds,
  addPersonalTemplates,
} from "../src/catalog";
import {
  stateSchema,
  createSession,
  elapsed,
  externalVolume,
  stats,
  occurrences,
  importBackup,
  shiftDate,
  localDate,
  categories,
  previousSet,
} from "../src/model";
import { writeState, readState, csv } from "../src/storage";
const preparedState = () => {
  const s = initialState();
  addPersonalTemplates(s);
  return s;
};
const expected = [
  [
    ["smith-bench", 4, 10, 20],
    ["machine-chest", 3, 10, 18],
    ["cable-row", 4, 12, 22.6],
    ["wide-pulldown", 4, 12, 27.3],
    ["triceps-pushdown", 3, 6, 13],
    ["dumbbell-curl", 4, 10, 6],
    ["forearm-plank", 3, 45, 0],
  ],
  [
    ["machine-hip-thrust", 5, 8, 42.7],
    ["barbell-rdl", 4, 10, 25],
    ["cable-kickback", 3, 10, 9],
    ["leg-extension", 3, 12, 32],
    ["hip-adduction", 3, 15, 41],
  ],
  [
    ["kettlebell-plie", 4, 10, 20],
    ["dumbbell-rdl", 4, 10, 25],
    ["glute-hyperextension", 4, 12, 10],
    ["lying-leg-curl", 4, 12, 21.4],
    ["hip-abduction", 4, 15, 45],
    ["forearm-plank", 3, 45, 0],
  ],
];
describe("Точный каталог и персональные шаблоны", () => {
  it("Только 17 выбранных упражнений, отдельные варианты и содержательная техника", () => {
    expect(mandatoryIds).toHaveLength(17);
    expect(new Set(catalog.map((e) => e.id)).size).toBe(catalog.length);
    expect(catalog).toHaveLength(17);
    for (const id of mandatoryIds)
      expect(
        catalog.find((e) => e.id === id)?.technique.length,
      ).toBeGreaterThanOrEqual(2);
  });
  it("все три названия, порядок, веса, подходы, повторения и секунды точны", () => {
    const t = seedTemplates();
    expect(t.map((t) => t.name)).toEqual([
      "Спина + грудь + руки",
      "Ноги + ягодицы — день 1",
      "Ноги + ягодицы — день 2",
    ]);
    t.forEach((template, n) => {
      expect(template.items.map((i) => i.exercise.id)).toEqual(
        expected[n].map((r) => r[0]),
      );
      template.items.forEach((item, i) => {
        const [id, count, reps, weight] = expected[n][i];
        expect(item.sets.length).toBe(
          Number(count) * (id === "cable-kickback" ? 2 : 1),
        );
        for (const set of item.sets) {
          expect(set.weight).toBe(weight);
          expect(
            item.exercise.measure === "time" ? set.seconds : set.reps,
          ).toBe(reps);
          expect(set.done).toBe(false);
        }
        if (id === "cable-kickback") {
          expect(item.sets.filter((s) => s.side === "Л")).toHaveLength(3);
          expect(item.sets.filter((s) => s.side === "П")).toHaveLength(3);
        }
      });
    });
    expect(t[0].items.at(-1)?.exercise.id).toBe(t[2].items.at(-1)?.exercise.id);
    expect(t[0].items[0].accounting).toBe("added");
    expect(t[0].items[5].accounting).toBe("unknown");
    expect(t[2].items[1].accounting).toBe("unknown");
  });
  it("обновление не дублирует шаблоны и не перезаписывает пользовательские изменения", () => {
    const state = preparedState();
    state.templates[0].name = "Моя версия";
    state.templates[0].items[0].sets[0].weight = 33.7;
    expect(migrate(migrate(state))).toEqual(state);
    expect(stats(state.sessions).count).toBe(0);
    expect(state.rules).toHaveLength(0);
  });
});
describe("Занятия, время и статистика", () => {
  it("снимок не зависит от шаблона, учитывает только завершённые выполненные подходы", () => {
    const state = preparedState();
    const s = createSession(state.templates[0]);
    s.items[0].sets[0].done = true;
    s.items[0].sets[0].weight = 21.5;
    expect(stats([s]).sets).toBe(0);
    s.status = "completed";
    s.endedAt = s.startedAt + 100000;
    expect(stats([s]).sets).toBe(1);
    expect(stats([s]).volume).toBe(215);
    state.templates[0].items[0].sets[0].weight = 99;
    expect(s.items[0].sets[0].weight).toBe(21.5);
    s.items[0].sets[0].done = false;
    expect(stats([s]).volume).toBe(0);
    s.status = "cancelled";
    expect(stats([s]).count).toBe(0);
  });
  it("исключает паузы, сохраняет ход времени в фоне и после восстановления", () => {
    const s = createSession(seedTemplates()[0], undefined, 1000);
    expect(elapsed(s, 11000)).toBe(10000);
    s.pausedAt = 6000;
    expect(elapsed(s, 21000)).toBe(5000);
    s.pausedMs = 15000;
    s.pausedAt = null;
    expect(elapsed(s, 26000)).toBe(10000);
    s.endedAt = 30000;
    expect(elapsed(s, 99999)).toBe(14000);
  });
  it("не округляет дробные веса, исключает неуточнённые гантели и помощь", () => {
    const t = seedTemplates();
    const row = t[0].items[2];
    expect(externalVolume(row, row.sets[0])).toBe(271.20000000000005);
    const db = t[0].items[5];
    expect(externalVolume(db, db.sets[0])).toBe(0);
    db.accounting = "single";
    expect(externalVolume(db, db.sets[0])).toBe(120);
    db.accounting = "pair";
    expect(externalVolume(db, db.sets[0])).toBe(60);
    db.accounting = "assistance";
    expect(externalVolume(db, db.sets[0])).toBe(0);
  });
  it("не удваивает объём отведения ноги повторно", () => {
    const s = createSession(seedTemplates()[1]);
    s.status = "completed";
    s.items[2].sets.forEach((s) => (s.done = true));
    expect(stats([s]).volume).toBe(540);
    expect(stats([s]).sets).toBe(6);
    expect(stats([s]).reps).toBe(60);
  });
});
describe("Расписание и исключения", () => {
  it("переносит только одну дату и сохраняет серию", () => {
    const state = preparedState();
    state.rules = [
      {
        id: "r",
        templateId: state.templates[0].id,
        start: "2026-11-02",
        weekdays: [1],
        once: false,
      },
    ];
    state.exceptions = [
      {
        id: "r:2026-11-02",
        ruleId: "r",
        originalDate: "2026-11-02",
        date: "2026-11-03",
        cancelled: false,
      },
    ];
    const events = occurrences(state, "2026-11-01", "2026-11-15");
    expect(events.map((e) => e.date)).toEqual(["2026-11-03", "2026-11-09"]);
    const session = createSession(state.templates[0], events[0].id);
    session.status = "completed";
    state.sessions.push(session);
    expect(occurrences(state, "2026-11-03", "2026-11-03")).toHaveLength(1);
    expect(occurrences(state, "2026-11-03", "2026-11-03")[0].status).toBe(
      "completed",
    );
  });
  it("изменение серии не переписывает прошлые даты", () => {
    const state = preparedState();
    state.rules = [
      {
        id: "old",
        templateId: "t",
        start: "2026-11-02",
        end: "2026-11-08",
        weekdays: [1],
        once: false,
      },
      {
        id: "new",
        templateId: "t",
        start: "2026-11-09",
        weekdays: [3],
        once: false,
      },
    ];
    expect(
      occurrences(state, "2026-11-01", "2026-11-15").map((e) => e.date),
    ).toEqual(["2026-11-02", "2026-11-11"]);
  });
  it("локальные даты стабильны на границе месяца и года", () => {
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });
});
describe("IndexedDB и импорт", () => {
  it("восстанавливает активное занятие, отметки, оба таймера и дробный вес", async () => {
    const state = preparedState();
    const s = createSession(state.templates[0]);
    s.items[0].sets[0].weight = 22.6;
    s.items[0].sets[0].done = true;
    state.sessions = [s];
    state.restEnd = Date.now() + 90000;
    state.effort = {
      end: Date.now() + 45000,
      itemId: s.items[0].id,
      setId: s.items[0].sets[0].id,
    };
    await writeState(state);
    const restored = await readState();
    expect(restored).toEqual(state);
    expect(restored.sessions[0].status).toBe("active");
  });
  it("полная копия восстанавливается, повторный импорт не создаёт дублей", () => {
    const state = preparedState();
    state.exercises.push({
      ...state.exercises[0],
      id: "custom",
      custom: true,
      image: "data:image/png;base64,YQ==",
    });
    const raw = JSON.parse(JSON.stringify(state));
    expect(importBackup(raw, initialState(), "replace")).toEqual(state);
    expect(
      importBackup(raw, importBackup(raw, state, "merge"), "merge"),
    ).toEqual(state);
  });
  it("отклоняет неправильную версию, отрицательные веса, дубли ID и два активных занятия, не меняя данные", () => {
    const current = preparedState();
    const snapshot = JSON.stringify(current);
    expect(() => importBackup({ version: 2 }, current, "replace")).toThrow();
    const raw = structuredClone(current);
    raw.templates[0].items[0].sets[0].weight = -10;
    expect(() => importBackup(raw, current, "replace")).toThrow();
    const dup = structuredClone(current);
    dup.templates.push(dup.templates[0]);
    expect(() => importBackup(dup, current, "replace")).toThrow();
    const active = structuredClone(current);
    active.sessions = [
      createSession(active.templates[0]),
      createSession(active.templates[1]),
    ];
    expect(() => importBackup(active, current, "replace")).toThrow();
    expect(JSON.stringify(current)).toBe(snapshot);
  });
  it("CSV содержит только выполненные подходы завершённых занятий", () => {
    const state = preparedState();
    const s = createSession(state.templates[0]);
    state.sessions = [s];
    s.items[0].sets[0].done = true;
    expect(csv(state).split("\r\n")).toHaveLength(1);
    s.status = "completed";
    expect(csv(state).split("\r\n")).toHaveLength(2);
  });
});

describe("Дополнительные границы календаря и импорта", () => {
  it("показывает перенесённую назад дату, даже если исходная дата за пределами видимого диапазона", () => {
    const state = preparedState();
    state.rules = [
      {
        id: "r",
        templateId: state.templates[0].id,
        start: "2026-11-02",
        weekdays: [1],
        once: false,
      },
    ];
    state.exceptions = [
      {
        id: "r:2026-11-09",
        ruleId: "r",
        originalDate: "2026-11-09",
        date: "2026-11-03",
        cancelled: false,
      },
    ];
    const events = occurrences(state, "2026-11-03", "2026-11-03");
    expect(events).toHaveLength(1);
    expect(events[0].originalDate).toBe("2026-11-09");
  });
  it("сохраняет отменённое занятие в календаре без статистики", () => {
    const state = preparedState();
    state.rules = [
      {
        id: "r",
        templateId: state.templates[0].id,
        start: "2026-11-02",
        weekdays: [],
        once: true,
      },
    ];
    const s = createSession(state.templates[0], "r:2026-11-02");
    s.status = "cancelled";
    state.sessions.push(s);
    expect(occurrences(state, "2026-11-02", "2026-11-02")[0].status).toBe(
      "cancelled",
    );
    expect(stats(state.sessions).count).toBe(0);
  });
  it("отклоняет невозможную дату и нарушенные ссылки расписания", () => {
    const state = preparedState();
    const bad = structuredClone(state);
    bad.rules = [
      {
        id: "r",
        templateId: bad.templates[0].id,
        start: "2026-02-30",
        weekdays: [],
        once: true,
      },
    ];
    expect(() => importBackup(bad, state, "replace")).toThrow();
    bad.rules[0].start = "2026-02-28";
    bad.rules[0].templateId = "unknown";
    expect(() => importBackup(bad, state, "replace")).toThrow();
  });
});

it("прошлый результат сохраняет номер подхода, сторону и способ учёта", () => {
  const t = seedTemplates()[1];
  const old = createSession(t, undefined, 1000);
  old.status = "completed";
  old.items[2].sets[1].done = true;
  old.items[2].sets[1].weight = 12;
  const current = createSession(t, undefined, 2000);
  const item = current.items[2];
  expect(previousSet([old], item, 0, current)).toBeUndefined();
  expect(previousSet([old], item, 1, current)?.weight).toBe(12);
  expect(previousSet([old], item, 4, current)).toBeUndefined();
  item.accounting = "total";
  expect(previousSet([old], item, 1, current)).toBeUndefined();
});
