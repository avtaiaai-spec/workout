import { useMemo, useState } from "react";
import {
  BarChart3,
  Clock3,
  Dumbbell,
  ArrowUpRight,
  Activity,
  Trophy,
} from "lucide-react";
import { useStore } from "./store";
import {
  Exercise,
  Session,
  accountingLabels,
  Accounting,
  completedSets,
  externalVolume,
  stats,
  num,
  elapsed,
  localDate,
  monday,
  shiftDate,
} from "./model";
import { Empty } from "./ui";
export function Chart({
  points,
  unit,
}: {
  points: { date: string; value: number }[];
  unit: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) =>
    points.length < 2 ? 300 : 36 + (i * 528) / (points.length - 1);
  const y = (n: number) => 155 - (n / max) * 120;
  return (
    <>
      <div className="chart">
        <svg viewBox="0 0 600 196" role="img" aria-label={`График: ${unit}`}>
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity=".18" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[35, 75, 115, 155].map((y) => (
            <path
              key={y}
              d={`M30 ${y}H570`}
              stroke="var(--border)"
              strokeDasharray="4 5"
            />
          ))}
          {points.length > 0 && (
            <>
              <path
                d={`M${x(0)} 155 ${points.map((p, i) => `L${x(i)} ${y(p.value)}`).join(" ")} L${x(points.length - 1)} 155Z`}
                fill="url(#chart-fill)"
              />
              <path
                d={points
                  .map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.value)}`)
                  .join(" ")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
              />
              {points.map((p, i) => (
                <g key={p.date + i}>
                  <circle
                    cx={x(i)}
                    cy={y(p.value)}
                    r="17"
                    fill="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.date}: ${num(p.value)} ${unit}`}
                    onClick={() => setSelected(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(i);
                    }}
                  />
                  <circle
                    cx={x(i)}
                    cy={y(p.value)}
                    r={selected === i ? 6 : 4}
                    fill="var(--accent)"
                    pointerEvents="none"
                  />
                </g>
              ))}
            </>
          )}
          <text x="30" y="187">
            {points[0]?.date}
          </text>
          <text x="570" textAnchor="end" y="187">
            {points.at(-1)?.date}
          </text>
        </svg>
      </div>
      <div className="chart-value" aria-live="polite">
        {selected !== null && points[selected]
          ? `${points[selected].date} · ${num(points[selected].value)} ${unit}`
          : "Нажмите на точку, чтобы посмотреть результат"}
      </div>
      <details>
        <summary>Таблица данных</summary>
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>{unit}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}>
                <td>{p.date}</td>
                <td>{num(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
export function ExerciseProgress({ exercise }: { exercise: Exercise }) {
  const { state } = useStore();
  const all = completedSets(state.sessions).filter(
    (r) => r.item.exercise.id === exercise.id && !r.set.warmup,
  );
  const accounts = [...new Set(all.map((r) => r.item.accounting))];
  const [account, setAccount] = useState<Accounting>(
    accounts[0] ?? exercise.accounting,
  );
  const [metric, setMetric] = useState("max");
  const [weight, setWeight] = useState("");
  const rows = all.filter((r) => r.item.accounting === account);
  const sessions = [
    ...new Map(rows.map((r) => [r.session.id, r.session])).values(),
  ].sort((a, b) => a.startedAt - b.startedAt);
  const time = ["time", "cardio"].includes(exercise.measure);
  const points = sessions.map((s) => {
    const rr = rows.filter((r) => r.session.id === s.id);
    return {
      date: s.date,
      value:
        metric === "sets"
          ? rr.length
          : metric === "volume"
            ? rr.reduce((n, r) => n + externalVolume(r.item, r.set), 0)
            : metric === "distance"
              ? rr.reduce((n, r) => n + r.set.distance, 0)
              : metric === "reps"
                ? Math.max(
                    0,
                    ...rr
                      .filter(
                        (r) =>
                          !weight ||
                          r.set.weight === Number(weight.replace(",", ".")),
                      )
                      .map((r) => r.set.reps),
                  )
                : time
                  ? Math.max(...rr.map((r) => r.set.seconds))
                  : account === "assistance"
                    ? Math.min(...rr.map((r) => r.set.weight))
                    : Math.max(...rr.map((r) => r.set.weight)),
    };
  });
  const unit =
    metric === "sets"
      ? "подходы"
      : metric === "volume"
        ? "кг·повт."
        : metric === "distance"
          ? "км"
          : metric === "reps"
            ? "повторения"
            : time
              ? "секунды"
              : account === "assistance"
                ? "кг помощи (меньше — лучше)"
                : "кг";
  return !rows.length ? (
    <Empty title="Первый результат — впереди" icon={<Activity />}>
      <p>
        Завершите занятие и отметьте подходы. Разминка не включается в рекорды.
      </p>
    </Empty>
  ) : (
    <>
      <div className="form-row">
        <label>
          Способ учёта
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value as Accounting)}
          >
            {accounts.map((a) => (
              <option key={a} value={a}>
                {accountingLabels[a]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Показатель
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="max">
              {time
                ? "Максимальная длительность"
                : account === "assistance"
                  ? "Минимальная помощь"
                  : "Максимальный рабочий вес"}
            </option>
            <option value="sets">Количество подходов</option>
            {!time && <option value="reps">Повторения при весе</option>}
            {exercise.measure === "weight" && (
              <option value="volume">Внешний объём</option>
            )}
            {exercise.measure === "cardio" && (
              <option value="distance">Дистанция</option>
            )}
          </select>
        </label>
      </div>
      {metric === "reps" && (
        <label>
          Вес для сравнения, кг
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Любой вес"
          />
        </label>
      )}
      <Chart points={points} unit={unit} />
      <div className="notice">
        <Trophy size={18} />
        <p>
          {account === "assistance"
            ? "Помощь не считается поднятым весом. Сравнивайте её при сопоставимых повторениях."
            : `Лучший результат: ${num(Math.max(...points.map((p) => p.value)))} ${unit}.`}
          {points.length > 1 &&
            ` Предыдущее занятие: ${num(points.at(-2)!.value)} ${unit}; изменение ${num(points.at(-1)!.value - points.at(-2)!.value)} ${unit}.`}
        </p>
      </div>
      {account === "unknown" && (
        <p className="muted">
          Объём не рассчитывается до уточнения учёта гантелей.
        </p>
      )}
      <small>
        Разные способы учёта отображаются отдельно. Разминочные подходы
        исключены.
      </small>
    </>
  );
}
export function Progress({
  onSession,
  onExercise,
}: {
  onSession: (id: string) => void;
  onExercise: (e: Exercise) => void;
}) {
  const { state } = useStore();
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState(shiftDate(localDate(), -30));
  const [to, setTo] = useState(localDate());
  const now = localDate();
  const start =
    period === "week"
      ? monday()
      : period === "month"
        ? now.slice(0, 7) + "-01"
        : period === "quarter"
          ? `${now.slice(0, 4)}-${String(Math.floor(new Date().getMonth() / 3) * 3 + 1).padStart(2, "0")}-01`
          : period === "year"
            ? now.slice(0, 4) + "-01-01"
            : from;
  const end = period === "custom" ? to : now;
  const sessions = state.sessions
    .filter((s) => s.status === "completed" && s.date >= start && s.date <= end)
    .sort((a, b) => b.startedAt - a.startedAt);
  const totals = stats(sessions);
  const rows = completedSets(sessions);
  const groups = useMemo(
    () =>
      Object.entries(
        rows.reduce<Record<string, number>>((a, r) => {
          a[r.item.exercise.category] = (a[r.item.exercise.category] ?? 0) + 1;
          return a;
        }, {}),
      ),
    [sessions.map((s) => s.id).join(), totals.sets],
  );
  const exercises = [
    ...new Map(rows.map((r) => [r.item.exercise.id, r.item.exercise])).values(),
  ];
  const points = [...new Set(sessions.map((s) => s.date))]
    .sort()
    .map((date) => ({
      date,
      value: sessions.filter((s) => s.date === date).length,
    }));
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">КАЖДЫЙ ПОДХОД ИМЕЕТ ЗНАЧЕНИЕ</span>
          <h1>Ваш прогресс</h1>
          <p>Маленькие шаги. Настоящие изменения.</p>
        </div>
        <select
          aria-label="Период статистики"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="week">Эта неделя</option>
          <option value="month">Этот месяц</option>
          <option value="quarter">Этот квартал</option>
          <option value="year">Этот год</option>
          <option value="custom">Свой период</option>
        </select>
      </div>
      {period === "custom" && (
        <div className="form-row">
          <label>
            С
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            По
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      )}
      <a href="#body" className="body-shortcut panel">
        <span>
          <strong>Вес и обхваты тела</strong>
          <small>Открыть замеры и динамику</small>
        </span>
        <ArrowUpRight size={22} />
      </a>
      <div className="stat-grid">
        <Stat label="Тренировок" value={totals.count} icon={<Dumbbell />} />
        <Stat
          label="Общее время"
          value={`${Math.round(totals.time / 60000)} мин`}
          icon={<Clock3 />}
        />
        <Stat label="Подходов" value={totals.sets} icon={<BarChart3 />} />
        <Stat label="Повторений" value={totals.reps} icon={<Activity />} />
      </div>
      {!sessions.length ? (
        <Empty title="Здесь будет ваша история" icon={<BarChart3 />}>
          <p>
            Начните и завершите первую тренировку.
            <br />
            Шаблоны и планы не влияют на статистику.
          </p>
        </Empty>
      ) : (
        <>
          <div className="dashboard-grid">
            <section className="panel">
              <h3>Ритм тренировок</h3>
              <Chart points={points} unit="тренировок" />
            </section>
            <section className="panel">
              <h3>Баланс нагрузки</h3>
              <p className="muted">
                По основной мышечной группе, без удвоения.
              </p>
              {groups.map(([name, n]) => (
                <div className="muscle-row" key={name}>
                  <span>{name}</span>
                  <b>{n}</b>
                  <div>
                    <i style={{ width: `${(n / totals.sets) * 100}%` }} />
                  </div>
                </div>
              ))}
            </section>
          </div>
          <div className="inline-stats">
            Средняя длительность:{" "}
            {Math.round(totals.time / totals.count / 60000)} мин · Учтённый
            объём: {num(totals.volume)} кг·повт.
          </div>
          <h2>По упражнениям</h2>
          <div className="exercise-links">
            {exercises.map((e) => (
              <button
                className="list-row"
                key={e.id}
                onClick={() => onExercise(e)}
              >
                {e.name}
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          <h2>История занятий</h2>
          <div className="history-list">
            {sessions.map((s) => (
              <button
                className="list-row"
                key={s.id}
                onClick={() => onSession(s.id)}
              >
                <span>
                  <small>
                    {new Date(s.date + "T12:00:00").toLocaleDateString(
                      "ru-RU",
                      { day: "numeric", month: "long" },
                    )}
                  </small>
                  <b>{s.name}</b>
                </span>
                <span>
                  {stats([s]).sets} подходов · {Math.round(elapsed(s) / 60000)}{" "}
                  мин
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
export function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <small>{label}</small>
    </div>
  );
}
export function newRecords(session: Session, history: Session[]) {
  const before = completedSets(
    history.filter(
      (s) => s.id !== session.id && s.startedAt < session.startedAt,
    ),
  );
  return session.items
    .filter((item) => {
      const done = item.sets.filter((s) => s.done && !s.warmup);
      if (
        item.skipped ||
        !done.length ||
        item.accounting === "unknown" ||
        item.accounting === "assistance"
      )
        return false;
      const prior = before.filter(
        (r) =>
          r.item.exercise.id === item.exercise.id &&
          r.item.accounting === item.accounting &&
          !r.set.warmup,
      );
      const metric = (s: (typeof done)[number]) =>
        ["time", "cardio"].includes(item.exercise.measure)
          ? s.seconds
          : item.exercise.measure === "reps"
            ? s.reps
            : s.weight;
      return (
        Math.max(...done.map(metric)) >
        Math.max(0, ...prior.map((r) => metric(r.set)))
      );
    })
    .map((i) => i.exercise.name);
}
