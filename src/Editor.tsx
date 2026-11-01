import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Check,
  ChevronUp,
  ChevronDown,
  Trash2,
  RefreshCw,
  GripVertical,
  Info,
  Copy,
  Timer,
  SkipForward,
  Trophy,
  Save,
} from "lucide-react";
import { useStore } from "./store";
import {
  Item,
  Exercise,
  Session,
  Template,
  WorkoutSet,
  accountingLabels,
  Accounting,
  clock,
  completedSets,
  elapsed,
  makeSet,
  stats,
  num,
  previousSet,
} from "./model";
import { Illustration } from "./Illustration";
import { Modal, NumberInput, Empty } from "./ui";
import { newRecords } from "./Progress";
export function WorkoutEditor({
  id,
  session,
  onBack,
  onAdd,
  onInfo,
  onStart,
}: {
  id: string;
  session: boolean;
  onBack: () => void;
  onAdd: (replaceItem?: string) => void;
  onInfo: (e: Exercise) => void;
  onStart: (id: string) => void;
}) {
  const { state, change, toast, saving, error } = useStore();
  const data = (session ? state.sessions : state.templates).find(
    (t) => t.id === id,
  );
  const [now, setNow] = useState(Date.now());
  const [finish, setFinish] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [summary, setSummary] = useState(false);
  const [drag, setDrag] = useState("");
  const [focused, setFocused] = useState<{
    itemId: string;
    setId: string;
  } | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  if (!data)
    return (
      <Empty title="Тренировка не найдена">
        <button onClick={onBack}>Назад</button>
      </Empty>
    );
  const s = session ? (data as Session) : undefined;
  const active = s?.status === "active";
  const history = s?.status === "completed";
  const total = data.items
    .filter((i) => !i.skipped)
    .reduce((n, i) => n + i.sets.length, 0);
  const done = data.items
    .filter((i) => !i.skipped)
    .reduce((n, i) => n + i.sets.filter((s) => s.done).length, 0);
  const summaryStats = s ? stats([{ ...s, status: "completed" }]) : null;
  const pending = data.items
    .filter((i) => !i.skipped)
    .flatMap((item) =>
      item.sets.filter((set) => !set.done).map((set) => ({ item, set })),
    );
  const currentSet =
    pending.find(
      (p) => p.item.id === focused?.itemId && p.set.id === focused.setId,
    ) ?? pending[0];
  function record(itemId: string, setId: string) {
    const item = data!.items.find((i) => i.id === itemId);
    const set = item?.sets.find((s) => s.id === setId);
    if (!item || !set || item.skipped || s?.pausedAt) return;
    if (
      !set.done &&
      ["time", "cardio"].includes(item.exercise.measure) &&
      set.seconds <= 0
    ) {
      toast("Укажите длительность подхода");
      return;
    }
    change((st) => {
      const a = st.sessions.find((a) => a.id === id);
      const it = a?.items.find((i) => i.id === itemId);
      const target = it?.sets.find((s) => s.id === setId);
      if (!a || !target) return;
      target.done = !target.done;
      if (
        a.status === "active" &&
        target.done &&
        st.settings.autoRest &&
        target.rest > 0
      )
        st.restEnd = Date.now() + target.rest * 1000;
      if (st.effort?.setId === target.id) st.effort = null;
    });
    setFocused(null);
    if (active)
      requestAnimationFrame(() =>
        document.querySelector(".current-set")?.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        }),
      );
  }

  function update(fn: (t: Template) => void) {
    change((st) => {
      const t = (session ? st.sessions : st.templates).find((t) => t.id === id);
      if (t) fn(t);
    });
  }
  function itemChange(itemId: string, fn: (i: Item) => void) {
    update((t) => {
      const item = t.items.find((i) => i.id === itemId);
      if (item) fn(item);
    });
  }
  function move(itemId: string, n: number) {
    update((t) => {
      const i = t.items.findIndex((x) => x.id === itemId);
      const j = i + n;
      if (j >= 0 && j < t.items.length)
        [t.items[i], t.items[j]] = [t.items[j], t.items[i]];
    });
  }
  function end() {
    change((st) => {
      const a = st.sessions.find((x) => x.id === id);
      if (!a || a.status !== "active") return;
      a.status = "completed";
      a.endedAt = Date.now();
      if (a.pausedAt) {
        a.pausedMs += a.endedAt - a.pausedAt;
        a.pausedAt = null;
      }
      st.restEnd = null;
      st.effort = null;
    });
    setFinish(false);
    setSummary(true);
  }
  return (
    <div className={`workout-editor ${active ? "active-session" : ""}`}>
      <button
        className="back-button"
        aria-label={session ? "К обзору" : "Все тренировки"}
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        <span className="back-label">
          {session ? "К обзору" : "Все тренировки"}
        </span>
      </button>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {active
              ? "ВАШЕ ВРЕМЯ ДЛЯ СЕБЯ"
              : history
                ? "ИСТОРИЯ ЗАНЯТИЯ"
                : "КОНСТРУКТОР ТРЕНИРОВКИ"}
          </span>
          {!session ? (
            <input
              className="title-input"
              aria-label="Название тренировки"
              defaultValue={data.name}
              maxLength={150}
              onChange={(e) => {
                if (e.target.value.trim())
                  update((t) => {
                    t.name = e.target.value;
                  });
              }}
              onBlur={(e) => {
                if (!e.target.value.trim()) e.target.value = data.name;
              }}
            />
          ) : (
            <h1>{data.name}</h1>
          )}
          <p>
            {history
              ? `${s?.date} · Результаты можно исправить. Статистика пересчитается.`
              : session
                ? "Изменения этого занятия не меняют шаблон."
                : "Изменения сохраняются автоматически. Это план, а не выполненное занятие."}
          </p>
        </div>
        {!session && (
          <div className="editor-primary-actions">
            <button
              className="button secondary"
              disabled={!data.items.length}
              onClick={() => onStart(id)}
            >
              <Play size={18} />
              Начать
            </button>
            <button
              className="button primary"
              disabled={saving || !!error}
              onClick={() => {
                toast("Тренировка сохранена на устройстве");
                onBack();
              }}
            >
              <Save size={19} />
              Сохранить тренировку
            </button>
          </div>
        )}
      </div>
      {active && (
        <section className="session-strip">
          <span className="session-clock">
            {clock(elapsed(s!, now))}
            <small>{s?.pausedAt ? "На паузе" : "Общее время"}</small>
          </span>
          <span>
            <b>
              {done} <em>/ {total}</em>
            </b>
            <small>Подходов</small>
          </span>
          <div>
            <button
              className="button secondary"
              onClick={() =>
                change((st) => {
                  const a = st.sessions.find((x) => x.id === id)!;
                  if (a.pausedAt) {
                    a.pausedMs += Date.now() - a.pausedAt;
                    a.pausedAt = null;
                  } else a.pausedAt = Date.now();
                })
              }
            >
              {s?.pausedAt ? <Play size={17} /> : <Pause size={17} />}
              <span>{s?.pausedAt ? "Продолжить" : "Пауза"}</span>
            </button>
            <button className="button primary" onClick={() => setFinish(true)}>
              <Check size={18} />
              Завершить
            </button>
          </div>
        </section>
      )}
      {history && summaryStats && (
        <div className="inline-stats">
          {summaryStats.sets} подходов · {summaryStats.reps} повторений ·{" "}
          {num(summaryStats.volume)} кг·повт. · {clock(elapsed(s!))}
        </div>
      )}
      {!active && (
        <details className="workout-note" open={!active}>
          <summary>Заметка к тренировке</summary>
          <label className="note-label">
            Заметка
            <textarea
              placeholder="Фокус на технике, любимая музыка или что угодно…"
              value={data.note}
              rows={2}
              onChange={(e) =>
                update((t) => {
                  t.note = e.target.value;
                })
              }
            />
          </label>
        </details>
      )}
      {!data.items.length && (
        <Empty title="С чего начнём?" icon={<Plus />}>
          <p>Выберите упражнения из каталога и настройте подходы.</p>
        </Empty>
      )}
      <div className="workout-items">
        {data.items.map((item, index) => {
          return (
            <article
              key={item.id}
              className={`workout-item ${item.skipped ? "skipped" : ""} ${active && currentSet?.item.id === item.id ? "current-exercise" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag && drag !== item.id)
                  update((t) => {
                    const from = t.items.findIndex((i) => i.id === drag);
                    const to = t.items.findIndex((i) => i.id === item.id);
                    const [m] = t.items.splice(from, 1);
                    t.items.splice(to, 0, m);
                  });
                setDrag("");
              }}
            >
              <header className="item-heading">
                <span
                  className="drag-handle"
                  draggable
                  onDragStart={() => setDrag(item.id)}
                  aria-label="Перетащить упражнение"
                >
                  <GripVertical size={18} />
                </span>
                <button
                  className="thumb-button"
                  onClick={() => onInfo(item.exercise)}
                  aria-label={`Техника: ${item.exercise.name}`}
                >
                  <Illustration exercise={item.exercise} small />
                </button>
                <div>
                  <small>
                    УПРАЖНЕНИЕ {String(index + 1).padStart(2, "0")} ·{" "}
                    {item.exercise.category}
                  </small>
                  <h3>{item.exercise.name}</h3>
                  <button
                    className="text-link text-button"
                    onClick={() => onInfo(item.exercise)}
                  >
                    <Info size={14} />
                    Техника
                  </button>
                </div>
                <div className="order-controls">
                  <button
                    className="icon-button"
                    disabled={index === 0}
                    aria-label="Выше"
                    onClick={() => move(item.id, -1)}
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={index === data.items.length - 1}
                    aria-label="Ниже"
                    onClick={() => move(item.id, 1)}
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
              </header>
              <div className="item-body">
                {item.exercise.measure === "weight" && (
                  <details className="accounting-details" open={!active}>
                    <summary>
                      Учёт веса · {accountingLabels[item.accounting]}
                    </summary>
                    <label
                      className={
                        item.accounting === "unknown"
                          ? "accounting unresolved"
                          : "accounting"
                      }
                    >
                      Учёт веса
                      <select
                        aria-label={`Учёт веса: ${item.exercise.name}`}
                        value={item.accounting}
                        onChange={(e) =>
                          itemChange(item.id, (i) => {
                            i.accounting = e.target.value as Accounting;
                          })
                        }
                      >
                        {Object.entries(accountingLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      {item.exercise.id === "smith-bench" && (
                        <small>
                          20 кг в исходном шаблоне — добавленный вес без учёта
                          грифа.
                        </small>
                      )}
                      {item.accounting === "unknown" && (
                        <small>
                          Исходное число сохранено. Уточните: вес одной гантели
                          или двух вместе. До уточнения объём не рассчитывается.
                        </small>
                      )}
                      {item.accounting === "single" && (
                        <small>
                          Вес одной из двух гантелей; для объёма учитывается ×2.
                          Для одной гантели выберите «Общий вес».
                        </small>
                      )}
                      {item.accounting === "assistance" && (
                        <small>
                          Помощь не включается в объём поднятого веса.
                        </small>
                      )}
                    </label>
                  </details>
                )}
                {item.exercise.id === "cable-kickback" && (
                  <div className="subtle-note">
                    Каждая нога отмечается отдельно: 3 подхода на левую и 3 на
                    правую. Объём считается один раз по каждой отметке.
                  </div>
                )}
                <div className="set-table">
                  <div
                    className={`set-row set-head ${item.exercise.measure === "cardio" ? "cardio" : ""}`}
                  >
                    <span>Подход</span>
                    {session && <span className="previous-col">Прошлый</span>}
                    <span>
                      {item.exercise.measure === "time" ||
                      item.exercise.measure === "cardio"
                        ? "Секунды"
                        : item.exercise.measure === "reps"
                          ? "Повторы"
                          : "Вес, кг"}
                    </span>
                    <span>
                      {item.exercise.measure === "cardio"
                        ? "Км"
                        : item.exercise.measure === "weight"
                          ? "Повторы"
                          : "Отдых, с"}
                    </span>
                    {session && <span>Готово</span>}
                  </div>
                  {item.sets.map((set, n) => {
                    const previous = previousSet(state.sessions, item, n, s);
                    return (
                      <div className="set-wrapper" key={set.id}>
                        <div
                          className={`set-row ${set.done ? "done" : ""} ${session ? "with-done" : ""} ${active && currentSet?.set.id === set.id ? "current-set" : ""} ${item.exercise.measure === "cardio" ? "cardio" : ""}`}
                          onFocusCapture={() => {
                            if (active && !set.done)
                              setFocused({ itemId: item.id, setId: set.id });
                          }}
                        >
                          <span className="set-index">
                            {set.side
                              ? `${set.side} ${item.sets.slice(0, n + 1).filter((p) => p.side === set.side).length}`
                              : n + 1}
                            {set.warmup && <small>Р</small>}
                          </span>
                          {session && (
                            <button
                              className="previous-col previous-result"
                              title="Скопировать прошлый результат, не отмечая выполнение"
                              disabled={!previous}
                              onClick={() =>
                                itemChange(item.id, (i) => {
                                  const dest = i.sets[n];
                                  if (previous) {
                                    dest.weight = previous.weight;
                                    dest.reps = previous.reps;
                                    dest.seconds = previous.seconds;
                                    dest.distance = previous.distance;
                                  }
                                })
                              }
                            >
                              <span className="previous-label">Прошлый: </span>
                              {previous
                                ? `${item.exercise.measure === "time" ? previous.seconds + " с" : item.exercise.measure === "cardio" ? previous.seconds + " с / " + previous.distance + " км" : item.exercise.measure === "reps" ? previous.reps : num(previous.weight) + " × " + previous.reps}`
                                : "—"}
                              {previous && <Copy size={11} />}
                            </button>
                          )}
                          <NumberInput
                            label={
                              item.exercise.measure === "weight"
                                ? `Вес подхода ${n + 1}`
                                : item.exercise.measure === "reps"
                                  ? `Повторы подхода ${n + 1}`
                                  : `Секунды подхода ${n + 1}`
                            }
                            integer={item.exercise.measure !== "weight"}
                            value={
                              item.exercise.measure === "weight"
                                ? set.weight
                                : item.exercise.measure === "reps"
                                  ? set.reps
                                  : set.seconds
                            }
                            onChange={(v) =>
                              itemChange(item.id, (i) => {
                                if (item.exercise.measure === "weight")
                                  i.sets[n].weight = v;
                                else if (item.exercise.measure === "reps")
                                  i.sets[n].reps = v;
                                else i.sets[n].seconds = v;
                              })
                            }
                          />
                          <NumberInput
                            label={
                              item.exercise.measure === "cardio"
                                ? `Дистанция подхода ${n + 1}`
                                : item.exercise.measure === "weight"
                                  ? `Повторы подхода ${n + 1}`
                                  : `Отдых подхода ${n + 1}`
                            }
                            integer={item.exercise.measure !== "cardio"}
                            value={
                              item.exercise.measure === "weight"
                                ? set.reps
                                : item.exercise.measure === "cardio"
                                  ? set.distance
                                  : set.rest
                            }
                            onChange={(v) =>
                              itemChange(item.id, (i) => {
                                if (item.exercise.measure === "weight")
                                  i.sets[n].reps = v;
                                else if (item.exercise.measure === "cardio")
                                  i.sets[n].distance = v;
                                else i.sets[n].rest = Math.min(v, 3600);
                              })
                            }
                          />
                          {session && (
                            <button
                              className={`done-button ${set.done ? "checked" : ""}`}
                              aria-label={`${set.done ? "Отменить отметку" : "Выполнить"} подход ${n + 1}${set.side ? " " + set.side : ""}: ${item.exercise.name}`}
                              aria-pressed={set.done}
                              disabled={
                                item.skipped || !!(active && s?.pausedAt)
                              }
                              onClick={() => record(item.id, set.id)}
                            >
                              <Check size={19} />
                            </button>
                          )}
                        </div>
                        {active && currentSet?.set.id === set.id && (
                          <button
                            className="button primary record-set"
                            disabled={!!s?.pausedAt}
                            onClick={() => record(item.id, set.id)}
                          >
                            <Check size={21} />
                            Записать подход
                            <span>
                              {set.side && `${set.side} · `}
                              {n + 1} / {item.sets.length}
                            </span>
                          </button>
                        )}
                        <details className="set-options">
                          <summary>
                            Параметры {set.side || ""}
                            {n + 1}
                          </summary>
                          <div className="set-options-content">
                            <label className="check-label">
                              <input
                                type="checkbox"
                                checked={set.warmup}
                                onChange={(e) =>
                                  itemChange(item.id, (i) => {
                                    i.sets[n].warmup = e.target.checked;
                                  })
                                }
                              />
                              Разминка
                            </label>
                            <label>
                              Отдых, с
                              <NumberInput
                                integer
                                label={`Точное время отдыха ${n + 1}`}
                                value={set.rest}
                                onChange={(v) =>
                                  itemChange(item.id, (i) => {
                                    i.sets[n].rest = Math.min(v, 3600);
                                  })
                                }
                              />
                            </label>
                            {item.exercise.id === "cable-kickback" && (
                              <label>
                                Сторона
                                <select
                                  value={set.side}
                                  onChange={(e) =>
                                    itemChange(item.id, (i) => {
                                      i.sets[n].side = e.target.value as
                                        "Л" | "П";
                                    })
                                  }
                                >
                                  <option value="Л">Левая нога</option>
                                  <option value="П">Правая нога</option>
                                </select>
                              </label>
                            )}
                            <label>
                              Комментарий
                              <input
                                value={set.note}
                                onChange={(e) =>
                                  itemChange(item.id, (i) => {
                                    i.sets[n].note = e.target.value;
                                  })
                                }
                              />
                            </label>
                            <button
                              className="text-button"
                              onClick={() =>
                                itemChange(item.id, (i) => {
                                  const source = i.sets[n];
                                  i.sets = i.sets.map((v) => ({
                                    ...v,
                                    weight: source.weight,
                                    reps: source.reps,
                                    seconds: source.seconds,
                                    distance: source.distance,
                                    rest: source.rest,
                                  }));
                                })
                              }
                            >
                              <Copy size={15} />
                              Параметры всем
                            </button>
                            <button
                              className="text-button danger-text"
                              onClick={() => {
                                if (
                                  set.done &&
                                  !confirm(
                                    "Удалить выполненный подход? Статистика изменится.",
                                  )
                                )
                                  return;
                                itemChange(item.id, (i) => {
                                  i.sets.splice(n, 1);
                                });
                              }}
                            >
                              <Trash2 size={15} />
                              Удалить подход
                            </button>
                          </div>
                        </details>
                        {active &&
                          ["time", "cardio"].includes(item.exercise.measure) &&
                          !set.done && (
                            <button
                              className="effort-button"
                              disabled={!!s?.pausedAt}
                              onClick={() =>
                                change((st) => {
                                  st.effort = {
                                    end: Date.now() + set.seconds * 1000,
                                    itemId: item.id,
                                    setId: set.id,
                                  };
                                })
                              }
                            >
                              <Timer size={15} />
                              Таймер подхода · {set.seconds} с
                            </button>
                          )}
                      </div>
                    );
                  })}
                </div>

                <div className="item-footer">
                  <button
                    className="text-button"
                    onClick={() =>
                      itemChange(item.id, (i) => {
                        if (i.sets.length >= 200) {
                          toast("Не больше 200 подходов на упражнение");
                          return;
                        }
                        const last = i.sets.at(-1);
                        i.sets.push({
                          ...makeSet(state.settings.defaultRest),
                          ...(last
                            ? {
                                ...last,
                                id: crypto.randomUUID(),
                                done: false,
                                note: "",
                              }
                            : {}),
                        });
                      })
                    }
                  >
                    <Plus size={16} />
                    Подход
                  </button>
                  <button
                    className="text-button"
                    onClick={() => onAdd(item.id)}
                  >
                    <RefreshCw size={14} />
                    Заменить
                  </button>
                  {session && (
                    <button
                      className="text-button"
                      onClick={() =>
                        itemChange(item.id, (i) => {
                          i.skipped = !i.skipped;
                        })
                      }
                    >
                      <SkipForward size={15} />
                      {item.skipped ? "Вернуть" : "Пропустить"}
                    </button>
                  )}
                  <button
                    className="icon-button danger-text"
                    aria-label="Удалить упражнение"
                    onClick={() => {
                      if (
                        item.sets.some((s) => s.done) &&
                        !confirm("Удалить упражнение с выполненными подходами?")
                      )
                        return;
                      update((t) => {
                        t.items = t.items.filter((i) => i.id !== item.id);
                      });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <input
                  className="exercise-note"
                  placeholder="Заметка к упражнению"
                  aria-label={`Заметка: ${item.exercise.name}`}
                  value={item.note}
                  onChange={(e) =>
                    itemChange(item.id, (i) => {
                      i.note = e.target.value;
                    })
                  }
                />
              </div>
            </article>
          );
        })}
      </div>
      <button
        className="button secondary full add-exercises"
        onClick={() => onAdd()}
      >
        <Plus size={20} />
        Добавить упражнения
      </button>
      {active && (
        <details className="workout-note" open={!active}>
          <summary>Заметка к тренировке</summary>
          <label className="note-label">
            Заметка
            <textarea
              placeholder="Фокус на технике, любимая музыка или что угодно…"
              value={data.note}
              rows={2}
              onChange={(e) =>
                update((t) => {
                  t.note = e.target.value;
                })
              }
            />
          </label>
        </details>
      )}
      {active && (
        <button
          className="text-button danger-text cancel-session"
          onClick={() => setCancel(true)}
        >
          Отменить тренировку
        </button>
      )}
      {finish && (
        <Modal title="Завершим тренировку?" onClose={() => setFinish(false)}>
          <div className="finish-icon">
            <Check size={32} />
          </div>
          <h2>
            {done} из {total} подходов
          </h2>
          <p>
            {total - done > 0
              ? `Осталось ${total - done} подходов. Завершить можно сейчас — учтутся только выполненные.`
              : "Всё готово. Хорошая работа!"}
          </p>
          <button className="button primary full" onClick={end}>
            Завершить и сохранить
          </button>
        </Modal>
      )}
      {cancel && (
        <Modal title="Отменить тренировку?" onClose={() => setCancel(false)}>
          <p>Она не попадёт в историю завершённых и статистику.</p>
          <button
            className="button danger full"
            onClick={() => {
              change((st) => {
                const a = st.sessions.find((a) => a.id === id)!;
                a.status = "cancelled";
                a.endedAt = Date.now();
                st.restEnd = null;
                st.effort = null;
              });
              setCancel(false);
              onBack();
            }}
          >
            Подтвердить отмену
          </button>
        </Modal>
      )}
      {summary && s && summaryStats && (
        <Modal title="Тренировка сохранена" onClose={() => setSummary(false)}>
          <div className="finish-icon">
            <Trophy size={32} />
          </div>
          <h2>Ещё один шаг вперёд</h2>
          <p>
            {s.date} · {clock(elapsed(s))}
          </p>
          <div className="summary-grid">
            <span>
              <b>{summaryStats.sets}</b>подходов
            </span>
            <span>
              <b>{summaryStats.reps}</b>повторений
            </span>
            <span>
              <b>{num(summaryStats.volume)}</b>кг·повт.
            </span>
          </div>
          {newRecords(s, state.sessions).length > 0 && (
            <div className="notice">
              <b>Новые личные рекорды</b>
              <p>{newRecords(s, state.sessions).join(" · ")}</p>
              <small>
                Сравнение рабочих подходов в том же способе учёта; без разминки
                и неуточнённых весов.
              </small>
            </div>
          )}
          <p className="muted">
            Неуточнённый вес гантелей и вес помощи исключены из объёма.
          </p>
          <button
            className="button secondary full"
            onClick={() => {
              if (
                !confirm(
                  "Заменить состав и параметры исходного шаблона результатами этого занятия?",
                )
              )
                return;
              change((st) => {
                const t = st.templates.find((t) => t.id === s.templateId);
                if (t) {
                  t.items = structuredClone(s.items).map((i) => ({
                    ...i,
                    sets: i.sets.map((x) => ({ ...x, done: false })),
                  }));
                  t.note = s.note;
                }
              });
              toast("Шаблон обновлён отдельно от истории");
            }}
          >
            Отдельно обновить исходный шаблон
          </button>
          <button
            className="button primary full"
            onClick={() => setSummary(false)}
          >
            Посмотреть результаты
          </button>
        </Modal>
      )}
    </div>
  );
}
