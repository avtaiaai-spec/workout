import { useState } from "react";
import { ChevronLeft, ChevronRight, Play, ArrowUpRight } from "lucide-react";
import { useStore } from "./store";
import { Empty } from "./ui";
import { asDate, elapsed, localDate, monday, shiftDate, stats } from "./model";
export function Journal({
  onSession,
  onRepeat,
}: {
  onSession: (id: string) => void;
  onRepeat: (id: string) => void;
}) {
  const { state } = useStore();
  const [view, setView] = useState("list");
  const [anchor, setAnchor] = useState(localDate());
  const [selected, setSelected] = useState<string>();
  const sessions = state.sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => b.startedAt - a.startedAt);
  const days = Array.from({ length: 42 }, (_, i) =>
    shiftDate(monday(anchor.slice(0, 7) + "-01"), i),
  );
  function month(n: number) {
    const d = asDate(anchor.slice(0, 7) + "-01");
    d.setMonth(d.getMonth() + n);
    setAnchor(localDate(d));
    setSelected(undefined);
  }
  const visible = selected
    ? sessions.filter((s) => s.date === selected)
    : sessions;
  return (
    <div className="journal-page">
      <div className="section-heading">
        <div>
          <h1>Журнал</h1>
          <p>Завершённые занятия и все результаты подходов.</p>
        </div>
      </div>
      <div className="segmented journal-view">
        <button
          className={view === "list" ? "active" : ""}
          onClick={() => {
            setView("list");
            setSelected(undefined);
          }}
        >
          Список
        </button>
        <button
          className={view === "calendar" ? "active" : ""}
          onClick={() => setView("calendar")}
        >
          Календарь
        </button>
      </div>
      {view === "calendar" && (
        <section className="calendar-panel">
          <div className="calendar-toolbar">
            <h2>
              {asDate(anchor).toLocaleDateString("ru-RU", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="calendar-arrows">
              <button
                className="icon-button"
                aria-label="Предыдущий месяц"
                onClick={() => month(-1)}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setAnchor(localDate());
                  setSelected(localDate());
                }}
              >
                Сегодня
              </button>
              <button
                className="icon-button"
                aria-label="Следующий месяц"
                onClick={() => month(1)}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <div className="month-grid">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <div className="weekday" key={d}>
                {d}
              </div>
            ))}
            {days.map((date) => (
              <button
                className={`calendar-cell ${date === selected ? "selected" : ""} ${date === localDate() ? "today" : ""} ${date.slice(0, 7) !== anchor.slice(0, 7) ? "outside" : ""}`}
                key={date}
                aria-label={`${date}${sessions.some((s) => s.date === date) ? ", есть завершённые занятия" : ""}`}
                onClick={() => setSelected(date)}
              >
                <span>{asDate(date).getDate()}</span>
                {sessions.some((s) => s.date === date) && (
                  <span
                    className="calendar-mark completed"
                    aria-label="Завершено"
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="legend">
            ✓ Завершённое занятие{" "}
            <a className="text-link" href="#planner">
              Открыть календарь планирования
            </a>
          </div>
        </section>
      )}
      {selected && (
        <div className="section-heading small">
          <h2>
            {asDate(selected).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            })}
          </h2>
          <button
            className="text-button"
            onClick={() => setSelected(undefined)}
          >
            Все даты
          </button>
        </div>
      )}
      {!visible.length ? (
        <Empty title="Завершённых занятий пока нет">
          <p>
            Здесь появятся фактические результаты. Планы и активные занятия не
            считаются завершёнными.
          </p>
        </Empty>
      ) : (
        <div className="history-list">
          {visible.map((s) => (
            <article className="journal-entry" key={s.id}>
              <button className="list-row" onClick={() => onSession(s.id)}>
                <span>
                  <small>
                    {asDate(s.date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </small>
                  <b>{s.name}</b>
                  <small>
                    {stats([s]).sets} подходов ·{" "}
                    {Math.round(elapsed(s) / 60000)} мин
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </button>
              <div className="journal-entry-actions">
                <button
                  className="text-button text-link"
                  onClick={() => onRepeat(s.id)}
                >
                  <Play size={16} />
                  Повторить тренировку
                </button>
                {s.occurrenceId && (
                  <a
                    className="text-button"
                    href={`#planner/${s.occurrenceId.slice(-10)}`}
                  >
                    Исходный план
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
