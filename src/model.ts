import { z } from "zod";
export const categories = [
  "Грудь",
  "Спина",
  "Ноги",
  "Ягодичные",
  "Дельты",
  "Руки — бицепс",
  "Руки — трицепс",
  "Предплечья",
  "Пресс",
  "Функциональные упражнения",
  "Кардио",
  "Растяжка",
];
export const accountingLabels = {
  total: "Общий вес",
  machine: "Вес на тренажёре",
  added: "Добавленный вес (без грифа)",
  single: "Вес одной из двух гантелей (×2)",
  pair: "Общий вес двух гантелей",
  unknown: "Уточнить учёт гантелей",
  body: "Без дополнительного веса",
  assistance: "Вес помощи",
};
export const measureSchema = z.enum(["weight", "reps", "time", "cardio"]);
export const accountingSchema = z.enum([
  "total",
  "machine",
  "added",
  "single",
  "pair",
  "unknown",
  "body",
  "assistance",
]);
export type Accounting = z.infer<typeof accountingSchema>;
export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string(),
  secondary: z.array(z.string()),
  equipment: z.string(),
  measure: measureSchema,
  accounting: accountingSchema,
  kind: z.string(),
  variant: z.string().default(""),
  technique: z.array(z.string()),
  mistakes: z.string(),
  aliases: z.string(),
  custom: z.boolean().optional(),
  image: z
    .string()
    .max(3000000)
    .refine(
      (s) => s === "" || /^data:image\/(png|jpeg|webp);base64,/.test(s),
      "Допустимы только PNG, JPEG или WebP",
    )
    .optional(),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export const setSchema = z.object({
  id: z.string(),
  weight: z.number().finite().min(0).max(10000),
  reps: z.number().int().min(0).max(10000),
  seconds: z.number().int().min(0).max(86400),
  distance: z.number().min(0).max(10000),
  rest: z.number().int().min(0).max(3600),
  warmup: z.boolean(),
  done: z.boolean(),
  side: z.enum(["", "Л", "П"]),
  note: z.string(),
  plannedRepsMax: z.number().int().min(0).max(10000).optional(),
  recordedAt: z.number().finite().min(0).optional(),
});
export type WorkoutSet = z.infer<typeof setSchema>;
export const itemSchema = z.object({
  id: z.string(),
  exercise: exerciseSchema,
  accounting: accountingSchema,
  sets: z.array(setSchema).max(200),
  note: z.string(),
  skipped: z.boolean(),
  remainingSkipped: z.boolean().optional(),
});
export type Item = z.infer<typeof itemSchema>;
export const templateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  note: z.string(),
  items: z.array(itemSchema).max(200),
  archived: z.boolean(),
  draftStep: z.number().int().min(1).max(3).optional(),
  draft: z.boolean().optional(),
});
export type Template = z.infer<typeof templateSchema>;
export const sessionSchema = templateSchema.extend({
  templateId: z.string(),
  startedAt: z.number().finite().min(0),
  endedAt: z.number().finite().min(0).nullable(),
  date: z.string(),
  pausedAt: z.number().finite().min(0).nullable(),
  pausedMs: z.number().finite().min(0),
  status: z.enum(["active", "completed", "cancelled"]),
  occurrenceId: z.string().optional(),
  currentItemId: z.string().optional(),
  currentSetId: z.string().optional(),
  originSessionId: z.string().optional(),
  pinnedTechnique: z.boolean().optional(),
});
export type Session = z.infer<typeof sessionSchema>;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z
  .string()
  .regex(datePattern)
  .refine((s) => {
    const d = new Date(s + "T12:00:00");
    return !Number.isNaN(d.valueOf()) && localDate(d) === s;
  }, "Неверная календарная дата");
export const ruleSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  start: dateSchema,
  end: dateSchema.optional(),
  weekdays: z.array(z.number().int().min(0).max(6)),
  once: z.boolean(),
});
export type Rule = z.infer<typeof ruleSchema>;
export const exceptionSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  originalDate: dateSchema,
  date: dateSchema,
  cancelled: z.boolean(),
});
export const measurementFields = {
  weight: { label: "Вес", unit: "кг", max: 700 },
  chest: { label: "Грудь", unit: "см", max: 400 },
  waist: { label: "Талия", unit: "см", max: 400 },
  hips: { label: "Бёдра", unit: "см", max: 400 },
  neck: { label: "Шея", unit: "см", max: 150 },
  armLeft: { label: "Левый бицепс", unit: "см", max: 150 },
  armRight: { label: "Правый бицепс", unit: "см", max: 150 },
  thighLeft: { label: "Левое бедро", unit: "см", max: 200 },
  thighRight: { label: "Правое бедро", unit: "см", max: 200 },
  calfLeft: { label: "Левая голень", unit: "см", max: 150 },
  calfRight: { label: "Правая голень", unit: "см", max: 150 },
} as const;
export type MeasurementKey = keyof typeof measurementFields;
const bodyValuesSchema = z
  .object(
    Object.fromEntries(
      Object.entries(measurementFields).map(([key, field]) => [
        key,
        z.number().finite().positive().max(field.max).optional(),
      ]),
    ) as Record<MeasurementKey, z.ZodOptional<z.ZodNumber>>,
  )
  .refine(
    (v) => Object.values(v).some((n) => n !== undefined),
    "Добавьте хотя бы один замер",
  );
export const measurementSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  createdAt: z.number().finite().min(0),
  values: bodyValuesSchema,
  note: z.string(),
});
export type Measurement = z.infer<typeof measurementSchema>;
const currentStateSchema = z.object({
  version: z.literal(3),
  measurements: z.array(measurementSchema).default([]),
  trainingDays: z.array(z.number().int().min(0).max(6)).default([]),
  retiredExercises: z.array(exerciseSchema).default([]),
  seeded: z.array(z.string()),
  exercises: z.array(exerciseSchema),
  favorites: z.array(z.string()),
  templates: z.array(templateSchema),
  sessions: z.array(sessionSchema),
  rules: z.array(ruleSchema),
  exceptions: z.array(exceptionSchema),
  restEnd: z.number().finite().min(0).nullable(),
  effort: z
    .object({
      end: z.number().finite().min(0),
      itemId: z.string(),
      setId: z.string(),
    })
    .nullable(),
  settings: z.object({
    theme: z.enum(["light", "dark", "system"]),
    autoRest: z.boolean(),
    sound: z.boolean(),
    defaultRest: z.number().int().min(0).max(3600),
  }),
});
export const stateSchema = z.preprocess((raw) => {
  if (
    raw &&
    typeof raw === "object" &&
    "version" in raw &&
    (raw.version === 1 || raw.version === 2)
  )
    return {
      ...raw,
      version: 3,
      ...(!("measurements" in raw) ? { measurements: [] } : {}),
      ...(!("retiredExercises" in raw) ? { retiredExercises: [] } : {}),
      ...(!("trainingDays" in raw) ? { trainingDays: [] } : {}),
    };
  return raw;
}, currentStateSchema);
export type State = z.infer<typeof currentStateSchema>;
export const uid = () => crypto.randomUUID();
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function asDate(s: string) {
  return new Date(`${s}T12:00:00`);
}
export function shiftDate(s: string, n: number) {
  const d = asDate(s);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function monday(s = localDate()) {
  const d = asDate(s);
  return shiftDate(s, -((d.getDay() + 6) % 7));
}
export const num = (n: number) =>
  n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
export function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
export function elapsed(s: Session, now = Date.now()) {
  return Math.max(
    0,
    (s.endedAt ?? s.pausedAt ?? now) - s.startedAt - s.pausedMs,
  );
}
export function makeSet(rest = 90): WorkoutSet {
  return {
    id: uid(),
    weight: 0,
    reps: 10,
    seconds: 45,
    distance: 0,
    rest,
    warmup: false,
    done: false,
    side: "",
    note: "",
  };
}
export function makeItem(e: Exercise, rest = 90): Item {
  return {
    id: uid(),
    exercise: structuredClone(e),
    accounting: e.accounting,
    sets: (e.id === "cable-kickback" ? ["Л", "П"] : [""]).flatMap((side) =>
      Array.from({ length: 3 }, () => ({
        ...makeSet(rest),
        side: side as WorkoutSet["side"],
      })),
    ),
    note: "",
    skipped: false,
  };
}
export function createSession(
  t: Template,
  occurrenceId?: string,
  now = Date.now(),
  history: Session[] = [],
): Session {
  return {
    ...structuredClone(t),
    id: uid(),
    templateId: t.id,
    draft: false,
    archived: false,
    items: t.items.map((i) => ({
      ...structuredClone(i),
      skipped: false,
      remainingSkipped: false,
      sets: i.sets.map((set, index) => {
        const previous = previousSet(history, i, index);
        return {
          ...set,
          ...(previous
            ? {
                weight: previous.weight,
                reps: previous.reps,
                seconds: previous.seconds,
                distance: previous.distance,
              }
            : {}),
          done: false,
          recordedAt: undefined,
        };
      }),
    })),
    currentItemId: t.items[0]?.id,
    currentSetId: t.items[0]?.sets[0]?.id,
    status: "active",
    startedAt: now,
    endedAt: null,
    date: localDate(new Date(now)),
    pausedAt: null,
    pausedMs: 0,
    occurrenceId,
  };
}
export function completedSets(sessions: Session[]) {
  return sessions
    .filter((s) => s.status === "completed")
    .flatMap((session) =>
      session.items
        .filter((i) => !i.skipped)
        .flatMap((item) =>
          item.sets
            .filter((s) => s.done)
            .map((set) => ({ session, item, set })),
        ),
    );
}
export function externalVolume(item: Item, set: WorkoutSet) {
  if (
    item.exercise.measure !== "weight" ||
    ["unknown", "body", "assistance"].includes(item.accounting)
  )
    return 0;
  return set.weight * set.reps * (item.accounting === "single" ? 2 : 1);
}
export function stats(sessions: Session[]) {
  const done = sessions.filter((s) => s.status === "completed");
  const rows = completedSets(done);
  return {
    count: done.length,
    time: done.reduce((n, s) => n + elapsed(s), 0),
    sets: rows.length,
    reps: rows
      .filter((r) => ["weight", "reps"].includes(r.item.exercise.measure))
      .reduce((n, r) => n + r.set.reps, 0),
    volume:
      Math.round(
        rows.reduce((n, r) => n + externalVolume(r.item, r.set), 0) * 100,
      ) / 100,
  };
}
export type Occurrence = {
  id: string;
  ruleId: string;
  originalDate: string;
  date: string;
  templateId: string;
  status: "planned" | "active" | "completed" | "missed" | "cancelled";
  session?: Session;
};
export function occurrences(
  state: State,
  from: string,
  to: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const rule of state.rules) {
    const ex = state.exceptions.filter((e) => e.ruleId === rule.id);
    let d = rule.start;
    const movedMax = ex
      .filter((e) => e.date >= from && e.date <= to)
      .reduce((n, e) => (e.originalDate > n ? e.originalDate : n), to);
    const limit = rule.once
      ? rule.start
      : rule.end && rule.end < movedMax
        ? rule.end
        : movedMax;
    let guard = 0;
    while (d <= limit && guard++ < 40000) {
      if (rule.once || rule.weekdays.includes(asDate(d).getDay())) {
        const exception = ex.find((e) => e.originalDate === d);
        const date = exception?.date ?? d;
        if (date >= from && date <= to) {
          const id = `${rule.id}:${d}`;
          const session =
            state.sessions.find(
              (s) => s.occurrenceId === id && s.status !== "cancelled",
            ) ??
            state.sessions.find(
              (s) => s.occurrenceId === id && s.status === "cancelled",
            );
          out.push({
            id,
            ruleId: rule.id,
            originalDate: d,
            date,
            templateId: rule.templateId,
            session,
            status:
              session?.status === "completed"
                ? "completed"
                : session?.status === "active"
                  ? "active"
                  : session?.status === "cancelled"
                    ? "cancelled"
                    : exception?.cancelled
                      ? "cancelled"
                      : date < localDate()
                        ? "missed"
                        : "planned",
          });
        }
      }
      d = shiftDate(d, 1);
    }
  }
  // A completed/active fact keeps its original plan link even if that series
  // is later shortened. This also covers a future plan performed early.
  for (const id of new Set(
    state.sessions
      .map((s) => s.occurrenceId)
      .filter((id): id is string => !!id),
  )) {
    if (out.some((o) => o.id === id)) continue;
    const split = id.lastIndexOf(":");
    const originalDate = id.slice(split + 1);
    if (split < 0 || !datePattern.test(originalDate)) continue;
    const session =
      state.sessions.find(
        (s) => s.occurrenceId === id && s.status !== "cancelled",
      ) ?? state.sessions.find((s) => s.occurrenceId === id)!;
    const exception = state.exceptions.find((e) => e.id === id);
    const date = exception?.date ?? originalDate;
    if (date < from || date > to) continue;
    out.push({
      id,
      ruleId: id.slice(0, split),
      originalDate,
      date,
      templateId: session.templateId,
      session,
      status: session.status,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
export function importBackup(
  raw: unknown,
  current: State,
  mode: "merge" | "replace",
): State {
  const parsed = stateSchema.parse(raw);
  for (const session of parsed.sessions) {
    dateSchema.parse(session.date);
    if (
      session.startedAt < 0 ||
      session.pausedMs < 0 ||
      (session.endedAt !== null && session.endedAt < session.startedAt)
    )
      throw Error("Некорректное время занятия");
  }
  for (const rule of parsed.rules) {
    if (!parsed.templates.some((t) => t.id === rule.templateId))
      throw Error("Расписание ссылается на неизвестный шаблон");
  }
  for (const ex of parsed.exceptions) {
    if (!parsed.rules.some((r) => r.id === ex.ruleId))
      throw Error("Исключение ссылается на неизвестную серию");
  }
  const unique = (a: { id: string }[]) =>
    new Set(a.map((x) => x.id)).size === a.length;
  if (
    ![
      parsed.exercises,
      parsed.templates,
      parsed.sessions,
      parsed.rules,
      parsed.exceptions,
      parsed.measurements,
      parsed.retiredExercises,
    ].every(unique)
  )
    throw Error("В файле повторяются идентификаторы");
  if (parsed.sessions.filter((s) => s.status === "active").length > 1)
    throw Error("В файле больше одного активного занятия");
  for (const t of [...parsed.templates, ...parsed.sessions]) {
    if (!unique(t.items) || t.items.some((i) => !unique(i.sets)))
      throw Error("Повторяются идентификаторы упражнений или подходов");
  }
  if (mode === "replace") return parsed;
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [
    ...a,
    ...b.filter((x) => !a.some((y) => y.id === x.id)),
  ];
  const result: State = {
    ...current,
    seeded: [...new Set([...current.seeded, ...parsed.seeded])],
    exercises: merge(current.exercises, parsed.exercises),
    favorites: [...new Set([...current.favorites, ...parsed.favorites])],
    templates: merge(current.templates, parsed.templates),
    sessions: merge(current.sessions, parsed.sessions),
    rules: merge(current.rules, parsed.rules),
    exceptions: merge(current.exceptions, parsed.exceptions),
    measurements: merge(current.measurements, parsed.measurements),
    retiredExercises: merge(current.retiredExercises, parsed.retiredExercises),
    trainingDays: [
      ...new Set([...current.trainingDays, ...parsed.trainingDays]),
    ],
  };
  if (result.sessions.filter((s) => s.status === "active").length > 1)
    throw Error(
      "Сначала завершите активное занятие: объединение создаст два активных занятия",
    );
  return result;
}

/** Preserve the ordinal of uncompleted sets instead of shifting later results forward. */
export function previousSet(
  history: Session[],
  item: Item,
  index: number,
  current?: Session,
): WorkoutSet | undefined {
  const matching = (i: Item) =>
    !i.skipped &&
    i.exercise.id === item.exercise.id &&
    i.accounting === item.accounting;
  const session = history
    .filter(
      (s) =>
        s.status === "completed" &&
        s.id !== current?.id &&
        (!current || s.startedAt < current.startedAt),
    )
    .sort((a, b) => b.startedAt - a.startedAt)
    .find((s) =>
      s.items.some((i) => matching(i) && i.sets.some((s) => s.done)),
    );
  const prior = session?.items.find(matching);
  const set = item.sets[index];
  if (!set || !prior) return;
  const ordinal = item.sets
    .slice(0, index)
    .filter((s) => s.side === set.side).length;
  const candidate = prior.sets.filter((s) => s.side === set.side)[ordinal];
  return candidate?.done && candidate.warmup === set.warmup
    ? candidate
    : undefined;
}

/** Template-only settings: one form per exercise, expanded into independent actual sets at start. */
export function configureExercise(
  item: Item,
  values: {
    count?: number;
    weight?: number;
    reps?: number;
    seconds?: number;
    distance?: number;
    rest?: number;
    plannedRepsMax?: number;
  },
) {
  const unilateral = item.exercise.id === "cable-kickback";
  const count =
    values.count ??
    (unilateral
      ? item.sets.filter((s) => s.side === "Л").length ||
        item.sets.filter((s) => s.side === "П").length ||
        item.sets.length ||
        3
      : item.sets.length || 3);
  const base = item.sets[0] ?? makeSet();
  const sides: WorkoutSet["side"][] = unilateral ? ["Л", "П"] : [""];
  const existing = item.sets;
  item.sets = sides.flatMap((side) =>
    Array.from({ length: Math.max(1, Math.min(50, count)) }, (_, n) => {
      const old = existing.filter((s) => s.side === side)[n];
      return {
        ...base,
        ...old,
        ...(values.weight !== undefined ? { weight: values.weight } : {}),
        ...(values.reps !== undefined
          ? { reps: values.reps, plannedRepsMax: values.plannedRepsMax }
          : {}),
        ...(values.plannedRepsMax !== undefined
          ? { plannedRepsMax: values.plannedRepsMax }
          : {}),
        ...(values.seconds !== undefined ? { seconds: values.seconds } : {}),
        ...(values.rest !== undefined ? { rest: values.rest } : {}),
        ...(values.distance !== undefined ? { distance: values.distance } : {}),
        id: old?.id ?? uid(),
        side,
        done: false,
      };
    }),
  );
}
export function saveWeeklyPlan(
  state: State,
  assignments: Record<number, string[]>,
  start = localDate(),
) {
  const days = Object.keys(assignments)
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
  for (const r of state.rules)
    if (!r.once && (!r.end || r.end >= start)) r.end = shiftDate(start, -1);
  const grouped = new Map<string, number[]>();
  for (const day of days)
    for (const templateId of new Set(assignments[day])) {
      if (!state.templates.some((t) => t.id === templateId && !t.archived))
        continue;
      grouped.set(templateId, [...(grouped.get(templateId) ?? []), day]);
    }
  for (const [templateId, weekdays] of grouped)
    state.rules.push({ id: uid(), templateId, start, weekdays, once: false });
  state.trainingDays = days;
}

/** Start a factual session without creating a template or schedule. */
export function createUnplannedSession(now = Date.now()): Session {
  const source: Template = {
    id: "",
    name: "Тренировка без плана",
    note: "",
    items: [],
    archived: false,
  };
  return createSession(source, undefined, now);
}
export function repeatSession(source: Session, now = Date.now()): Session {
  const next = createSession(source, undefined, now);
  next.templateId = source.templateId;
  next.originSessionId = source.id;
  return next;
}
export function templateFromSession(
  source: Session,
  name = source.name,
): Template {
  return {
    id: uid(),
    name,
    note: source.note,
    archived: false,
    items: source.items
      .filter((i) => !i.skipped)
      .map((i) => ({
        ...structuredClone(i),
        id: uid(),
        skipped: false,
        remainingSkipped: false,
        sets: i.sets.map((s) => ({
          ...s,
          id: uid(),
          done: false,
          recordedAt: undefined,
        })),
      })),
  };
}
/** Main button and row checkbox share this idempotent write. */
export function markSet(
  session: Session,
  itemId: string,
  setId: string,
  done: boolean,
  now = Date.now(),
) {
  const item = session.items.find((i) => i.id === itemId);
  const set = item?.sets.find((s) => s.id === setId);
  if (!set || !item || item.skipped || session.pausedAt || set.done === done)
    return false;
  set.done = done;
  if (done && item.remainingSkipped) item.remainingSkipped = false;
  set.recordedAt = done ? now : undefined;
  return true;
}
/** Keep every recorded set when replacing work that has not been done yet. */
export function replaceRemainingWork(
  session: Template,
  itemId: string,
  replacements: Item[],
) {
  const index = session.items.findIndex((i) => i.id === itemId);
  if (index < 0) return;
  const old = session.items[index];
  const done = old.sets.filter((s) => s.done);
  const pending = old.sets.filter((s) => !s.done);
  if (done.length && !pending.length) return;
  if (done.length && replacements.length === 1) {
    const next = replacements[0];
    if (next.exercise.id !== "cable-kickback")
      next.sets = pending.map((s, n) => ({
        ...(next.sets[n] ?? next.sets[0] ?? makeSet(s.rest)),
        id: uid(),
        rest: s.rest,
        done: false,
        recordedAt: undefined,
      }));
  }
  session.items.splice(
    index,
    1,
    ...(done.length ? [{ ...old, skipped: false, sets: done }] : []),
    ...replacements,
  );
}
