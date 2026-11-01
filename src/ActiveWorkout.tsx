import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Undo2,
  List,
  MoreHorizontal,
  Minimize2,
  Pause,
  Play,
  Check,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Timer,
} from "lucide-react";
import { useStore } from "./store";
import {
  Exercise,
  Item,
  WorkoutSet,
  accountingLabels,
  clock,
  elapsed,
  makeSet,
  num,
  recordPlannedSet,
  uid,
} from "./model";
import { Modal, NumberInput, Empty } from "./ui";
import { Illustration } from "./Illustration";
import { ExerciseRestTimer } from "./Timers";
function result(item: Item, set: WorkoutSet) {
  return item.exercise.measure === "time"
    ? `${set.seconds} с`
    : item.exercise.measure === "cardio"
      ? `${set.seconds} с · ${num(set.distance)} км`
      : item.exercise.measure === "reps"
        ? `${set.reps} повторений`
        : `${num(set.weight)} кг × ${set.reps}`;
}
export function ActiveWorkout({
  id,
  onBack,
  onInfo,
  onAdd,
  onComplete,
}: {
  id: string;
  onBack: () => void;
  onInfo: (exercise: Exercise) => void;
  onAdd: (replace?: string) => void;
  onComplete: () => void;
}) {
  const { state, change, toast } = useStore();
  const session = state.sessions.find((s) => s.id === id)!;
  const [now, setNow] = useState(Date.now()),
    [list, setList] = useState(false),
    [menu, setMenu] = useState(false),
    [finish, setFinish] = useState(false),
    [cancel, setCancel] = useState(false),
    [editing, setEditing] = useState<string>();
  const lastClick = useRef(0);
  const cooldownTimer = useRef<number | undefined>(undefined);
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 300);
    return () => {
      clearInterval(timer);
      clearTimeout(cooldownTimer.current);
    };
  }, []);
  useEffect(() => {
    if (
      !session.items.some((i) => !i.plannedSets) &&
      (!state.restEnd || state.restItemId)
    )
      return;
    change((s) => {
      const active = s.sessions.find((x) => x.id === id);
      if (!active) return;
      for (const i of active.items)
        i.plannedSets ??= i.sets.map((set) => ({
          ...structuredClone(set),
          done: false,
          recordedAt: undefined,
        }));
      if (s.restEnd && !s.restItemId) {
        const owner =
          active.items.find((i) => i.id === active.currentItemId) ??
          active.items[0];
        if (owner) {
          s.restItemId = owner.id;
          owner.restEnd ??= s.restEnd;
        }
      }
    });
  }, [id, session.items.length]);
  const item =
    session.items.find((i) => i.id === session.currentItemId) ??
    session.items[0];
  const index = session.items.findIndex((i) => i.id === item?.id);
  const done = session.items
    .filter((i) => !i.skipped)
    .reduce((n, i) => n + i.sets.filter((s) => s.done).length, 0);
  const pending = item?.sets.find((s) => !s.done),
    targets = item?.plannedSets ?? item?.sets ?? [],
    target =
      targets.find((s) => s.id === pending?.id) ??
      targets[item?.sets.indexOf(pending!) ?? 0] ??
      targets.at(-1);
  const planned = targets.length,
    recorded = item?.sets.filter((s) => s.done) ?? [];
  const edited = item?.sets.find((s) => s.id === editing);
  const editIndex = item?.sets.findIndex((s) => s.id === editing) ?? -1;
  const past = state.sessions
    .filter(
      (s) =>
        s.status === "completed" &&
        s.id !== id &&
        s.items.some(
          (i) =>
            i.exercise.id === item?.exercise.id &&
            i.sets.some((s) => s.done) &&
            !i.skipped,
        ),
    )
    .sort((a, b) => b.startedAt - a.startedAt);
  function editItem(fn: (item: Item) => void) {
    change((s) => {
      const i = s.sessions
        .find((s) => s.id === id)
        ?.items.find((i) => i.id === item?.id);
      if (i) fn(i);
    });
  }
  function choose(itemId: string) {
    change((s) => {
      const a = s.sessions.find((s) => s.id === id)!;
      a.currentItemId = itemId;
      a.currentSetId = a.items
        .find((i) => i.id === itemId)
        ?.sets.find((s) => !s.done)?.id;
    });
    setList(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function move(itemId: string, delta: number) {
    change((s) => {
      const a = s.sessions.find((s) => s.id === id)!;
      const index = a.items.findIndex((i) => i.id === itemId),
        to = index + delta;
      if (to >= 0 && to < a.items.length)
        [a.items[index], a.items[to]] = [a.items[to], a.items[index]];
    });
  }
  function record(extra = false) {
    if (!item || session.pausedAt || item.skipped || item.remainingSkipped)
      return;
    if (
      ["time", "cardio"].includes(item.exercise.measure) &&
      (!target || target.seconds <= 0)
    ) {
      toast("Укажите длительность подхода больше нуля");
      return;
    }
    if (extra && item.sets.length >= 200) {
      toast("Не больше 200 подходов на упражнение");
      return;
    }
    const time = Date.now();
    if (time - lastClick.current < 400) return;
    lastClick.current = time;
    setCooldown(true);
    clearTimeout(cooldownTimer.current);
    cooldownTimer.current = window.setTimeout(() => setCooldown(false), 400);
    change((s) => {
      const a = s.sessions.find((s) => s.id === id)!;
      const i = a.items.find((i) => i.id === item.id)!;
      let slot = i.sets.find((s) => !s.done);
      if (!slot && extra) {
        const plan =
          i.plannedSets?.at(-1) ??
          i.sets.at(-1) ??
          makeSet(s.settings.defaultRest);
        slot = {
          ...structuredClone(plan),
          id: uid(),
          done: false,
          recordedAt: undefined,
          warmup: false,
        };
        i.sets.push(slot);
      }
      if (!slot) return;
      const set = recordPlannedSet(a, i.id, slot.id, time);
      if (!set) return;
      if (s.settings.autoRest && set.rest > 0) {
        i.restEnd = time + set.rest * 1000;
        s.restEnd = i.restEnd;
        s.restItemId = i.id;
      }
      if (s.effort?.itemId === i.id && s.effort.setId === set.id)
        s.effort = null;
    });
  }
  function finishSession() {
    change((s) => {
      const a = s.sessions.find((s) => s.id === id)!;
      a.endedAt = Date.now();
      if (a.pausedAt) {
        a.pausedMs += a.endedAt - a.pausedAt;
        a.pausedAt = null;
      }
      a.status = "completed";
      for (const i of a.items) i.restEnd = null;
      s.restEnd = null;
      s.restItemId = undefined;
      s.effort = null;
    });
    onComplete();
  }
  function changeTarget(patch: Partial<WorkoutSet>) {
    editItem((i) => {
      i.plannedSets ??= i.sets.map((s) => ({
        ...structuredClone(s),
        done: false,
        recordedAt: undefined,
      }));
      for (const s of i.plannedSets) Object.assign(s, patch);
      for (const s of i.sets) if (!s.done) Object.assign(s, patch);
    });
  }
  return (
    <div className="active-workout">
      <div className="session-topbar">
        <button
          className="icon-button"
          aria-label="Свернуть тренировку"
          onClick={onBack}
        >
          <Minimize2 size={20} />
        </button>
        <div className="session-clock">
          <time>{clock(elapsed(session, now))}</time>
          <small>{session.pausedAt ? "На паузе" : "Общее время"}</small>
        </div>
        <span className="session-set-count">{done} подходов</span>
        <button
          className="icon-button"
          aria-label="Список упражнений"
          onClick={() => setList(true)}
        >
          <List size={21} />
        </button>
        <button
          className="icon-button"
          aria-label="Меню тренировки"
          onClick={() => setMenu(true)}
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
      <p className="active-workout-name">{session.name}</p>
      {item && target ? (
        <>
          <header className="current-exercise-heading">
            <small>
              Упражнение {index + 1} из {session.items.length}
            </small>
            <h1>{item.exercise.name}</h1>
            <button
              className="text-button text-link"
              onClick={() => onInfo(item.exercise)}
            >
              Техника
            </button>
          </header>
          <details
            className="inline-technique"
            open={!!session.pinnedTechnique}
            onToggle={(e) => {
              const open = e.currentTarget.open;
              if (open !== !!session.pinnedTechnique)
                change((s) => {
                  s.sessions.find((s) => s.id === id)!.pinnedTechnique = open;
                });
            }}
          >
            <summary>Демонстрация упражнения</summary>
            <Illustration exercise={item.exercise} />
          </details>
          <section className="exercise-plan-summary">
            <details>
              <summary>
                <span>
                  {item.exercise.id === "cable-kickback"
                    ? `Левая: ${targets.filter((s) => s.side === "Л").length} · правая: ${targets.filter((s) => s.side === "П").length}`
                    : `Подходов: ${planned}`}{" "}
                  · {result(item, target)}
                </span>
                <em>Изменить</em>
              </summary>
              <div className="exercise-plan-fields">
                {item.exercise.measure === "weight" && (
                  <label>
                    Вес, кг
                    <NumberInput
                      label="Вес следующих подходов"
                      value={target.weight}
                      onChange={(weight) => changeTarget({ weight })}
                    />
                  </label>
                )}
                {["time", "cardio"].includes(item.exercise.measure) ? (
                  <label>
                    Длительность, с
                    <NumberInput
                      integer
                      label="Длительность следующих подходов"
                      value={target.seconds}
                      onChange={(seconds) => changeTarget({ seconds })}
                    />
                  </label>
                ) : (
                  <label>
                    Повторения
                    <NumberInput
                      integer
                      label="Повторения следующих подходов"
                      value={target.reps}
                      onChange={(reps) => changeTarget({ reps })}
                    />
                  </label>
                )}
                {item.exercise.measure === "cardio" && (
                  <label>
                    Км
                    <NumberInput
                      label="Дистанция следующих подходов"
                      value={target.distance}
                      onChange={(distance) => changeTarget({ distance })}
                    />
                  </label>
                )}
              </div>
            </details>
            {item.exercise.measure === "weight" && (
              <small>{accountingLabels[item.accounting]}</small>
            )}
          </section>
          <section className="recorded-sets" aria-label="Записанные подходы">
            <div className="section-heading small">
              <h2>Подходы</h2>
              <small>
                {recorded.length} записано · план {planned}
              </small>
            </div>
            {!recorded.length ? (
              <p className="muted empty-approaches">
                Выполните подход и нажмите «+». Вес и повторения возьмём из
                вашего плана.
              </p>
            ) : (
              recorded.map((set) => {
                const n = item.sets.indexOf(set);
                return (
                  <div className="recorded-set" key={set.id}>
                    <span className="recorded-set-index">
                      {set.side
                        ? `${set.side} ${item.sets.slice(0, n + 1).filter((s) => s.side === set.side).length}`
                        : n + 1}
                    </span>
                    <span className="recorded-set-value">
                      <strong>{result(item, set)}</strong>
                      <small>
                        {set.warmup ? "Разминка · " : ""}
                        {set.recordedAt
                          ? new Date(set.recordedAt).toLocaleTimeString(
                              "ru-RU",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "Записано ранее"}
                        {set.note && ` · ${set.note}`}
                      </small>
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Изменить подход ${n + 1}`}
                      onClick={() => setEditing(set.id)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Отменить запись подхода ${n + 1}`}
                      onClick={() =>
                        editItem((i) => {
                          const s = i.sets.find((s) => s.id === set.id)!;
                          s.done = false;
                          s.recordedAt = undefined;
                        })
                      }
                    >
                      <Undo2 size={17} />
                    </button>
                  </div>
                );
              })
            )}
            {item.skipped || item.remainingSkipped ? (
              <button
                className="button secondary full"
                onClick={() =>
                  editItem((i) => {
                    i.skipped = false;
                    i.remainingSkipped = false;
                  })
                }
              >
                Вернуть оставшиеся подходы
              </button>
            ) : (
              <button
                className={`button ${pending ? "primary" : "secondary"} add-recorded-set`}
                aria-label={
                  pending ? "Записать подход" : "Записать дополнительный подход"
                }
                disabled={
                  !!session.pausedAt ||
                  cooldown ||
                  (!pending && item.sets.length >= 200)
                }
                onClick={() => record(!pending)}
              >
                <Plus size={24} />
                <span>{pending ? "Подход" : "Ещё подход"}</span>
                <small>
                  {result(item, target)}
                  {pending?.side
                    ? ` · ${pending.side === "Л" ? "левая" : "правая"} нога`
                    : ""}
                </small>
              </button>
            )}
            {state.effort?.itemId === item.id && (
              <div
                className="approach-countdown"
                aria-label="Таймер выполнения подхода"
              >
                <Timer size={17} />
                Подход ·{" "}
                <b>
                  {state.effort.end > now
                    ? clock(state.effort.end - now)
                    : "Время вышло"}
                </b>
                <button
                  className="text-button"
                  aria-label="Остановить таймер подхода"
                  onClick={() =>
                    change((s) => {
                      s.effort = null;
                    })
                  }
                >
                  Остановить
                </button>
              </div>
            )}
            {["time", "cardio"].includes(item.exercise.measure) &&
              pending &&
              !pending.done && (
                <button
                  className="text-button text-link"
                  disabled={!!session.pausedAt || target.seconds <= 0}
                  onClick={() =>
                    change((s) => {
                      s.effort = {
                        itemId: item.id,
                        setId: pending.id,
                        end: Date.now() + target.seconds * 1000,
                      };
                    })
                  }
                >
                  <Timer size={17} />
                  Таймер подхода · {target.seconds} с
                </button>
              )}
          </section>
          <ExerciseRestTimer sessionId={id} item={item} />
          <div className="exercise-next-actions">
            {index < session.items.length - 1 ? (
              <button
                className={`button ${pending && !item.skipped && !item.remainingSkipped ? "secondary" : "primary"} full`}
                onClick={() => choose(session.items[index + 1].id)}
              >
                Следующее упражнение
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                className="button primary full"
                onClick={() => setFinish(true)}
              >
                <Check size={18} />
                Завершить тренировку
              </button>
            )}
          </div>
          <details className="exercise-management">
            <summary>Заметка, замена и пропуск</summary>
            <label>
              Заметка к упражнению
              <input
                aria-label={`Заметка: ${item.exercise.name}`}
                value={item.note}
                onChange={(e) =>
                  editItem((i) => {
                    i.note = e.target.value;
                  })
                }
              />
            </label>
            <div className="item-footer">
              <button
                className="text-button"
                disabled={item.sets.every((s) => s.done)}
                onClick={() => onAdd(item.id)}
              >
                <RefreshCw size={15} />
                Заменить
              </button>
              <button
                className="text-button"
                onClick={() =>
                  editItem((i) => {
                    if (i.sets.some((s) => s.done))
                      i.remainingSkipped = !i.remainingSkipped;
                    else i.skipped = !i.skipped;
                  })
                }
              >
                {item.skipped || item.remainingSkipped
                  ? "Вернуть оставшиеся"
                  : "Пропустить оставшиеся"}
              </button>
            </div>
          </details>
          <section className="exercise-session-history">
            <h2>История упражнения</h2>
            <p className="muted">
              Фактические подходы из завершённых тренировок.
            </p>
            {past.length ? (
              past.map((pastSession) => (
                <article className="past-workout" key={pastSession.id}>
                  <h3>
                    {new Date(
                      pastSession.date + "T12:00:00",
                    ).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <small>{pastSession.name}</small>
                  {pastSession.items
                    .filter(
                      (i) => i.exercise.id === item.exercise.id && !i.skipped,
                    )
                    .map((i) => (
                      <div key={i.id}>
                        <small className="past-accounting">
                          {accountingLabels[i.accounting]}
                        </small>
                        {i.sets
                          .filter((s) => s.done)
                          .map((s, n) => (
                            <p key={s.id}>
                              <span>
                                {s.side ? `${s.side} · ` : ""}
                                {n + 1}.
                              </span>{" "}
                              {result(i, s)}
                              {s.warmup && <small> · разминка</small>}
                              {s.note && <small> · {s.note}</small>}
                            </p>
                          ))}
                      </div>
                    ))}
                </article>
              ))
            ) : (
              <p className="empty-approaches muted">
                Здесь появятся результаты этого упражнения после завершения
                занятия.
              </p>
            )}
          </section>
        </>
      ) : (
        <Empty title="Добавьте первое упражнение">
          <p>Вес, повторения и отдых можно задать перед первым подходом.</p>
        </Empty>
      )}
      <button
        className="button secondary full add-exercises"
        onClick={() => onAdd()}
      >
        <Plus size={19} />
        Добавить упражнения
      </button>
      {list && (
        <Modal title="Упражнения занятия" onClose={() => setList(false)}>
          {session.items.map((i, n) => (
            <div className="session-exercise-entry" key={i.id}>
              <button className="choose-row" onClick={() => choose(i.id)}>
                <span className="row-number">
                  {String(n + 1).padStart(2, "0")}
                </span>
                <span>
                  <b>{i.exercise.name}</b>
                  <small>
                    {i.sets.filter((s) => s.done).length} записано
                    {i.skipped || i.remainingSkipped ? " · есть пропуск" : ""}
                  </small>
                </span>
                {item?.id === i.id && <Check size={18} />}
              </button>
              <div className="session-order-actions">
                <button
                  className="icon-button"
                  aria-label={`Выше: ${i.exercise.name}`}
                  disabled={n === 0}
                  onClick={() => move(i.id, -1)}
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Ниже: ${i.exercise.name}`}
                  disabled={n === session.items.length - 1}
                  onClick={() => move(i.id, 1)}
                >
                  <ArrowDown size={17} />
                </button>
              </div>
            </div>
          ))}
        </Modal>
      )}
      {menu && (
        <Modal title="Управление занятием" onClose={() => setMenu(false)}>
          <button
            className="choose-row"
            onClick={() => {
              change((s) => {
                const a = s.sessions.find((s) => s.id === id)!;
                if (a.pausedAt) {
                  a.pausedMs += Date.now() - a.pausedAt;
                  a.pausedAt = null;
                } else a.pausedAt = Date.now();
              });
              setMenu(false);
            }}
          >
            {session.pausedAt ? <Play size={18} /> : <Pause size={18} />}
            <span>{session.pausedAt ? "Продолжить" : "Пауза"}</span>
          </button>
          <button
            className="choose-row"
            onClick={() => {
              setMenu(false);
              setFinish(true);
            }}
          >
            <Check size={18} />
            Завершить тренировку
          </button>
          <button
            className="choose-row danger-text"
            onClick={() => {
              setMenu(false);
              setCancel(true);
            }}
          >
            Отменить тренировку
          </button>
        </Modal>
      )}
      {finish && (
        <Modal title="Завершим тренировку?" onClose={() => setFinish(false)}>
          <h2>{done} выполненных подходов</h2>
          <p>
            {clock(elapsed(session, now))} · упражнений с результатами:{" "}
            {
              session.items.filter(
                (i) => i.sets.some((s) => s.done) && !i.skipped,
              ).length
            }
            . Учтём только записанные подходы.
          </p>
          <label>
            Заметка к занятию
            <textarea
              value={session.note}
              rows={2}
              onChange={(e) =>
                change((s) => {
                  s.sessions.find((s) => s.id === id)!.note = e.target.value;
                })
              }
            />
          </label>
          <button className="button primary full" onClick={finishSession}>
            Завершить и сохранить
          </button>
        </Modal>
      )}
      {cancel && (
        <Modal title="Отменить тренировку?" onClose={() => setCancel(false)}>
          <p>Запись останется отменённой и не увеличит статистику.</p>
          <button
            className="button danger full"
            onClick={() => {
              change((s) => {
                const a = s.sessions.find((s) => s.id === id)!;
                a.status = "cancelled";
                a.endedAt = Date.now();
                for (const i of a.items) i.restEnd = null;
                s.restEnd = null;
                s.restItemId = undefined;
                s.effort = null;
              });
              onBack();
            }}
          >
            Подтвердить отмену
          </button>
        </Modal>
      )}
      {edited && item && (
        <Modal
          title={`Подход ${editIndex + 1}`}
          onClose={() => setEditing(undefined)}
        >
          <div className="exercise-plan-fields">
            {item.exercise.measure === "weight" && (
              <label>
                Вес, кг
                <NumberInput
                  label={`Вес подхода ${editIndex + 1}`}
                  value={edited.weight}
                  onChange={(weight) =>
                    editItem((i) => {
                      i.sets.find((s) => s.id === edited.id)!.weight = weight;
                    })
                  }
                />
              </label>
            )}
            {["time", "cardio"].includes(item.exercise.measure) ? (
              <label>
                Секунды
                <NumberInput
                  integer
                  label={`Секунды подхода ${editIndex + 1}`}
                  value={edited.seconds}
                  onChange={(seconds) =>
                    editItem((i) => {
                      i.sets.find((s) => s.id === edited.id)!.seconds = seconds;
                    })
                  }
                />
              </label>
            ) : (
              <label>
                Повторы
                <NumberInput
                  integer
                  label={`Повторы подхода ${editIndex + 1}`}
                  value={edited.reps}
                  onChange={(reps) =>
                    editItem((i) => {
                      i.sets.find((s) => s.id === edited.id)!.reps = reps;
                    })
                  }
                />
              </label>
            )}
            {item.exercise.measure === "cardio" && (
              <label>
                Км
                <NumberInput
                  label={`Дистанция подхода ${editIndex + 1}`}
                  value={edited.distance}
                  onChange={(distance) =>
                    editItem((i) => {
                      i.sets.find((s) => s.id === edited.id)!.distance =
                        distance;
                    })
                  }
                />
              </label>
            )}
          </div>
          <label>
            Комментарий
            <input
              aria-label="Комментарий к подходу"
              value={edited.note}
              onChange={(e) =>
                editItem((i) => {
                  i.sets.find((s) => s.id === edited.id)!.note = e.target.value;
                })
              }
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={edited.warmup}
              onChange={(e) =>
                editItem((i) => {
                  i.sets.find((s) => s.id === edited.id)!.warmup =
                    e.target.checked;
                })
              }
            />
            Разминка
          </label>
          <button
            className="button primary full"
            onClick={() => setEditing(undefined)}
          >
            Готово
          </button>
        </Modal>
      )}
    </div>
  );
}
