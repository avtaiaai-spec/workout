import {
  ArrowLeft,
  Plus,
  Save,
  Play,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Trash2,
  Info,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useStore } from "./store";
import {
  Exercise,
  Item,
  Accounting,
  accountingLabels,
  configureExercise,
} from "./model";
import { PlannedSets } from "./PlannedSets";
import { Illustration } from "./Illustration";
import { Empty, NumberInput } from "./ui";
export function TemplateEditor({
  id,
  onBack,
  onAdd,
  onInfo,
  onStart,
  onSchedule,
}: {
  id: string;
  onBack: () => void;
  onAdd: (replace?: string) => void;
  onInfo: (e: Exercise) => void;
  onStart: (id: string) => void;
  onSchedule: (id: string) => void;
}) {
  const { state, change, saving, error, toast } = useStore();
  const template = state.templates.find((t) => t.id === id);
  const [drag, setDrag] = useState("");
  const [expanded, setExpanded] = useState(
    template?.draft ? (template.items[0]?.id ?? "") : "",
  );
  if (!template)
    return (
      <Empty title="Тренировка не найдена">
        <button className="button secondary" onClick={onBack}>
          Назад
        </button>
      </Empty>
    );
  function edit(fn: (t: typeof template & {}) => void) {
    change((s) => {
      const t = s.templates.find((t) => t.id === id);
      if (t) fn(t);
    });
  }
  function itemEdit(itemId: string, fn: (item: Item) => void) {
    edit((t) => {
      const item = t.items.find((i) => i.id === itemId);
      if (item) fn(item);
    });
  }
  function move(itemId: string, delta: number) {
    edit((t) => {
      const n = t.items.findIndex((i) => i.id === itemId);
      if (n + delta >= 0 && n + delta < t.items.length)
        [t.items[n], t.items[n + delta]] = [t.items[n + delta], t.items[n]];
    });
  }
  const step = template.draftStep ?? 2;
  function setStep(step: number) {
    edit((t) => {
      t.draftStep = step;
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function save(schedule = false) {
    if (!template?.name.trim()) return;
    edit((t) => {
      t.draft = false;
      t.draftStep = undefined;
    });
    toast("Тренировка сохранена");
    onBack();
    if (schedule) onSchedule(id);
  }
  return (
    <div className="template-editor">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={19} />К плану
      </button>
      <div className="section-heading">
        <div>
          <h1>{step === 3 ? "Название и сохранение" : "Настроить подходы"}</h1>
          <p>Черновик сохраняется при каждом изменении.</p>
        </div>
      </div>
      <nav className="creation-steps" aria-label="Создание тренировки">
        <button onClick={() => onAdd()}>1. Упражнения</button>
        <button
          aria-current={step === 2 ? "step" : undefined}
          onClick={() => setStep(2)}
        >
          2. Подходы
        </button>
        <button
          aria-current={step === 3 ? "step" : undefined}
          disabled={!template.items.length}
          onClick={() => setStep(3)}
        >
          3. Название
        </button>
      </nav>
      {step === 3 ? (
        <div className="template-save-step">
          <label>
            Название тренировки
            <input
              className="title-input"
              aria-label="Название тренировки"
              value={template.name}
              maxLength={150}
              onChange={(e) =>
                edit((t) => {
                  t.name = e.target.value || " ";
                })
              }
            />
          </label>
          <label>
            Заметка к тренировке
            <textarea
              rows={2}
              value={template.note}
              onChange={(e) =>
                edit((t) => {
                  t.note = e.target.value;
                })
              }
            />
          </label>
          <p className="muted">
            {template.items.length} упражнений. Расписание можно назначить
            сейчас или позже.
          </p>
          <div className="editor-primary-actions">
            <button
              className="button primary"
              disabled={saving || !!error || !template.name.trim()}
              onClick={() => save()}
            >
              <Save size={18} />
              Сохранить тренировку
            </button>
            <button
              className="button secondary"
              disabled={saving || !!error || !template.name.trim()}
              onClick={() => save(true)}
            >
              Сохранить и назначить
            </button>
          </div>
        </div>
      ) : (
        <>
          {!template.items.length && (
            <Empty title="Добавьте первое упражнение" icon={<Plus />}>
              <p>
                В каталоге только 17 выбранных вами упражнений. Можно выбрать
                сразу несколько.
              </p>
              <button className="button primary full" onClick={() => onAdd()}>
                <Plus size={19} />
                Выбрать упражнения
              </button>
            </Empty>
          )}
          <div className="workout-items">
            {template.items.map((item, n) => {
              const first = item.sets[0];
              const unilateral = item.exercise.id === "cable-kickback";
              const count = unilateral
                ? item.sets.filter((s) => s.side === "Л").length
                : item.sets.length;
              const varied =
                first &&
                item.sets.some(
                  (s) =>
                    s.weight !== first.weight ||
                    s.reps !== first.reps ||
                    s.seconds !== first.seconds ||
                    s.rest !== first.rest,
                );
              return (
                <article
                  className="workout-item plan-exercise"
                  key={item.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (drag && drag !== item.id)
                      edit((t) => {
                        const from = t.items.findIndex((i) => i.id === drag);
                        const to = t.items.findIndex((i) => i.id === item.id);
                        if (from >= 0 && to >= 0) {
                          const [m] = t.items.splice(from, 1);
                          t.items.splice(to, 0, m);
                        }
                      });
                    setDrag("");
                  }}
                >
                  <header className="plan-item-heading">
                    <button
                      className="plan-item-toggle"
                      aria-expanded={expanded === item.id}
                      onClick={() =>
                        setExpanded(expanded === item.id ? "" : item.id)
                      }
                      draggable
                      onDragStart={() => setDrag(item.id)}
                    >
                      <Illustration exercise={item.exercise} small />
                      <span>
                        <strong>{item.exercise.name}</strong>
                        <small>
                          {count} {unilateral ? "подхода на ногу" : "подхода"} ·{" "}
                          {item.exercise.measure === "time" ||
                          item.exercise.measure === "cardio"
                            ? `${first?.seconds ?? 45} с`
                            : `${first?.reps ?? 10}${first?.plannedRepsMax ? `–${first.plannedRepsMax}` : ""} повторений`}{" "}
                          · отдых {first?.rest ?? 90} с
                          {varied ? " · есть отличия" : ""}
                        </small>
                      </span>
                      <ChevronDown size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Техника: ${item.exercise.name}`}
                      onClick={() => onInfo(item.exercise)}
                    >
                      <Info size={18} />
                    </button>
                  </header>
                  {expanded === item.id && (
                    <div className="item-body">
                      <div className="exercise-plan-fields">
                        {item.exercise.measure === "weight" && (
                          <label>
                            Вес, кг
                            <NumberInput
                              label={`Вес: ${item.exercise.name}`}
                              value={first?.weight ?? 0}
                              onChange={(weight) =>
                                itemEdit(item.id, (i) =>
                                  configureExercise(i, { weight }),
                                )
                              }
                            />
                          </label>
                        )}
                        <label>
                          {unilateral ? "Подходов на каждую ногу" : "Подходов"}
                          <NumberInput
                            integer
                            min={1}
                            max={50}
                            label={`Подходов: ${item.exercise.name}`}
                            value={count || 3}
                            onChange={(count) => {
                              if (count < 1 || count > 50) return;
                              itemEdit(item.id, (i) =>
                                configureExercise(i, { count }),
                              );
                            }}
                          />
                        </label>
                        {["time", "cardio"].includes(item.exercise.measure) ? (
                          <label>
                            Длительность, с
                            <NumberInput
                              integer
                              label={`Секунды: ${item.exercise.name}`}
                              value={first?.seconds ?? 45}
                              onChange={(seconds) =>
                                itemEdit(item.id, (i) =>
                                  configureExercise(i, { seconds }),
                                )
                              }
                            />
                          </label>
                        ) : (
                          <label>
                            {unilateral ? "Повторений на ногу" : "Повторений"}
                            <NumberInput
                              integer
                              label={`Повторения: ${item.exercise.name}`}
                              value={first?.reps ?? 10}
                              onChange={(reps) =>
                                itemEdit(item.id, (i) =>
                                  configureExercise(i, {
                                    reps,
                                    plannedRepsMax:
                                      first?.plannedRepsMax !== undefined
                                        ? Math.max(reps, first.plannedRepsMax)
                                        : undefined,
                                  }),
                                )
                              }
                            />
                          </label>
                        )}
                        {!["time", "cardio"].includes(
                          item.exercise.measure,
                        ) && (
                          <label>
                            Повторы до (диапазон)
                            <input
                              aria-label={`Повторы до: ${item.exercise.name}`}
                              inputMode="numeric"
                              placeholder="Точное число"
                              value={first?.plannedRepsMax ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const n = Number(raw);
                                if (raw === "")
                                  itemEdit(item.id, (i) =>
                                    i.sets.forEach((s) => {
                                      s.plannedRepsMax = undefined;
                                    }),
                                  );
                                else if (
                                  /^\d+$/.test(raw) &&
                                  n >= (first?.reps ?? 0) &&
                                  n <= 10000
                                )
                                  itemEdit(item.id, (i) =>
                                    configureExercise(i, { plannedRepsMax: n }),
                                  );
                              }}
                            />
                          </label>
                        )}
                        <label>
                          Отдых, с
                          <NumberInput
                            integer
                            max={3600}
                            label={`Отдых: ${item.exercise.name}`}
                            value={first?.rest ?? state.settings.defaultRest}
                            onChange={(rest) =>
                              itemEdit(item.id, (i) =>
                                configureExercise(i, {
                                  rest: Math.min(rest, 3600),
                                }),
                              )
                            }
                          />
                        </label>
                        {item.exercise.measure === "cardio" && (
                          <label>
                            Дистанция, км
                            <NumberInput
                              label={`Дистанция: ${item.exercise.name}`}
                              value={first?.distance ?? 0}
                              onChange={(distance) =>
                                itemEdit(item.id, (i) =>
                                  configureExercise(i, { distance }),
                                )
                              }
                            />
                          </label>
                        )}
                      </div>
                      {unilateral && (
                        <p className="subtle-note">
                          Количество подходов на каждую ногу: {count || 3}. Во
                          время занятия каждая сторона отмечается отдельно.
                        </p>
                      )}
                      {item.exercise.id === "smith-bench" && (
                        <p className="subtle-note">
                          Указан добавленный вес без учёта грифа Смита.
                        </p>
                      )}
                      {varied && (
                        <div className="notice">
                          <p>
                            В этой сохранённой тренировке подходы отличаются.
                            Значения сохранены. Изменение поля применяется ко
                            всем подходам, остальные значения остаются прежними.
                          </p>
                          <button
                            className="text-button text-link"
                            onClick={() =>
                              itemEdit(item.id, (i) =>
                                configureExercise(i, {
                                  weight: first.weight,
                                  reps: first.reps,
                                  seconds: first.seconds,
                                  distance: first.distance,
                                  rest: first.rest,
                                }),
                              )
                            }
                          >
                            Сделать все подходы одинаковыми
                          </button>
                        </div>
                      )}
                      {item.exercise.measure === "weight" && (
                        <details
                          className="accounting-details"
                          open={item.accounting === "unknown"}
                        >
                          <summary>
                            {item.accounting === "unknown"
                              ? "Уточните, как записан вес гантелей"
                              : "Как учитывается вес"}
                          </summary>
                          <label>
                            Способ учёта
                            <select
                              aria-label={`Учёт веса: ${item.exercise.name}`}
                              value={item.accounting}
                              onChange={(e) =>
                                itemEdit(item.id, (i) => {
                                  i.accounting = e.target.value as Accounting;
                                })
                              }
                            >
                              {Object.entries(accountingLabels).map(
                                ([k, v]) => (
                                  <option value={k} key={k}>
                                    {v}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          {item.accounting === "unknown" && (
                            <p className="muted">
                              Число не меняется. Пока вы не уточнили вес одной
                              гантели или двух, он не участвует в расчёте объёма
                              нагрузки.
                            </p>
                          )}
                        </details>
                      )}
                      <details>
                        <summary>Заметка и разминка</summary>
                        <label>
                          Заметка к упражнению
                          <input
                            value={item.note}
                            onChange={(e) =>
                              itemEdit(item.id, (i) => {
                                i.note = e.target.value;
                              })
                            }
                          />
                        </label>
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={!!first?.warmup}
                            onChange={(e) =>
                              itemEdit(item.id, (i) => {
                                if (i.sets[0])
                                  i.sets[0].warmup = e.target.checked;
                              })
                            }
                          />
                          Первый подход разминочный
                        </label>
                      </details>
                      <PlannedSets
                        item={item}
                        onChange={(fn) => itemEdit(item.id, fn)}
                      />
                      <div className="item-footer">
                        <button
                          className="text-button"
                          disabled={n === 0}
                          onClick={() => move(item.id, -1)}
                        >
                          <ArrowUp size={16} />
                          Выше
                        </button>
                        <button
                          className="text-button"
                          disabled={n === template.items.length - 1}
                          onClick={() => move(item.id, 1)}
                        >
                          <ArrowDown size={16} />
                          Ниже
                        </button>
                        <button
                          className="text-button"
                          onClick={() => onAdd(item.id)}
                        >
                          <RefreshCw size={16} />
                          Заменить
                        </button>
                        <button
                          className="icon-button danger-text"
                          aria-label={`Удалить: ${item.exercise.name}`}
                          onClick={() =>
                            edit((t) => {
                              t.items = t.items.filter((i) => i.id !== item.id);
                            })
                          }
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {!!template.items.length && (
            <button
              className="button secondary full add-exercises"
              onClick={() => onAdd()}
            >
              <Plus size={20} />
              Добавить упражнения
            </button>
          )}
          <button
            className="button primary full"
            disabled={!template.items.length}
            onClick={() => setStep(3)}
          >
            Далее: название
          </button>
          {!template.draft && (
            <button
              className="button secondary full"
              disabled={!template.items.length}
              onClick={() => onStart(id)}
            >
              <Play size={17} />
              Начать тренировку
            </button>
          )}
          <p className="muted editor-help">
            Диапазон — план на занятие. Фактические повторения записываются
            точным числом.
          </p>
        </>
      )}
    </div>
  );
}
