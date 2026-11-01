import { useState } from "react";
import {
  Plus,
  Play,
  Check,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Ruler,
} from "lucide-react";
import { useStore } from "./store";
import { WeeklyPlanner } from "./WeeklyPlanner";
import { TemplateList } from "./TemplateList";
import { MoveOccurrence, statusLabels, statusSymbols } from "./Schedule";
import {
  Occurrence,
  localDate,
  monday,
  shiftDate,
  asDate,
  occurrences,
  stats,
} from "./model";
export function Today({
  onNew,
  onChoose,
  onUnplanned,
  onStart,
  onEdit,
  onResume,
  onPlan,
  onCalendar,
  onProgress,
  initialDate,
}: {
  onNew: () => void;
  onChoose: () => void;
  onUnplanned: () => void;
  onStart: (id: string, occurrence?: string) => void;
  onEdit: (id: string) => void;
  onResume: (id: string) => void;
  onPlan: (date: string, templateId?: string) => void;
  onCalendar: (date: string) => void;
  onProgress: () => void;
  initialDate?: string;
}) {
  const { state } = useStore();
  const today = localDate();
  const [selected, setSelected] = useState(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : today,
  );
  const [week, setWeek] = useState(monday(selected));
  const [moving, setMoving] = useState<Occurrence>();
  const active = state.sessions.find((s) => s.status === "active");
  const plans = occurrences(state, selected, selected);
  const totals = stats(
    state.sessions.filter(
      (s) => s.date >= monday() && s.date <= shiftDate(monday(), 6),
    ),
  );
  function navigate(n: number) {
    setWeek(shiftDate(week, n * 7));
    setSelected(shiftDate(selected, n * 7));
  }
  return (
    <div className="today-page plan-page">
      <div className="section-heading today-heading">
        <div>
          <h1>План</h1>
          <p className="date-label">
            {asDate(selected).toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>
      <div className="plan-week-controls">
        <button
          className="icon-button"
          aria-label="Предыдущая неделя"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          className="text-button"
          onClick={() => {
            setSelected(today);
            setWeek(monday());
          }}
        >
          Сегодня
        </button>
        <button
          className="icon-button"
          aria-label="Следующая неделя"
          onClick={() => navigate(1)}
        >
          <ChevronRight size={19} />
        </button>
        <button
          className="text-button calendar-plan-link"
          onClick={() => onCalendar(selected)}
        >
          <CalendarDays size={18} />
          Календарь
        </button>
      </div>
      <section className="week-strip" aria-label="Неделя тренировок">
        {Array.from({ length: 7 }, (_, i) => shiftDate(week, i)).map(
          (date, i) => {
            const dayPlans = occurrences(state, date, date);
            const complete = state.sessions.some(
              (s) => s.date === date && s.status === "completed",
            );
            const planned = dayPlans.some((o) => o.status === "planned");
            return (
              <button
                key={date}
                aria-label={`${asDate(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}${complete ? ", тренировка завершена" : planned ? ", есть план" : ""}`}
                aria-pressed={selected === date}
                aria-current={date === today ? "date" : undefined}
                className={`${selected === date ? "selected" : ""} ${date === today ? "today" : ""}`}
                onClick={() => setSelected(date)}
              >
                <small>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</small>
                <b>{asDate(date).getDate()}</b>
                <span className="day-status" aria-hidden="true">
                  {complete ? (
                    <Check size={12} />
                  ) : planned ? (
                    <i />
                  ) : state.trainingDays.includes(asDate(date).getDay()) ? (
                    "○"
                  ) : null}
                </span>
              </button>
            );
          },
        )}
      </section>
      {active && (
        <section className="today-workout">
          <h2>{active.name}</h2>
          <p>{active.items.length} упражнений · занятие продолжается</p>
          <button
            className="button primary"
            onClick={() => onResume(active.id)}
          >
            <Play size={18} />
            Продолжить тренировку
          </button>
        </section>
      )}
      <div className="day-plans">
        {plans
          .filter((o) => !active || o.session?.id !== active.id)
          .map((o) => {
            const template = state.templates.find((t) => t.id === o.templateId);
            const workout = o.session ?? template;
            return (
              <section className="scheduled-workout" key={o.id}>
                <span className={`status ${o.status}`}>
                  {statusSymbols[o.status]} {statusLabels[o.status]}
                </span>
                <h2>{workout?.name ?? "Тренировка"}</h2>
                <p className="muted">{workout?.items.length ?? 0} упражнений</p>
                <details className="planned-composition">
                  <summary>Состав тренировки</summary>
                  <ol className="template-composition">
                    {workout?.items.map((i) => (
                      <li key={i.id}>{i.exercise.name}</li>
                    ))}
                  </ol>
                </details>
                <div className="scheduled-actions">
                  {o.session ? (
                    <button
                      className={`button ${o.status === "active" ? "primary" : "secondary"}`}
                      onClick={() => onResume(o.session!.id)}
                    >
                      {o.status === "active" ? "Продолжить" : "Результаты"}
                    </button>
                  ) : (
                    o.status !== "cancelled" && (
                      <button
                        className="button primary"
                        onClick={() => onStart(o.templateId, o.id)}
                      >
                        <Play size={16} />
                        Начать
                      </button>
                    )
                  )}
                  {template && (
                    <button
                      className="text-button"
                      onClick={() => onEdit(template.id)}
                    >
                      Изменить
                    </button>
                  )}
                  {!o.session && o.status !== "cancelled" && (
                    <button
                      className="text-button"
                      onClick={() => setMoving(o)}
                    >
                      Перенести
                    </button>
                  )}
                </div>
              </section>
            );
          })}
      </div>
      {!plans.length && !active && (
        <section className="today-workout">
          <h2>День в вашем ритме</h2>
          <p>На этот день тренировка не назначена</p>
          <button className="button primary" onClick={onChoose}>
            <Plus size={18} />
            Выбрать тренировку
          </button>
          <button className="text-button" onClick={onUnplanned}>
            Начать без плана
            <ChevronRight size={16} />
          </button>
        </section>
      )}
      <TemplateList
        selectedId={active?.templateId ?? plans[0]?.templateId}
        onNew={onNew}
        onEdit={onEdit}
        onStart={onStart}
        onPlan={(id) => onPlan(selected, id)}
      />
      <section className="week-summary" aria-label="Статистика за неделю">
        <button className="week-summary-link" onClick={onProgress}>
          <h2>За неделю</h2>
          <ChevronRight size={16} />
        </button>
        <p>
          <strong>{totals.count}</strong> завершено{" "}
          <span aria-hidden="true">·</span>{" "}
          <strong>{Math.round(totals.time / 60000)}</strong> мин тренировок
        </p>
      </section>
      <WeeklyPlanner onCreate={onNew} />
      <div className="home-links">
        <a href="#body">
          <Ruler size={18} />
          <span>Замеры тела</span>
          <ChevronRight size={16} />
        </a>
        <button onClick={() => onPlan(selected)}>
          <CalendarDays size={18} />
          <span>Запланировать занятие</span>
          <Plus size={16} />
        </button>
      </div>
      {moving && (
        <MoveOccurrence
          occurrence={moving}
          onClose={() => setMoving(undefined)}
          onMoved={(date) => {
            setSelected(date);
            setWeek(monday(date));
          }}
        />
      )}
    </div>
  );
}
