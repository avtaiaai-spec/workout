import { useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Play,
  X,
  MoveRight,
  Pencil,
} from "lucide-react";
import { useStore } from "./store";
import { Modal, Empty } from "./ui";
import {
  Occurrence,
  Rule,
  asDate,
  localDate,
  monday,
  occurrences,
  shiftDate,
  uid,
} from "./model";
export const statusSymbols: Record<string, string> = {
  planned: "○",
  active: "▸",
  completed: "✓",
  missed: "—",
  cancelled: "×",
};
export const statusLabels = {
  planned: "Запланировано",
  active: "Идёт сейчас",
  completed: "Завершено",
  missed: "Пропущено",
  cancelled: "Отменено",
};
export function ScheduleForm({
  templateId,
  onClose,
  initialDate = localDate(),
  rule,
}: {
  templateId?: string;
  onClose: () => void;
  initialDate?: string;
  rule?: Rule;
}) {
  const { state, change, toast } = useStore();
  const [selected, setSelected] = useState(
    templateId ??
      rule?.templateId ??
      state.templates.find((t) => !t.archived)?.id ??
      "",
  );
  const [date, setDate] = useState(initialDate);
  const [weekly, setWeekly] = useState(rule ? !rule.once : false);
  const [days, setDays] = useState<number[]>(rule?.weekdays ?? []);
  const [error, setError] = useState("");
  return (
    <Modal
      title={rule ? "Изменить серию" : "Добавить в расписание"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!selected || !date || (weekly && !days.length)) {
            setError("Выберите тренировку, дату и дни повторения");
            return;
          }
          if (date < localDate()) {
            setError("Для расписания выберите сегодняшнюю или будущую дату");
            return;
          }
          change((s) => {
            if (rule) {
              const existing = s.rules.find((r) => r.id === rule.id)!;
              existing.end = shiftDate(date, -1);
            }
            s.rules.push({
              id: uid(),
              templateId: selected,
              start: date,
              once: !weekly,
              weekdays: weekly ? days : [],
            });
          });
          toast("Расписание сохранено");
          onClose();
        }}
      >
        <label>
          Тренировка
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="" disabled>
              Выберите тренировку
            </option>
            {state.templates
              .filter((t) => !t.archived)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          {rule ? "Применить изменения начиная с" : "Дата начала"}
          <input
            type="date"
            required
            value={date}
            min={localDate()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={weekly}
            onChange={(e) => setWeekly(e.target.checked)}
          />
          Повторять каждую неделю
        </label>
        {weekly && (
          <div className="weekday-picker">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d, i) => {
              const n = (i + 1) % 7;
              return (
                <button
                  key={d}
                  type="button"
                  className={days.includes(n) ? "selected" : ""}
                  aria-pressed={days.includes(n)}
                  onClick={() =>
                    setDays(
                      days.includes(n)
                        ? days.filter((v) => v !== n)
                        : [...days, n],
                    )
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
        )}
        <p className="muted">
          {rule
            ? "Предыдущие даты и результаты сохранятся. Изменения серии действуют только с выбранной даты."
            : "Вы сами выбираете дни. Можно назначить несколько тренировок на одну дату."}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full">
          <CalendarDays size={18} />
          Сохранить расписание
        </button>
      </form>
    </Modal>
  );
}
export function Calendar({
  onPlan,
  onStart,
  onSession,
  initialDate,
}: {
  initialDate?: string;
  onPlan: (date: string) => void;
  onStart: (id: string, occurrence?: string) => void;
  onSession: (id: string) => void;
}) {
  const { state, change } = useStore();
  const initial =
    initialDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(initialDate) &&
    !Number.isNaN(asDate(initialDate).valueOf())
      ? initialDate
      : localDate();
  const [date, setDate] = useState(initial);
  const [anchor, setAnchor] = useState(initial);
  const [mode, setMode] = useState("month");
  const [moving, setMoving] = useState<Occurrence>();
  const [moveDate, setMoveDate] = useState(localDate());
  const [editRule, setEditRule] = useState<Rule>();
  const [cancel, setCancel] = useState<Occurrence>();
  const first = anchor.slice(0, 7) + "-01";
  const start = mode === "month" ? monday(first) : monday(anchor);
  const days = Array.from({ length: mode === "month" ? 42 : 7 }, (_, i) =>
    shiftDate(start, i),
  );
  const occ = occurrences(state, days[0], days.at(-1)!);
  const forDate = occurrences(state, date, date);
  const free = state.sessions.filter(
    (s) =>
      s.date === date &&
      !forDate.some((o) => o.session?.id === s.id) &&
      s.status !== "cancelled",
  );
  function navigate(n: number) {
    const d = asDate(anchor);
    if (mode === "month") {
      d.setDate(1);
      d.setMonth(d.getMonth() + n);
    } else d.setDate(d.getDate() + 7 * n);
    setAnchor(localDate(d));
  }
  return (
    <>
      <a className="back-button" href={`#plan/${date}`}>
        <ChevronLeft size={18} />К плану
      </a>
      <div className="section-heading">
        <div>
          <h1>Планирование</h1>
          <p>Назначение и перенос занятий.</p>
        </div>
        <button className="button primary" onClick={() => onPlan(date)}>
          <Plus size={18} />
          Запланировать
        </button>
      </div>
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <h2>
            {asDate(anchor).toLocaleDateString("ru-RU", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="segmented">
            <button
              className={mode === "month" ? "active" : ""}
              onClick={() => setMode("month")}
            >
              Месяц
            </button>
            <button
              className={mode === "week" ? "active" : ""}
              onClick={() => setMode("week")}
            >
              Неделя
            </button>
          </div>
          <div className="calendar-arrows">
            <button
              className="icon-button"
              aria-label="Предыдущий период"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              className="text-button"
              onClick={() => {
                setAnchor(localDate());
                setDate(localDate());
              }}
            >
              Сегодня
            </button>
            <button
              className="icon-button"
              aria-label="Следующий период"
              onClick={() => navigate(1)}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
        <div className="month-grid">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dayOcc = occ.filter((o) => o.date === day);
            const sessions = state.sessions.filter(
              (s) =>
                s.date === day &&
                !occ.some((o) => o.date === day && o.session?.id === s.id) &&
                s.status !== "cancelled",
            );
            return (
              <button
                key={day}
                className={`calendar-cell ${day === date ? "selected" : ""} ${day === localDate() ? "today" : ""} ${day.slice(0, 7) !== anchor.slice(0, 7) ? "outside" : ""}`}
                aria-label={day}
                aria-describedby={`status-${day}`}
                aria-current={day === localDate() ? "date" : undefined}
                onClick={() => setDate(day)}
              >
                <span>{asDate(day).getDate()}</span>
                <div className="calendar-dots" id={`status-${day}`}>
                  {dayOcc.map((o) => (
                    <span
                      className={`calendar-mark ${o.status}`}
                      aria-label={statusLabels[o.status]}
                      title={statusLabels[o.status]}
                      key={o.id}
                    >
                      {statusSymbols[o.status]}
                    </span>
                  ))}
                  {sessions.map((s) => (
                    <span
                      className={`calendar-mark ${s.status}`}
                      aria-label={
                        s.status === "active" ? "Идёт сейчас" : "Завершено"
                      }
                      key={s.id}
                    >
                      {s.status === "active" ? "▸" : "✓"}
                    </span>
                  ))}
                </div>
                {dayOcc.slice(0, 2).map((o) => (
                  <small key={o.id}>{statusLabels[o.status]}</small>
                ))}
              </button>
            );
          })}
        </div>
        <div className="legend">
          {Object.entries(statusLabels).map(([key, label]) => (
            <span key={key}>
              <span className={`calendar-mark ${key}`} aria-hidden="true">
                {statusSymbols[key]}
              </span>
              {label}
            </span>
          ))}
        </div>
      </section>
      <div className="section-heading small">
        <h2>
          {asDate(date).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            weekday: "long",
          })}
        </h2>
        <button className="text-button" onClick={() => onPlan(date)}>
          <Plus size={17} />
          Добавить
        </button>
      </div>
      {!forDate.length && !free.length && (
        <Empty title="Свободный день" icon={<CalendarDays />}>
          <p>Для отдыха или новых планов — решать вам.</p>
        </Empty>
      )}
      {forDate.map((o) => {
        const t = state.templates.find((t) => t.id === o.templateId);
        return (
          <article className="plan-row" key={o.id}>
            <div className={`plan-icon ${o.status}`}>
              <DumbbellIcon />
            </div>
            <div>
              <span className={`status ${o.status}`}>
                <span aria-hidden="true">{statusSymbols[o.status]} </span>
                {statusLabels[o.status]}
              </span>
              <h3>{o.session?.name ?? t?.name ?? "Тренировка"}</h3>
              <small>{t?.items.length ?? 0} упражнений</small>
            </div>
            <div className="row-actions">
              {o.status === "completed" ? (
                <button
                  className="button secondary"
                  onClick={() => onSession(o.session!.id)}
                >
                  Результаты
                </button>
              ) : o.status === "active" ? (
                <button
                  className="button primary"
                  onClick={() => onSession(o.session!.id)}
                >
                  Продолжить
                </button>
              ) : (
                o.status !== "cancelled" && (
                  <>
                    <button
                      className="icon-button"
                      title="Начать"
                      aria-label={`Начать ${t?.name}`}
                      onClick={() => onStart(o.templateId, o.id)}
                    >
                      <Play size={19} />
                    </button>
                    <button
                      className="icon-button"
                      title="Перенести только это занятие"
                      aria-label="Перенести занятие"
                      onClick={() => {
                        setMoving(o);
                        setMoveDate(o.date);
                      }}
                    >
                      <MoveRight size={19} />
                    </button>
                    <button
                      className="icon-button"
                      title="Отменить занятие"
                      aria-label="Отменить запланированное занятие"
                      onClick={() => setCancel(o)}
                    >
                      <X size={19} />
                    </button>
                  </>
                )
              )}
            </div>
          </article>
        );
      })}
      {free.map((s) => (
        <button className="list-row" key={s.id} onClick={() => onSession(s.id)}>
          <b>{s.name}</b>
          <span>{s.status === "active" ? "Идёт сейчас" : "Завершено"} →</span>
        </button>
      ))}
      <h2>Еженедельное расписание</h2>
      {state.rules
        .filter((r) => !r.once && (!r.end || r.end >= localDate()))
        .map((r) => (
          <div className="list-row" key={r.id}>
            <span>
              <b>{state.templates.find((t) => t.id === r.templateId)?.name}</b>
              <small>
                {r.weekdays
                  .map((n) => ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][n])
                  .join(", ")}{" "}
                · с {r.start}
              </small>
            </span>
            <button
              className="icon-button"
              aria-label="Изменить серию"
              onClick={() => setEditRule(r)}
            >
              <Pencil size={18} />
            </button>
          </div>
        ))}
      {moving && (
        <Modal
          title="Перенести одно занятие"
          onClose={() => setMoving(undefined)}
        >
          <p>Другие даты серии останутся прежними.</p>
          <label>
            Новая дата
            <input
              type="date"
              min={localDate()}
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
            />
          </label>
          <button
            className="button primary full"
            disabled={!moveDate || moveDate < localDate()}
            onClick={() => {
              change((s) => {
                s.exceptions = s.exceptions.filter((e) => e.id !== moving.id);
                s.exceptions.push({
                  id: moving.id,
                  ruleId: moving.ruleId,
                  originalDate: moving.originalDate,
                  date: moveDate,
                  cancelled: false,
                });
              });
              setMoving(undefined);
              setDate(moveDate);
              setAnchor(moveDate);
            }}
          >
            Перенести
          </button>
        </Modal>
      )}
      {cancel && (
        <Modal title="Отменить занятие?" onClose={() => setCancel(undefined)}>
          <p>
            Отменится только занятие {cancel.date}. Остальные планы сохранятся.
          </p>
          <button
            className="button danger full"
            onClick={() => {
              change((s) => {
                s.exceptions = s.exceptions.filter((e) => e.id !== cancel.id);
                s.exceptions.push({
                  id: cancel.id,
                  ruleId: cancel.ruleId,
                  originalDate: cancel.originalDate,
                  date: cancel.date,
                  cancelled: true,
                });
              });
              setCancel(undefined);
            }}
          >
            Отменить занятие
          </button>
        </Modal>
      )}
      {editRule && (
        <ScheduleForm rule={editRule} onClose={() => setEditRule(undefined)} />
      )}
    </>
  );
}
function DumbbellIcon() {
  return <CalendarDays size={21} />;
}

export function MoveOccurrence({
  occurrence,
  onClose,
  onMoved,
}: {
  occurrence: Occurrence;
  onClose: () => void;
  onMoved?: (date: string) => void;
}) {
  const { change } = useStore();
  const [date, setDate] = useState(
    occurrence.date < localDate() ? localDate() : occurrence.date,
  );
  return (
    <Modal title="Перенести одно занятие" onClose={onClose}>
      <p>Остальные даты повторяющейся серии не изменятся.</p>
      <label>
        Новая дата
        <input
          type="date"
          min={localDate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <button
        className="button primary full"
        disabled={!date || date < localDate()}
        onClick={() => {
          change((s) => {
            s.exceptions = s.exceptions.filter((e) => e.id !== occurrence.id);
            s.exceptions.push({
              id: occurrence.id,
              ruleId: occurrence.ruleId,
              originalDate: occurrence.originalDate,
              date,
              cancelled: false,
            });
          });
          onMoved?.(date);
          onClose();
        }}
      >
        Перенести
      </button>
    </Modal>
  );
}
