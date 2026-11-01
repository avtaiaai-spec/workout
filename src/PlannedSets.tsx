import { Plus, Trash2 } from "lucide-react";
import { Item, makeSet, WorkoutSet } from "./model";
import { NumberInput } from "./ui";
export function PlannedSets({
  item,
  onChange,
}: {
  item: Item;
  onChange: (fn: (item: Item) => void) => void;
}) {
  const timed = ["time", "cardio"].includes(item.exercise.measure);
  function edit(id: string, patch: Partial<WorkoutSet>) {
    onChange((i) => {
      const set = i.sets.find((s) => s.id === id);
      if (set) Object.assign(set, patch);
    });
  }
  return (
    <details className="individual-plan">
      <summary>Индивидуальные значения подходов</summary>
      <p className="muted">
        Общие поля выше меняют выбранное значение во всех подходах. Здесь можно
        задать отличия.
      </p>
      {item.sets.map((s, index) => (
        <fieldset className="planned-set" key={s.id}>
          <legend>
            Подход {index + 1}
            {s.side ? ` · ${s.side === "Л" ? "левая" : "правая"} сторона` : ""}
          </legend>
          <div className="exercise-plan-fields">
            {item.exercise.measure === "weight" && (
              <label>
                Вес, кг
                <NumberInput
                  label={`Плановый вес подхода ${index + 1}`}
                  value={s.weight}
                  onChange={(weight) => edit(s.id, { weight })}
                />
              </label>
            )}
            <label>
              {timed ? "Секунды" : "Повторы от"}
              <NumberInput
                integer
                label={`План ${timed ? "секунд" : "повторов"} подхода ${index + 1}`}
                value={timed ? s.seconds : s.reps}
                onChange={(n) =>
                  edit(
                    s.id,
                    timed
                      ? { seconds: n }
                      : {
                          reps: n,
                          plannedRepsMax:
                            s.plannedRepsMax !== undefined
                              ? Math.max(n, s.plannedRepsMax)
                              : undefined,
                        },
                  )
                }
              />
            </label>
            {!timed && (
              <label>
                До (диапазон)
                <input
                  aria-label={`Повторы до подхода ${index + 1}`}
                  inputMode="numeric"
                  placeholder="Точное число"
                  value={s.plannedRepsMax ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Number(raw);
                    if (raw === "") edit(s.id, { plannedRepsMax: undefined });
                    else if (/^\d+$/.test(raw) && n >= s.reps && n <= 10000)
                      edit(s.id, { plannedRepsMax: n });
                  }}
                />
              </label>
            )}
            {item.exercise.measure === "cardio" && (
              <label>
                Дистанция, км
                <NumberInput
                  label={`Плановая дистанция подхода ${index + 1}`}
                  value={s.distance}
                  onChange={(distance) => edit(s.id, { distance })}
                />
              </label>
            )}
            <label>
              Отдых, с
              <NumberInput
                integer
                max={3600}
                label={`Плановый отдых подхода ${index + 1}`}
                value={s.rest}
                onChange={(rest) => edit(s.id, { rest })}
              />
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={s.warmup}
              onChange={(e) => edit(s.id, { warmup: e.target.checked })}
            />
            Разминка
          </label>
          <label>
            Комментарий
            <input
              value={s.note}
              aria-label={`Плановый комментарий ${index + 1}`}
              onChange={(e) => edit(s.id, { note: e.target.value })}
            />
          </label>
          <button
            className="text-button danger-text"
            disabled={item.sets.length <= 1}
            onClick={() =>
              onChange((i) => {
                i.sets = i.sets.filter((x) => x.id !== s.id);
              })
            }
          >
            <Trash2 size={15} />
            Удалить подход {index + 1}
          </button>
        </fieldset>
      ))}
      <button
        className="text-button text-link"
        disabled={item.sets.length >= 100}
        onClick={() =>
          onChange((i) => {
            const last = i.sets.at(-1);
            i.sets.push({
              ...makeSet(last?.rest),
              ...last,
              id: crypto.randomUUID(),
              done: false,
              recordedAt: undefined,
            });
          })
        }
      >
        <Plus size={16} />
        Добавить отдельный подход
      </button>
    </details>
  );
}
