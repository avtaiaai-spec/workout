import { describe, it, expect } from "vitest";
import { initialState, seedTemplates } from "../src/catalog";
import {
  createSession,
  recordPlannedSet,
  stats,
  stateSchema,
  makeSet,
} from "../src/model";
describe("Кнопка + записывает заданный пользователем подход", () => {
  it("прошлая история и исправление факта не меняют установленный вес следующего подхода", () => {
    const template = seedTemplates()[0],
      session = createSession(template);
    const item = session.items[0];
    const [first, second] = item.sets;
    expect(recordPlannedSet(session, item.id, first.id, 1000)).toMatchObject({
      weight: 20,
      reps: 10,
      done: true,
      recordedAt: 1000,
    });
    first.weight = 35;
    first.reps = 6;
    expect(recordPlannedSet(session, item.id, second.id, 2000)).toMatchObject({
      weight: 20,
      reps: 10,
      done: true,
      recordedAt: 2000,
    });
    expect(item.plannedSets?.[0].weight).toBe(20);
    expect(template.items[0].sets[0].done).toBe(false);
  });
  it("повторное подтверждение того же подхода не меняет время и не создаёт дубль", () => {
    const session = createSession(seedTemplates()[0]),
      item = session.items[0],
      set = item.sets[0];
    recordPlannedSet(session, item.id, set.id, 1000);
    expect(recordPlannedSet(session, item.id, set.id, 2000)).toBeUndefined();
    expect(item.sets).toHaveLength(4);
    expect(set.recordedAt).toBe(1000);
    expect(item.sets.filter((s) => s.done)).toHaveLength(1);
  });
  it("дополнительный подход берёт исходный план, даже если последний факт был исправлен", () => {
    const session = createSession(seedTemplates()[0]),
      item = session.items[0];
    for (const set of item.sets)
      recordPlannedSet(session, item.id, set.id, 1000);
    item.sets.at(-1)!.weight = 50;
    const extra = { ...makeSet(), reps: 1, weight: 0 };
    item.sets.push(extra);
    recordPlannedSet(session, item.id, extra.id, 2000);
    expect(extra).toMatchObject({ weight: 20, reps: 10, done: true });
    expect(item.plannedSets).toHaveLength(4);
  });
  it("каждая нога записывается отдельно без повторного удвоения объёма", () => {
    const session = createSession(seedTemplates()[1]),
      item = session.items.find((i) => i.exercise.id === "cable-kickback")!;
    for (const set of item.sets)
      recordPlannedSet(session, item.id, set.id, 1000);
    session.status = "completed";
    session.endedAt = session.startedAt + 1000;
    expect(item.sets.filter((s) => s.done && s.side === "Л")).toHaveLength(3);
    expect(item.sets.filter((s) => s.done && s.side === "П")).toHaveLength(3);
    expect(stats([session])).toMatchObject({ sets: 6, volume: 540 });
  });
  it("планка записывает секунды, а план и таймеры упражнения переживают копирование", () => {
    const session = createSession(seedTemplates()[0]),
      item = session.items.find((i) => i.exercise.id === "forearm-plank")!;
    recordPlannedSet(session, item.id, item.sets[0].id, 1000);
    item.restEnd = Date.now() + 90000;
    const state = initialState();
    state.sessions = [session];
    state.restEnd = item.restEnd;
    state.restItemId = item.id;
    const restored = stateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(
      restored.sessions[0].items.find((i) => i.id === item.id)?.sets[0],
    ).toMatchObject({ seconds: 45, reps: 0, weight: 0, done: true });
    expect(
      restored.sessions[0].items.find((i) => i.id === item.id)?.restEnd,
    ).toBe(item.restEnd);
    expect(restored.restItemId).toBe(item.id);
  });
  it("нулевая длительность не подтверждает планку как выполненную", () => {
    const session = createSession(seedTemplates()[0]),
      item = session.items.find((i) => i.exercise.id === "forearm-plank")!;
    item.plannedSets![0].seconds = 0;
    const set = item.sets[0];
    expect(recordPlannedSet(session, item.id, set.id, 1000)).toBeUndefined();
    expect(set.done).toBe(false);
    expect(set.recordedAt).toBeUndefined();
  });
  it("старое активное занятие принимается без новых полей; записанные факты сохраняются", () => {
    const session = createSession(seedTemplates()[0]),
      item = session.items[0];
    delete item.plannedSets;
    item.sets[0].done = true;
    item.sets[0].weight = 22.6;
    recordPlannedSet(session, item.id, item.sets[1].id, 1000);
    expect(item.sets[0].weight).toBe(22.6);
    expect(item.sets[1].weight).toBe(20);
    expect(item.plannedSets).toHaveLength(4);
  });
});
