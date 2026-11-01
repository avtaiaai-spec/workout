import { useState } from "react";
import {
  Plus,
  Play,
  ArrowUpRight,
  Check,
  ChevronRight,
  CalendarDays,
  Clock3,
  Dumbbell,
} from "lucide-react";
import { useStore } from "./store";
import { WeeklyPlanner } from "./WeeklyPlanner";
import { Illustration } from "./Illustration";
import {
  Template,
  localDate,
  monday,
  shiftDate,
  asDate,
  occurrences,
  stats,
} from "./model";
// A UI estimate, never a prescribed duration or a recorded result.
function estimate(t: Template) {
  return Math.ceil(
    t.items.reduce(
      (n, i) =>
        n +
        i.sets.reduce(
          (n, s) =>
            n +
            (["time", "cardio"].includes(i.exercise.measure)
              ? s.seconds
              : s.reps * 3) +
            s.rest,
          0,
        ),
      0,
    ) / 60,
  );
}
export function Today({
  onNew,
  onChoose,
  onStart,
  onEdit,
  onResume,
  onPlan,
  onCalendar,
  onProgress,
}: {
  onNew: () => void;
  onChoose: () => void;
  onStart: (id: string, occurrence?: string) => void;
  onEdit: (id: string) => void;
  onResume: (id: string) => void;
  onPlan: (date: string) => void;
  onCalendar: (date: string) => void;
  onProgress: () => void;
}) {
  const { state } = useStore();
  const today = localDate();
  const [selected, setSelected] = useState(today);
  const week = monday();
  const active = state.sessions.find((s) => s.status === "active");
  const templates = state.templates.filter((t) => !t.archived);
  const plans = occurrences(state, selected, selected).filter(
    (o) => o.status === "planned",
  );
  const scheduled = plans[0];
  const template =
    active ??
    templates.find((t) => t.id === scheduled?.templateId) ??
    templates[0];
  const totals = stats(
    state.sessions.filter(
      (s) => s.date >= week && s.date <= shiftDate(week, 6),
    ),
  );
  const upcoming = occurrences(state, today, shiftDate(today, 28)).filter(
    (o) => o.status === "planned",
  );
  return (
    <>
      <div className="section-heading today-heading">
        <div>
          <span className="eyebrow">МОИ ТРЕНИРОВКИ / ЛИЧНОЕ ПРОСТРАНСТВО</span>
          <h1>Сегодня</h1>
          <p className="date-label">
            {asDate(selected).toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <button className="button secondary" onClick={onNew}>
          <Plus size={20} />
          Новая тренировка
        </button>
      </div>
      <section className="week-panel panel" aria-label="Неделя тренировок">
        <div className="section-heading small">
          <h2>Ваша неделя</h2>
          <button className="text-button" onClick={() => onCalendar(selected)}>
            Открыть календарь <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="week-strip">
          {Array.from({ length: 7 }, (_, i) => shiftDate(week, i)).map(
            (date, i) => {
              const complete = state.sessions.some(
                (s) => s.date === date && s.status === "completed",
              );
              const trainingDay = state.trainingDays.includes(
                asDate(date).getDay(),
              );
              const planned = occurrences(state, date, date).some(
                (o) => o.status === "planned",
              );
              return (
                <button
                  key={date}
                  aria-label={`${asDate(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}${complete ? ", тренировка завершена" : planned ? ", есть план" : trainingDay ? ", тренировочный день" : ""}`}
                  aria-pressed={selected === date}
                  aria-current={date === today ? "date" : undefined}
                  className={`${selected === date ? "selected" : ""} ${date === today ? "today" : ""} ${complete ? "complete" : ""}`}
                  onClick={() => setSelected(date)}
                >
                  <small>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</small>
                  <b>{asDate(date).getDate()}</b>
                  <span>
                    {complete ? (
                      <Check size={16} />
                    ) : planned ? (
                      <i />
                    ) : trainingDay ? (
                      <span aria-hidden="true">○</span>
                    ) : (
                      <em>—</em>
                    )}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>
      <WeeklyPlanner onCreate={onNew} />
      <a className="body-shortcut panel" href="#body">
        <span>
          <strong>Мои замеры</strong>
          <small>Вес, обхваты и динамика</small>
        </span>
        <ArrowUpRight size={22} />
      </a>
      <div className="today-layout">
        <div className="today-main">
          <section className="hero-card">
            <div className="hero-copy">
              <span className="hero-tag">
                <span />
                {active
                  ? "ТРЕНИРОВКА ПРОДОЛЖАЕТСЯ"
                  : scheduled
                    ? "ЗАПЛАНИРОВАНО НА ЭТОТ ДЕНЬ"
                    : "В ВАШЕМ ТЕМПЕ"}
              </span>
              <h2>{template?.name ?? "Создайте свою первую тренировку"}</h2>
              {template ? (
                <div className="workout-meta">
                  <span>
                    <Dumbbell size={17} />
                    {template.items.length} упражнений
                  </span>
                  <span title="Оценка: 3 секунды на повторение плюс заданный отдых. Без времени переходов.">
                    <Clock3 size={17} />~{estimate(template)} мин
                  </span>
                </div>
              ) : (
                <p>Создайте свою первую тренировку.</p>
              )}
              {!active && !scheduled && (
                <p className="hero-hint">
                  {templates.length
                    ? "На этот день планов нет. Можно начать с любимой тренировки."
                    : "Добавьте упражнения, укажите вес, подходы и повторения. Затем выберите тренировочные дни выше."}
                </p>
              )}
              <button
                className="button primary hero-button"
                onClick={() =>
                  active
                    ? onResume(active.id)
                    : scheduled
                      ? onStart(scheduled.templateId, scheduled.id)
                      : template
                        ? onStart(template.id)
                        : onNew()
                }
              >
                <Play size={20} />
                {active
                  ? "Продолжить тренировку"
                  : template
                    ? "Начать тренировку"
                    : "Создать тренировку"}
                <ArrowUpRight size={18} />
              </button>
              {!!templates.length && (
                <button
                  className="hero-secondary text-button"
                  onClick={onChoose}
                >
                  Выбрать другую тренировку <ChevronRight size={17} />
                </button>
              )}
            </div>
            {template?.items[0] && (
              <div className="hero-illustration">
                <Illustration exercise={template.items[0].exercise} small />
                <span>Двигаться. В своём ритме.</span>
              </div>
            )}
          </section>
          {plans.length > 1 && (
            <div className="additional-plans">
              <h3>Ещё на этот день</h3>
              {plans.slice(1).map((o) => (
                <button
                  className="list-row"
                  key={o.id}
                  onClick={() => onStart(o.templateId, o.id)}
                >
                  {templates.find((t) => t.id === o.templateId)?.name}
                  <Play size={18} />
                </button>
              ))}
            </div>
          )}
          <div className="section-heading small">
            <h2>
              Мои тренировки{" "}
              <span className="title-count">{templates.length}</span>
            </h2>
            <a className="text-button text-link" href="#workouts">
              Все <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="home-workouts">
            {templates.slice(0, 3).map((t, i) => (
              <button
                key={t.id}
                className="home-workout"
                onClick={() => onEdit(t.id)}
              >
                <span className={`workout-symbol symbol-${i % 3}`}>
                  <Dumbbell size={23} />
                </span>
                <span>
                  <h3>{t.name}</h3>
                  <p>
                    {t.items.length} упражнений · ~{estimate(t)} мин
                  </p>
                </span>
                <ChevronRight size={19} />
              </button>
            ))}
          </div>
          <section className="panel week-summary">
            <div className="section-heading small">
              <div>
                <span className="eyebrow">ВАШ ПРОГРЕСС</span>
                <h2>За эту неделю</h2>
              </div>
              <button className="text-button text-link" onClick={onProgress}>
                Подробнее <ArrowUpRight size={17} />
              </button>
            </div>
            <div className="weekly-numbers">
              <div>
                <Dumbbell size={22} />
                <b>{totals.count}</b>
                <small>завершено тренировок</small>
              </div>
              <div>
                <Clock3 size={22} />
                <b>
                  {Math.round(totals.time / 60000)}
                  <em> мин</em>
                </b>
                <small>время тренировок</small>
              </div>
            </div>
            {!totals.count && (
              <p>
                Здесь будут ваши результаты. Готовые шаблоны не считаются
                выполненными занятиями.
              </p>
            )}
          </section>
        </div>
        <aside className="today-aside">
          <section className="panel next-plans">
            <div className="section-heading small">
              <h2>Ближайшие планы</h2>
              <CalendarDays size={20} />
            </div>
            {upcoming.length ? (
              upcoming.slice(0, 4).map((o) => (
                <button
                  className="upcoming-plan"
                  key={o.id}
                  onClick={() => onCalendar(o.date)}
                >
                  <span className="plan-date">
                    <b>{asDate(o.date).getDate()}</b>
                    <small>
                      {asDate(o.date).toLocaleDateString("ru-RU", {
                        month: "short",
                      })}
                    </small>
                  </span>
                  <span>
                    <small>
                      {asDate(o.date).toLocaleDateString("ru-RU", {
                        weekday: "long",
                      })}
                    </small>
                    <b>
                      {state.templates.find((t) => t.id === o.templateId)?.name}
                    </b>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))
            ) : (
              <div className="quiet-empty">
                <CalendarDays size={32} />
                <h3>Пока без расписания</h3>
                <p>
                  Выберите удобные дни.
                  <br />
                  Планы можно менять.
                </p>
              </div>
            )}
            <button
              className="button secondary full"
              onClick={() => onPlan(selected)}
            >
              <Plus size={18} />
              Запланировать
            </button>
          </section>
          <div className="studio-note">
            <span>CALM STUDIO</span>
            <p>Регулярность важнее идеальности.</p>
            <small>Сохраняйте свой ритм.</small>
          </div>
        </aside>
      </div>
    </>
  );
}
