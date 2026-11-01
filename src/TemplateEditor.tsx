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
import { Illustration } from "./Illustration";
import { Empty, NumberInput } from "./ui";
export function TemplateEditor({
  id,
  onBack,
  onAdd,
  onInfo,
  onStart,
}: {
  id: string;
  onBack: () => void;
  onAdd: (replace?: string) => void;
  onInfo: (e: Exercise) => void;
  onStart: (id: string) => void;
}) {
  const { state, change, saving, error, toast } = useStore();
  const template = state.templates.find((t) => t.id === id);
  const [drag, setDrag] = useState("");
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
  return (
    <div className="template-editor">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={19} />
        Все тренировки
      </button>
      <div className="section-heading">
        <div>
          <span className="eyebrow">СОБЕРИТЕ СВОЮ ТРЕНИРОВКУ</span>
          <input
            className="title-input"
            aria-label="Название тренировки"
            defaultValue={template.name}
            maxLength={150}
            onChange={(e) => {
              if (e.target.value.trim())
                edit((t) => {
                  t.name = e.target.value;
                });
            }}
            onBlur={(e) => {
              if (!e.target.value.trim()) e.target.value = template.name;
            }}
          />
          <p>
            Укажите вес, подходы, повторения и отдых один раз для каждого
            упражнения.
          </p>
        </div>
        <div className="editor-primary-actions">
          <button
            className="button secondary"
            disabled={!template.items.length}
            onClick={() => onStart(id)}
          >
            <Play size={18} />
            Начать
          </button>
          <button
            className="button primary"
            disabled={saving || !!error}
            onClick={() => {
              toast("Тренировка сохранена");
              onBack();
            }}
          >
            <Save size={19} />
            Сохранить тренировку
          </button>
        </div>
      </div>
      <label>
        Заметка к тренировке
        <textarea
          rows={2}
          value={template.note}
          placeholder="Например, лёгкая тренировка после работы"
          onChange={(e) =>
            edit((t) => {
              t.note = e.target.value;
            })
          }
        />
      </label>
      {!template.items.length && (
        <Empty title="Добавьте первое упражнение" icon={<Plus />}>
          <p>
            В каталоге только 17 выбранных вами упражнений. Можно выбрать сразу
            несколько.
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
              <header className="item-heading">
                <button
                  className="thumb-button"
                  aria-label={`Техника: ${item.exercise.name}`}
                  onClick={() => onInfo(item.exercise)}
                >
                  <Illustration exercise={item.exercise} small />
                </button>
                <div draggable onDragStart={() => setDrag(item.id)}>
                  <small>
                    Упражнение {n + 1} · {item.exercise.category}
                  </small>
                  <h3>{item.exercise.name}</h3>
                  <button
                    className="text-button text-link"
                    onClick={() => onInfo(item.exercise)}
                  >
                    <Info size={15} />
                    Посмотреть технику
                  </button>
                </div>
              </header>
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
                            configureExercise(i, { reps }),
                          )
                        }
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
                          configureExercise(i, { rest: Math.min(rest, 3600) }),
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
                    Количество подходов на каждую ногу: {count || 3}. Во время
                    занятия каждая сторона отмечается отдельно.
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
                      В этой сохранённой тренировке подходы отличаются. Значения
                      сохранены. Изменение поля применяется ко всем подходам,
                      остальные значения остаются прежними.
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
                        {Object.entries(accountingLabels).map(([k, v]) => (
                          <option value={k} key={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    {item.accounting === "unknown" && (
                      <p className="muted">
                        Число не меняется. Пока вы не уточнили вес одной гантели
                        или двух, он не участвует в расчёте объёма нагрузки.
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
                          if (i.sets[0]) i.sets[0].warmup = e.target.checked;
                        })
                      }
                    />
                    Первый подход разминочный
                  </label>
                </details>
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
      <p className="muted editor-help">
        План сохраняется на устройстве. Во время тренировки вы сможете записать
        фактический результат каждого подхода.
      </p>
    </div>
  );
}
