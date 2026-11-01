import { useState } from "react";
import { CalendarDays, Check, Plus, X } from "lucide-react";
import { useStore } from "./store";
import { localDate, saveWeeklyPlan } from "./model";
const days = [
  { n: 1, name: "Понедельник", short: "Пн" },
  { n: 2, name: "Вторник", short: "Вт" },
  { n: 3, name: "Среда", short: "Ср" },
  { n: 4, name: "Четверг", short: "Чт" },
  { n: 5, name: "Пятница", short: "Пт" },
  { n: 6, name: "Суббота", short: "Сб" },
  { n: 0, name: "Воскресенье", short: "Вс" },
];
export function WeeklyPlanner({ onCreate }: { onCreate: () => void }) {
  const { state, change, toast } = useStore();
  const [open, setOpen] = useState(false);
  const templates = state.templates.filter((t) => !t.archived);
  const initial = () => {
    const values: Record<number, string[]> = {};
    for (const day of state.trainingDays) values[day] = [];
    for (const rule of state.rules.filter(
      (r) => !r.once && (!r.end || r.end >= localDate()),
    ))
      for (const day of rule.weekdays)
        values[day] = [...new Set([...(values[day] ?? []), rule.templateId])];
    return values;
  };
  const [assignments, setAssignments] =
    useState<Record<number, string[]>>(initial);
  const [start, setStart] = useState(localDate());
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  function toggle(day: number) {
    setDirty(true);
    setAssignments((a) => {
      const next = { ...a };
      if (day in next) delete next[day];
      else next[day] = [];
      return next;
    });
  }
  return (
    <section className="panel weekly-planner">
      <div className="section-heading small">
        <div>
          <h2>Расписание</h2>
        </div>
        <button
          className="text-button text-link"
          aria-label={open ? "Свернуть расписание" : "Настроить расписание"}
          aria-expanded={open}
          onClick={() => {
            if (!open && !dirty) setAssignments(initial());
            setOpen(!open);
          }}
        >
          {open ? "Свернуть" : "Настроить"}
        </button>
      </div>
      {!open ? (
        <div className="planner-summary">
          {days.map((d) => (
            <span
              className={d.n in assignments ? "training-day" : ""}
              key={d.n}
            >
              {d.short}
              {d.n in assignments && <Check size={14} />}
            </span>
          ))}
        </div>
      ) : (
        <>
          <p className="muted">
            Выберите дни, затем назначьте свои тренировки. Можно заниматься по
            разному плану каждый день.
          </p>
          <div className="weekday-picker">
            {days.map((d) => (
              <button
                key={d.n}
                type="button"
                aria-label={`Тренируюсь: ${d.name}`}
                aria-pressed={d.n in assignments}
                className={d.n in assignments ? "selected" : ""}
                onClick={() => toggle(d.n)}
              >
                {d.short}
              </button>
            ))}
          </div>
          <div className="planner-days">
            {days
              .filter((d) => d.n in assignments)
              .map((d) => (
                <div className="planner-day" key={d.n}>
                  <h3>{d.name}</h3>
                  {(assignments[d.n].length ? assignments[d.n] : [""]).map(
                    (id, index) => (
                      <div className="planner-assignment" key={index}>
                        <select
                          aria-label={`Тренировка: ${d.name} ${index + 1}`}
                          value={id}
                          onChange={(e) => {
                            setDirty(true);
                            setAssignments((a) => {
                              const list = [...a[d.n]];
                              list[index] = e.target.value;
                              return { ...a, [d.n]: list };
                            });
                          }}
                        >
                          <option value="">Выберите тренировку</option>
                          {templates.map((t) => (
                            <option value={t.id} key={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        {assignments[d.n].length > 1 && (
                          <button
                            className="icon-button"
                            aria-label={`Убрать тренировку: ${d.name} ${index + 1}`}
                            onClick={() => {
                              setDirty(true);
                              setAssignments((a) => ({
                                ...a,
                                [d.n]: a[d.n].filter((_, n) => n !== index),
                              }));
                            }}
                          >
                            <X size={17} />
                          </button>
                        )}
                      </div>
                    ),
                  )}
                  {templates.length > 1 && (
                    <button
                      className="text-button text-link"
                      onClick={() => {
                        setDirty(true);
                        setAssignments((a) => ({
                          ...a,
                          [d.n]: [...(a[d.n].length ? a[d.n] : [""]), ""],
                        }));
                      }}
                    >
                      <Plus size={16} />
                      Ещё тренировка в этот день
                    </button>
                  )}
                  {!templates.length && (
                    <button
                      className="text-button text-link"
                      onClick={onCreate}
                    >
                      Создать первую тренировку
                    </button>
                  )}
                </div>
              ))}
          </div>
          <div className="planner-save">
            <label>
              Повторять каждую неделю начиная с
              <input
                type="date"
                aria-label="Начало недельного расписания"
                min={localDate()}
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <button
              className="button primary"
              disabled={!dirty}
              onClick={() => {
                if (!start || start < localDate()) {
                  setError("Выберите сегодняшнюю или будущую дату");
                  return;
                }
                const clean = Object.fromEntries(
                  Object.entries(assignments).map(([day, ids]) => [
                    day,
                    ids.filter(Boolean),
                  ]),
                );
                change((s) => saveWeeklyPlan(s, clean, start));
                setAssignments(clean);
                setDirty(false);
                setError("");
                setOpen(false);
                toast("Тренировочные дни и расписание сохранены");
              }}
            >
              <CalendarDays size={19} />
              Сохранить расписание
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="muted">
            Занятия и результаты до выбранной даты сохранятся. Разовые даты и
            переносы доступны в календаре.
          </p>
        </>
      )}
    </section>
  );
}
