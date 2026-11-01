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
});
export type WorkoutSet = z.infer<typeof setSchema>;
export const itemSchema = z.object({
  id: z.string(),
  exercise: exerciseSchema,
  accounting: accountingSchema,
  sets: z.array(setSchema).max(200),
  note: z.string(),
  skipped: z.boolean(),
});
export type Item = z.infer<typeof itemSchema>;
export const templateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  note: z.string(),
  items: z.array(itemSchema).max(200),
  archived: z.boolean(),
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
export const stateSchema = z.object({
  version: z.literal(1),
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
export type State = z.infer<typeof stateSchema>;
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
    sets: Array.from({ length: 3 }, () => makeSet(rest)),
    note: "",
    skipped: false,
  };
}
export function createSession(
  t: Template,
  occurrenceId?: string,
  now = Date.now(),
): Session {
  return {
    ...structuredClone(t),
    id: uid(),
    templateId: t.id,
    items: t.items.map((i) => ({
      ...i,
      skipped: false,
      sets: i.sets.map((s) => ({ ...s, done: false })),
    })),
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
  return candidate?.done ? candidate : undefined;
}
