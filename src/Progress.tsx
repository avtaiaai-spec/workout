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
          {[35, 75, 115, 155].map((y) => (
            <path
              key={y}
              d={`M30 ${y}H570`}
              stroke="var(--border)"
              strokeWidth="1"
            />
          ))}
          {points.length > 0 && (
            <>
              <path
                d={points
                  .map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.value)}`)
                  .join(" ")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
              />
              {points.map((p, i) => (
                <g key={p.date + i}>
                  <circle
                    cx={x(i)}
                    cy={y(p.value)}
                    r="38"
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
export function ExerciseProgress({
  exercise,
  sessions: source,
}: {
  exercise: Exercise;
  sessions?: Session[];
}) {
  const { state } = useStore();
  const all = completedSets(source ?? state.sessions).filter(
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
                  : exercise.measure === "reps"
                    ? Math.max(...rr.map((r) => r.set.reps))
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
              : exercise.measure === "reps"
                ? "повторения"
                : account === "assistance"
                  ? "кг помощи"
                  : "кг";
  const lastSession = [...sessions].sort(
    (a, b) => b.startedAt - a.startedAt,
  )[0];
  const latestRows = rows.filter((r) => r.session.id === lastSession?.id);
  const referenceWeight =
    weight.trim() && Number.isFinite(Number(weight.replace(",", ".")))
      ? Number(weight.replace(",", "."))
      : (latestRows[0]?.set.weight ?? 0);
  const bestReps = Math.max(
    0,
    ...rows
      .filter((r) => r.set.weight === referenceWeight)
      .map((r) => r.set.reps),
  );
  return !rows.length ? (
    <Empty title="Первый результат — впереди" icon={<Activity />}>
      <p>
        Завершите занятие и отметьте рабочие подходы. Разминка не включается в
        рекорды.
      </p>
      <ExerciseHistory
        exercise={exercise}
        sessions={source ?? state.sessions}
      />
    </Empty>
  ) : (
    <>
      <div className="form-row">
        <label>
          Способ учёта
          <select
            value={account}
            onChange={(e) => {
              setAccount(e.target.value as Accounting);
              setMetric("max");
            }}
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
                  : exercise.measure === "reps"
                    ? "Максимум повторений"
                    : "Рабочий вес по датам"}
            </option>
            <option value="sets">Количество подходов</option>
            {exercise.measure === "weight" && (
              <option value="reps">Повторения при выбранном весе</option>
            )}
            {exercise.measure === "weight" &&
              !["unknown", "body", "assistance"].includes(account) && (
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
      <p className="latest-result muted">
        Последнее занятие · {lastSession?.date}:{" "}
        {latestRows
          .slice(0, 8)
          .map((r) =>
            time
              ? `${r.set.seconds} с${exercise.measure === "cardio" ? ` / ${num(r.set.distance)} км` : ""}`
              : exercise.measure === "reps"
                ? `${r.set.reps} повторений`
                : `${num(r.set.weight)} кг × ${r.set.reps}`,
          )
          .join("; ")}
        {latestRows.length > 8 ? "; все подходы в истории ниже" : ""}.
      </p>
      <section className="records-summary">
        <h3>Личные рекорды</h3>
        {time ? (
          <p>
            {Math.max(...rows.map((r) => r.set.seconds))} с
            {exercise.measure === "cardio"
              ? ` · ${num(Math.max(...rows.map((r) => r.set.distance)))} км`
              : ""}
          </p>
        ) : exercise.measure === "reps" ? (
          <p>{Math.max(...rows.map((r) => r.set.reps))} повторений</p>
        ) : ["unknown", "assistance"].includes(account) ? (
          <p className="muted">
            {account === "unknown"
              ? "Уточните способ учёта веса для сопоставимых рекордов."
              : "Вес помощи показан отдельно и не считается поднятым весом."}
          </p>
        ) : (
          <p>
            Рабочий вес: {num(Math.max(...rows.map((r) => r.set.weight)))} кг{" "}
            <span>·</span> Повторы при {num(referenceWeight)} кг: {bestReps}
          </p>
        )}
      </section>
      <Chart points={points} unit={unit} />
      <div className="notice">
        <Trophy size={18} />
        <p>
          {account === "assistance"
            ? "Помощь не считается поднятым весом. Сравнивайте её при сопоставимых повторениях."
            : `Максимум по выбранному показателю: ${num(Math.max(...points.map((p) => p.value)))} ${unit}.`}
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
        Рабочий вес и число повторений — разные показатели. Разные способы учёта
        показаны отдельно; разминка не включена в график и рекорды.
      </small>
      <ExerciseHistory
        exercise={exercise}
        sessions={source ?? state.sessions}
        account={account}
      />
    </>
  );
}
export function ExerciseHistory({
  exercise,
  sessions,
  account,
}: {
  exercise: Exercise;
  sessions: Session[];
  account?: Accounting;
}) {
  const rows = completedSets(sessions)
    .filter(
      (r) =>
        r.item.exercise.id === exercise.id &&
        (!account || r.item.accounting === account),
    )
    .sort((a, b) => b.session.startedAt - a.session.startedAt);
  return (
    <section className="exercise-full-history">
      <h3>Полная история подходов</h3>
      {!rows.length ? (
        <p className="muted">Пока нет выполненных подходов.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Подход</th>
                <th>Результат</th>
                <th>Учёт / заметка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.session.id + r.item.id + r.set.id}>
                  <td>
                    {r.session.date}
                    <small>
                      {r.set.recordedAt
                        ? new Date(r.set.recordedAt).toLocaleTimeString(
                            "ru-RU",
                            { hour: "2-digit", minute: "2-digit" },
                          )
                        : "Время записи не сохранено"}
                    </small>
                  </td>
                  <td>
                    {r.item.sets.indexOf(r.set) + 1}
                    {r.set.side && ` · ${r.set.side}`}
                    {r.set.warmup && " · разминка"}
                  </td>
                  <td>
                    {exercise.measure === "time"
                      ? `${r.set.seconds} с`
                      : exercise.measure === "cardio"
                        ? `${r.set.seconds} с / ${num(r.set.distance)} км`
                        : exercise.measure === "reps"
                          ? `${r.set.reps} повторений`
                          : `${num(r.set.weight)} кг × ${r.set.reps}`}
                  </td>
                  <td>
                    {accountingLabels[r.item.accounting]}
                    {r.set.note && <small>{r.set.note}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(shiftDate(localDate(), -30));
  const [to, setTo] = useState(localDate());
  const allExercises = [
    ...new Map(
      [
        ...state.exercises,
        ...completedSets(state.sessions).map((r) => r.item.exercise),
      ].map((e) => [e.id, e]),
    ).values(),
  ];
  const recent = completedSets(state.sessions).sort(
    (a, b) => b.session.startedAt - a.session.startedAt,
  )[0]?.item.exercise.id;
  const [exerciseId, setExerciseId] = useState(
    recent ?? allExercises[0]?.id ?? "",
  );
  const exercise =
    allExercises.find((e) => e.id === exerciseId) ?? allExercises[0];
  const now = localDate();
  const start =
    period === "week"
      ? monday()
      : period === "month"
        ? shiftDate(now, -30)
        : period === "year"
          ? now.slice(0, 4) + "-01-01"
          : period === "custom"
            ? from
            : "0000-01-01";
  const end = period === "custom" ? to : now;
  const sessions = state.sessions.filter(
    (s) => s.status === "completed" && s.date >= start && s.date <= end,
  );
  const totals = stats(sessions);
  const points = [...new Set(sessions.map((s) => s.date))]
    .sort()
    .map((date) => ({
      date,
      value: sessions.filter((s) => s.date === date).length,
    }));
  return (
    <div className="progress-page">
      <div className="section-heading">
        <div>
          <h1>Прогресс</h1>
          <p>Результаты по упражнениям и регулярность.</p>
        </div>
      </div>
      <div className="progress-filters">
        <label>
          Упражнение
          <select
            aria-label="Упражнение для прогресса"
            value={exercise?.id ?? ""}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {allExercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Период
          <select
            aria-label="Период статистики"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">За всё время</option>
            <option value="week">Эта неделя</option>
            <option value="month">30 дней</option>
            <option value="year">Этот год</option>
            <option value="custom">Свой период</option>
          </select>
        </label>
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
      {exercise && (
        <section className="exercise-progress-main">
          <div className="section-heading small">
            <h2>{exercise.name}</h2>
            <button
              className="text-button text-link"
              onClick={() => onExercise(exercise)}
            >
              Техника и карточка
            </button>
          </div>
          <ExerciseProgress
            key={exercise.id}
            exercise={exercise}
            sessions={sessions}
          />
        </section>
      )}
      <h2 className="section-label">Регулярность</h2>
      <div className="stat-grid">
        <Stat
          label="Завершено занятий"
          value={totals.count}
          icon={<Dumbbell />}
        />
        <Stat
          label="Время"
          value={`${Math.round(totals.time / 60000)} мин`}
          icon={<Clock3 />}
        />
        <Stat
          label="Выполнено подходов"
          value={totals.sets}
          icon={<BarChart3 />}
        />
        <Stat
          label="Дней с занятиями"
          value={new Set(sessions.map((s) => s.date)).size}
          icon={<Activity />}
        />
      </div>
      {sessions.length > 0 && (
        <section className="panel">
          <h3>Занятия по датам</h3>
          <Chart points={points} unit="занятий" />
        </section>
      )}
      <a href="#body" className="body-shortcut">
        <span>
          <strong>Вес и обхваты тела</strong>
          <small>Замеры и динамика</small>
        </span>
        <ArrowUpRight size={20} />
      </a>
      <a href="#journal" className="text-button text-link">
        Открыть журнал занятий
        <ArrowUpRight size={16} />
      </a>
    </div>
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
