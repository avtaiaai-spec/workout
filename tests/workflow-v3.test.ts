import { describe, it, expect } from "vitest";
import { initialState, seedTemplates, migrate } from "../src/catalog";
import {
  createSession,
  createUnplannedSession,
  repeatSession,
  templateFromSession,
  markSet,
  replaceRemainingWork,
  makeItem,
  stats,
  stateSchema,
  importBackup,
  localDate,
  occurrences,
  previousSet,
  configureExercise,
  elapsed,
  saveWeeklyPlan,
} from "../src/model";
describe("Три сущности и безопасная запись занятия", () => {
  it("миграция v2 в v3 сохраняет все старые записи и настройки без повторного добавления шаблонов", () => {
    const old = initialState();
    old.templates = seedTemplates();
    old.templates[0].name = "Моя правка";
    old.templates[0].items[0].sets[0].weight = 23.7;
    old.settings.theme = "dark";
    old.sessions = [createSession(old.templates[0])];
    old.sessions[0].items[0].sets[0].done = true;
    old.restEnd = Date.now() + 45000;
    const raw = { ...JSON.parse(JSON.stringify(old)), version: 2 };
    const migrated = migrate(stateSchema.parse(raw));
    expect(migrated.version).toBe(3);
    for (const key of [
      "templates",
      "sessions",
      "rules",
      "exceptions",
      "measurements",
      "settings",
      "restEnd",
    ] as const)
      expect(migrated[key]).toEqual(raw[key]);
    expect(migrate(migrated).templates).toEqual(migrated.templates);
    expect(migrated.exercises).toHaveLength(17);
  });
  it("история предзаполняет фактические поля без выполнения и не меняет исходный шаблон", () => {
    const t = seedTemplates()[0];
    const history = createSession(t, undefined, 1000);
    history.status = "completed";
    history.endedAt = 2000;
    const set = history.items[0].sets[0];
    set.done = true;
    set.weight = 22.6;
    set.reps = 9;
    const next = createSession(t, undefined, 3000, [history]);
    expect(next.items[0].sets[0]).toMatchObject({
      weight: 22.6,
      reps: 9,
      done: false,
    });
    expect(t.items[0].sets[0].weight).toBe(20);
    expect(stats([next]).sets).toBe(0);
    history.items[0].accounting = "machine";
    expect(
      createSession(t, undefined, 4000, [history]).items[0].sets[0].weight,
    ).toBe(20);
  });
  it("план другого дня связан с фактом сегодняшнего дня и не удваивается после завершения", () => {
    const state = initialState();
    state.templates = seedTemplates();
    state.rules = [
      {
        id: "future",
        templateId: state.templates[0].id,
        start: "2030-01-10",
        weekdays: [],
        once: true,
      },
    ];
    const s = createSession(state.templates[0], "future:2030-01-10");
    expect(s.date).toBe(localDate());
    s.status = "completed";
    s.endedAt = s.startedAt + 10000;
    state.sessions = [s];
    expect(occurrences(state, "2030-01-10", "2030-01-10")).toHaveLength(1);
    expect(occurrences(state, "2030-01-10", "2030-01-10")[0]).toMatchObject({
      status: "completed",
      session: s,
    });
    expect(stats(state.sessions).count).toBe(1);
  });
  it("изменение будущей серии сохраняет ссылку уже выполненного заранее назначения", () => {
    const state = initialState();
    state.templates = seedTemplates();
    const future = "2030-01-10";
    state.rules = [
      {
        id: "old-series",
        templateId: state.templates[0].id,
        start: future,
        weekdays: [new Date(future + "T12:00:00").getDay()],
        once: false,
      },
    ];
    const fact = createSession(state.templates[0], `old-series:${future}`);
    fact.status = "completed";
    fact.endedAt = fact.startedAt + 30000;
    state.sessions = [fact];
    saveWeeklyPlan(
      state,
      { [new Date(future + "T12:00:00").getDay()]: [state.templates[1].id] },
      future,
    );
    const plans = occurrences(state, future, future);
    expect(plans.find((o) => o.id === `old-series:${future}`)).toMatchObject({
      status: "completed",
      session: fact,
    });
    expect(state.sessions).toHaveLength(1);
  });
  it("подход записывается один раз с временем; отмена отметки и повторная запись не создают строк", () => {
    const session = createSession(seedTemplates()[0]);
    const i = session.items[0],
      s = i.sets[0];
    const count = i.sets.length;
    expect(markSet(session, i.id, s.id, true, 1234)).toBe(true);
    expect(markSet(session, i.id, s.id, true, 5678)).toBe(false);
    expect(s.recordedAt).toBe(1234);
    expect(i.sets).toHaveLength(count);
    markSet(session, i.id, s.id, false, 6789);
    expect(s.recordedAt).toBeUndefined();
    markSet(session, i.id, s.id, true, 7890);
    expect(s.recordedAt).toBe(7890);
  });
  it("замена после частичного выполнения сохраняет все фактические значения и время старого упражнения", () => {
    const state = initialState(),
      session = createSession(seedTemplates()[0]);
    const old = session.items[0];
    markSet(session, old.id, old.sets[0].id, true, 1234);
    old.sets[0].weight = 21.4;
    old.sets[0].reps = 8;
    const recorded = structuredClone(old.sets[0]);
    const originalTemplate = seedTemplates()[0];
    const replacement = makeItem(
      state.exercises.find((e) => e.id === "machine-chest")!,
    );
    replaceRemainingWork(session, old.id, [replacement]);
    expect(session.items[0].exercise.id).toBe("smith-bench");
    expect(session.items[0].sets).toEqual([recorded]);
    expect(session.items[1].exercise.id).toBe("machine-chest");
    expect(session.items[1].sets).toHaveLength(3);
    expect(session.items[1].sets.every((s) => !s.done)).toBe(true);
    session.status = "completed";
    session.endedAt = session.startedAt + 60000;
    expect(stats([session])).toMatchObject({ sets: 1, volume: 171.2 });
    expect(originalTemplate.items[0].sets).toHaveLength(4);
  });
  it("без плана создаётся отдельный факт; сохранение состава как шаблона не изменяет историю", () => {
    const state = initialState(),
      s = createUnplannedSession();
    expect(s.templateId).toBe("");
    expect(s.items).toEqual([]);
    expect(state.templates).toEqual([]);
    s.items = [makeItem(state.exercises[0])];
    markSet(s, s.items[0].id, s.items[0].sets[0].id, true, 1234);
    s.status = "completed";
    s.endedAt = s.startedAt + 20000;
    const template = templateFromSession(s, "Мой новый план");
    expect(template.id).not.toBe(s.id);
    expect(template.items[0].sets[0].done).toBe(false);
    expect(template.items[0].sets[0].recordedAt).toBeUndefined();
    template.items[0].sets[0].weight = 100;
    expect(s.items[0].sets[0].weight).toBe(0);
  });
  it("повторение переносит состав и значения, сбрасывая все старые даты, выполнение и таймер паузы", () => {
    const old = createSession(seedTemplates()[2], "old-plan:2026-01-01", 1000);
    old.status = "completed";
    old.endedAt = 2000;
    old.pausedMs = 100;
    old.items[0].sets[0].done = true;
    old.items[0].sets[0].recordedAt = 1500;
    old.items[0].sets[0].weight = 25;
    const next = repeatSession(old, 9000);
    expect(next).toMatchObject({
      status: "active",
      startedAt: 9000,
      endedAt: null,
      pausedAt: null,
      pausedMs: 0,
      occurrenceId: undefined,
      originSessionId: old.id,
    });
    expect(next.items[0].sets[0]).toMatchObject({
      weight: 25,
      done: false,
      recordedAt: undefined,
    });
    expect(next.id).not.toBe(old.id);
    expect(elapsed(next, 10000)).toBe(1000);
  });
  it("плановый диапазон не становится диапазоном фактических повторений", () => {
    const t = seedTemplates()[0];
    configureExercise(t.items[0], { reps: 10, plannedRepsMax: 12 });
    const s = createSession(t);
    s.items[0].sets[0].reps = 11;
    markSet(s, s.items[0].id, s.items[0].sets[0].id, true, 1234);
    s.status = "completed";
    s.endedAt = s.startedAt + 1000;
    expect(t.items[0].sets[0]).toMatchObject({ reps: 10, plannedRepsMax: 12 });
    expect(stats([s]).reps).toBe(11);
    expect(
      stateSchema.parse({ ...initialState(), templates: [t], sessions: [s] })
        .version,
    ).toBe(3);
  });
  it("отмена и активное занятие не увеличивают статистику; пропущенная оставшаяся часть не скрывает выполненную", () => {
    const s = createSession(seedTemplates()[0]);
    s.items[0].sets[0].done = true;
    s.items[0].remainingSkipped = true;
    expect(stats([s]).sets).toBe(0);
    s.status = "cancelled";
    expect(stats([s]).sets).toBe(0);
    s.status = "completed";
    s.endedAt = s.startedAt + 1000;
    expect(stats([s]).sets).toBe(1);
  });
  it("экспорт и повторный импорт сохраняют черновик, текущий выбор, время записи, замеры и историю", () => {
    const state = initialState();
    state.templates = seedTemplates();
    state.templates[0].draft = true;
    state.templates[0].draftStep = 3;
    const s = createSession(state.templates[0]);
    s.currentItemId = s.items[1].id;
    s.currentSetId = s.items[1].sets[1].id;
    s.pinnedTechnique = true;
    markSet(s, s.items[0].id, s.items[0].sets[0].id, true, 1234);
    state.sessions = [s];
    const merged = importBackup(
      JSON.parse(JSON.stringify(state)),
      state,
      "merge",
    );
    expect(merged.templates).toHaveLength(3);
    expect(merged.sessions).toHaveLength(1);
    expect(merged.sessions[0]).toEqual(state.sessions[0]);
  });
});
