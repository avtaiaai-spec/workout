import { State, stateSchema } from "./model";
import { initialState, migrate } from "./catalog";
let dbPromise: Promise<IDBDatabase> | undefined;
export function database() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("moi-trenirovki", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => {
      dbPromise = undefined;
      reject(r.error);
    };
  }));
}
export async function readState(): Promise<State> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction("state").objectStore("state").get("main");
    r.onsuccess = () => {
      try {
        resolve(
          r.result ? migrate(stateSchema.parse(r.result)) : initialState(),
        );
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
  });
}
export async function writeState(state: State) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(state, "main");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Запись прервана"));
  });
}
export function download(
  data: string,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function csv(state: State) {
  const q = (s: unknown) => `"${String(s).replaceAll('"', '""')}"`;
  const rows = [
    [
      "Дата",
      "Занятие",
      "Упражнение",
      "Подход",
      "Сторона",
      "Вес, кг",
      "Учёт веса",
      "Повторения",
      "Секунды",
      "Дистанция, км",
      "Разминка",
      "Комментарий",
      "Время записи",
    ],
  ];
  for (const s of state.sessions.filter((s) => s.status === "completed"))
    for (const i of s.items.filter((i) => !i.skipped))
      i.sets.forEach((set, n) => {
        if (set.done)
          rows.push([
            s.date,
            s.name,
            i.exercise.name,
            String(n + 1),
            set.side,
            String(set.weight),
            i.accounting,
            String(set.reps),
            String(set.seconds),
            String(set.distance),
            set.warmup ? "Да" : "Нет",
            set.note,
            set.recordedAt ? new Date(set.recordedAt).toISOString() : "",
          ]);
      });
  return rows.map((r) => r.map(q).join(";")).join("\r\n");
}
