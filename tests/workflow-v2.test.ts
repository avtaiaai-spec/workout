import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import {
  initialState,
  catalog,
  migrate,
  seedTemplates,
  addPersonalTemplates,
  mandatoryIds,
} from "../src/catalog";
import {
  configureExercise,
  makeItem,
  createSession,
  stats,
  measurementSchema,
  stateSchema,
  importBackup,
  saveWeeklyPlan,
  occurrences,
} from "../src/model";
import { readState, writeState } from "../src/storage";
describe("Новый понятный сценарий и миграция", () => {
  it("первый вход: 17 упражнений, ни одной автоматически созданной тренировки или истории", () => {
    const s = initialState();
    expect(s.version).toBe(2);
    expect(s.exercises).toHaveLength(17);
    expect(s.templates).toEqual([]);
    expect(s.sessions).toEqual([]);
    expect(s.rules).toEqual([]);
    expect(s.measurements).toEqual([]);
    expect(catalog.find((e) => e.id === "machine-hip-thrust")?.name).toContain(
      "рычаговом",
    );
    expect(catalog.find((e) => e.id === "kettlebell-plie")?.equipment).toBe(
      "Гиря",
    );
    expect(catalog.find((e) => e.id === "dumbbell-plie")).toBeUndefined();
  });
  it("одно изменение формы распространяется на план, фактическое занятие остаётся независимым", () => {
    const item = makeItem(catalog.find((e) => e.id === "barbell-rdl")!);
    configureExercise(item, { count: 4, weight: 25.3, reps: 12, rest: 75 });
    expect(item.sets).toHaveLength(4);
    for (const s of item.sets)
      expect([s.weight, s.reps, s.rest, s.done]).toEqual([25.3, 12, 75, false]);
    const t = {
      id: "mine",
      name: "Моя тренировка",
      items: [item],
      note: "",
      archived: false,
    };
    const session = createSession(t);
    session.items[0].sets[0].weight = 22.6;
    session.items[0].sets[0].done = true;
    expect(t.items[0].sets[0].weight).toBe(25.3);
    expect(stats([session]).sets).toBe(0);
  });
  it("изменение одного поля не стирает старые разные подходы и не переименовывает упражнения", () => {
    const item = seedTemplates()[0].items[0];
    item.sets[1].weight = 23.7;
    item.sets[2].reps = 9;
    const ids = item.sets.map((s) => s.id);
    configureExercise(item, { rest: 120 });
    expect(item.sets.map((s) => s.id)).toEqual(ids);
    expect(item.sets[1].weight).toBe(23.7);
    expect(item.sets[2].reps).toBe(9);
    expect(item.sets.every((s) => s.rest === 120)).toBe(true);
  });
  it("новое отведение ноги: три подхода на сторону; изменение числа подходов не умножает повторно объём", () => {
    const item = makeItem(catalog.find((e) => e.id === "cable-kickback")!);
    configureExercise(item, { weight: 9, reps: 10, rest: 60 });
    expect(item.sets).toHaveLength(6);
    expect(item.sets.filter((s) => s.side === "Л")).toHaveLength(3);
    configureExercise(item, { count: 4 });
    expect(item.sets).toHaveLength(8);
    expect(new Set(item.sets.map((s) => s.id)).size).toBe(8);
  });
  it("старые каталог, пользовательские упражнения, тренировки и текущие результаты переживают миграцию v1", () => {
    const old: any = initialState();
    old.version = 1;
    delete old.measurements;
    delete old.retiredExercises;
    delete old.trainingDays;
    old.seeded = ["personal-v1"];
    old.templates = seedTemplates();
    const legacy = {
      ...catalog[5],
      id: "dumbbell-plie",
      name: "Приседания плие с гантелью",
      equipment: "Гантели",
      kind: "plie",
    };
    old.exercises.push(legacy, {
      ...catalog[0],
      id: "custom-mine",
      custom: true,
      name: "Моё упражнение",
    });
    old.templates[2].items[0].exercise = legacy;
    old.templates[0].name = "Моя изменённая";
    old.templates[0].items[0].sets[0].weight = 33.7;
    const active = createSession(old.templates[2]);
    active.items[0].sets[0].done = true;
    old.sessions = [active];
    old.restEnd = 12345678;
    const parsed = migrate(stateSchema.parse(old));
    expect(parsed.exercises).toHaveLength(18);
    expect(
      parsed.retiredExercises.find((e) => e.id === "dumbbell-plie"),
    ).toEqual(legacy);
    expect(parsed.sessions).toEqual(old.sessions);
    expect(parsed.templates).toEqual(old.templates);
    expect(parsed.restEnd).toBe(old.restEnd);
    expect(migrate(parsed)).toEqual(parsed);
    expect(parsed.templates[2].items[0].exercise.id).toBe("dumbbell-plie");
  });
  it("три готовые тренировки добавляются только по запросу и однократно", () => {
    const s = initialState();
    addPersonalTemplates(s);
    s.templates[0].name = "Отредактировано";
    addPersonalTemplates(s);
    expect(s.templates).toHaveLength(3);
    expect(s.templates[0].name).toBe("Отредактировано");
    expect(s.rules).toEqual([]);
  });
  it("сохранение недельного плана меняет только будущие серии и сохраняет разовые даты", () => {
    const s = initialState();
    addPersonalTemplates(s);
    const t = s.templates[0].id;
    s.rules = [
      {
        id: "old",
        templateId: t,
        start: "2026-11-02",
        weekdays: [1],
        once: false,
      },
      {
        id: "once",
        templateId: t,
        start: "2026-11-06",
        weekdays: [],
        once: true,
      },
    ];
    saveWeeklyPlan(s, { 1: [t], 4: [s.templates[1].id], 6: [] }, "2026-11-05");
    expect(s.trainingDays).toEqual([1, 4, 6]);
    expect(s.rules.find((r) => r.id === "old")?.end).toBe("2026-11-04");
    expect(s.rules.find((r) => r.id === "once")?.once).toBe(true);
    const plans = occurrences(s, "2026-11-01", "2026-11-12");
    expect(
      plans.some((o) => o.ruleId === "old" && o.date === "2026-11-02"),
    ).toBe(true);
    expect(
      plans.some((o) => o.ruleId === "once" && o.date === "2026-11-06"),
    ).toBe(true);
    expect(
      plans.some((o) => o.date === "2026-11-09" && o.templateId === t),
    ).toBe(true);
  });
});
describe("Замеры тела и резервные копии", () => {
  const a = {
    id: "a",
    date: "2026-10-01",
    createdAt: 1,
    values: { weight: 70.4, waist: 80.5 },
    note: "Утром",
  };
  it("хранит дробный вес и обхваты, разрешает частичную запись, отклоняет пустую и неверные единицы", () => {
    expect(measurementSchema.parse(a)).toEqual(a);
    expect(
      measurementSchema.parse({ ...a, values: { hips: 99.3 } }).values.hips,
    ).toBe(99.3);
    for (const values of [
      {},
      { weight: 0 },
      { waist: -1 },
      { weight: Infinity },
      { hips: 500 },
    ])
      expect(() => measurementSchema.parse({ ...a, values })).toThrow();
  });
  it("IndexedDB, экспорт и восстановление включают все замеры; повторный импорт не дублирует их", async () => {
    const s = initialState();
    s.measurements = [
      a,
      {
        ...a,
        id: "b",
        date: "2026-10-08",
        createdAt: 2,
        values: { weight: 69.2, hips: 99.6 },
      },
    ];
    await writeState(s);
    expect((await readState()).measurements).toEqual(s.measurements);
    const raw = JSON.parse(JSON.stringify(s));
    expect(importBackup(raw, initialState(), "replace").measurements).toEqual(
      s.measurements,
    );
    expect(importBackup(raw, s, "merge").measurements).toHaveLength(2);
  });
  it("невалидный импорт и дубли ID не меняют существующие замеры", () => {
    const s = initialState();
    s.measurements = [a];
    const bad = structuredClone(s);
    bad.measurements.push(a);
    expect(() => importBackup(bad, s, "replace")).toThrow();
    expect(s.measurements).toEqual([a]);
  });
});

describe("Локальный медиакаталог", () => {
  it("у всех 17 упражнений свой полноценный WebP, без старых SVG и повторяющихся заглушек", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { createHash } = await import("node:crypto");
    const files = readdirSync("public/media/exercises")
      .filter((p) => p.endsWith(".webp"))
      .sort();
    expect(files).toEqual(mandatoryIds.map((id) => id + ".webp").sort());
    const hashes = files.map((file) => {
      const bytes = readFileSync("public/media/exercises/" + file);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      expect(bytes.length).toBeGreaterThan(30000);
      return createHash("sha256").update(bytes).digest("hex");
    });
    expect(new Set(hashes).size).toBe(17);
  });
});
