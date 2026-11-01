import { useState } from "react";
import {
  Plus,
  Ruler,
  Scale,
  Pencil,
  Trash2,
  Download,
  ArrowUpRight,
} from "lucide-react";
import { useStore } from "./store";
import {
  Measurement,
  MeasurementKey,
  measurementFields,
  measurementSchema,
  localDate,
  shiftDate,
  num,
  uid,
} from "./model";
import { Modal, Empty } from "./ui";
import { Chart } from "./Progress";
import { download } from "./storage";
const common: MeasurementKey[] = ["weight", "waist", "hips", "chest"];
export function Measurements() {
  const { state, change, toast } = useStore();
  const [form, setForm] = useState<Measurement | "new">();
  const [deleting, setDeleting] = useState<Measurement>();
  const [metric, setMetric] = useState<MeasurementKey>("weight");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(shiftDate(localDate(), -90));
  const [to, setTo] = useState(localDate());
  const start =
    period === "month"
      ? shiftDate(localDate(), -30)
      : period === "quarter"
        ? shiftDate(localDate(), -90)
        : period === "year"
          ? shiftDate(localDate(), -365)
          : period === "custom"
            ? from
            : "0000-01-01";
  const end = period === "custom" ? to : localDate();
  const records = state.measurements
    .filter((r) => r.date >= start && r.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const metricRows = records.filter((r) => r.values[metric] !== undefined);
  const perDay = [...new Map(metricRows.map((r) => [r.date, r])).values()];
  const points = perDay.map((r) => ({
    date: r.date,
    value: r.values[metric]!,
  }));
  const field = measurementFields[metric];
  const delta =
    points.length > 1 ? points.at(-1)!.value - points[0].value : null;
  function exportCSV() {
    const keys = Object.keys(measurementFields) as MeasurementKey[];
    const q = (v: unknown) => {
      let text = String(v ?? "");
      if (/^[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [
      [
        "Дата",
        ...keys.map(
          (k) => measurementFields[k].label + ", " + measurementFields[k].unit,
        ),
        "Заметка",
      ],
      ...state.measurements
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => [
          r.date,
          ...keys.map((k) =>
            r.values[k] === undefined
              ? ""
              : String(r.values[k]).replace(".", ","),
          ),
          r.note,
        ]),
    ];
    download(
      rows.map((r) => r.map(q).join(";")).join("\r\n"),
      `zamery-${localDate()}.csv`,
      "text/csv;charset=utf-8",
    );
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">НАБЛЮДАЙТЕ ЗА ИЗМЕНЕНИЯМИ</span>
          <h1>Замеры тела</h1>
          <p>Вес и обхваты в одном месте. Без обязательных целей и оценок.</p>
        </div>
        <button className="button primary" onClick={() => setForm("new")}>
          <Plus size={20} />
          Добавить замер
        </button>
      </div>
      <div className="measure-period">
        <label>
          Период
          <select
            aria-label="Период замеров"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Всё время</option>
            <option value="month">Последние 30 дней</option>
            <option value="quarter">Последние 90 дней</option>
            <option value="year">Последний год</option>
            <option value="custom">Свои даты</option>
          </select>
        </label>
        {period === "custom" && (
          <div className="form-row">
            <label>
              С
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              По
              <input
                type="date"
                value={to}
                min={from}
                max={localDate()}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>
      <div className="measurement-stats">
        {(["weight", "waist", "hips"] as const).map((k) => {
          const rows = records.filter((r) => r.values[k] !== undefined);
          const first = rows[0]?.values[k];
          const latest = rows.at(-1);
          const value = latest?.values[k];
          const diff =
            value !== undefined && first !== undefined && rows.length > 1
              ? Math.round((value - first) * 100) / 100
              : null;
          return (
            <article className="stat-card" key={k}>
              <span className="stat-icon">
                {k === "weight" ? <Scale size={22} /> : <Ruler size={22} />}
              </span>
              <small>{measurementFields[k].label}</small>
              <span className="stat-value">
                {value === undefined ? "—" : num(value)}
                <em>{measurementFields[k].unit}</em>
              </span>
              <small>
                {diff === null
                  ? "Появится после записи замеров"
                  : `${diff > 0 ? "+" : ""}${num(diff)} ${measurementFields[k].unit} за период`}
              </small>
              {latest && <small>{latest.date}</small>}
            </article>
          );
        })}
      </div>
      {!state.measurements.length ? (
        <Empty title="Начните с одного замера" icon={<Ruler />}>
          <p>
            Можно записать только вес или обхват талии.
            <br />
            Остальные поля необязательны.
          </p>
          <button
            className="button primary full"
            onClick={() => setForm("new")}
          >
            Записать первый замер
          </button>
        </Empty>
      ) : (
        <>
          <section className="panel measurement-chart">
            <div className="section-heading small">
              <h2>Динамика</h2>
              <select
                aria-label="Показатель замеров"
                value={metric}
                onChange={(e) => setMetric(e.target.value as MeasurementKey)}
              >
                {Object.entries(measurementFields).map(([key, v]) => (
                  <option value={key} key={key}>
                    {v.label}, {v.unit}
                  </option>
                ))}
              </select>
            </div>
            {points.length ? (
              <>
                <div className="measurement-delta">
                  <strong>
                    {num(points.at(-1)!.value)} {field.unit}
                  </strong>
                  <span>
                    {delta === null
                      ? "Одна точка — добавьте следующий замер для сравнения"
                      : `${delta > 0 ? "+" : ""}${num(Math.round(delta * 100) / 100)} ${field.unit} с начала периода`}
                  </span>
                </div>
                <Chart
                  key={metric + period}
                  points={points}
                  unit={field.unit}
                />
              </>
            ) : (
              <Empty title="Нет замеров этого показателя за выбранный период">
                <p>Выберите другой показатель или период.</p>
              </Empty>
            )}
            <p className="muted">
              На графике — последний замер показателя за день. В журнале ниже
              сохранены все записи.
            </p>
          </section>
          <div className="section-heading small measurement-history-heading">
            <h2>История замеров</h2>
            <button className="text-button text-link" onClick={exportCSV}>
              <Download size={17} />
              Экспорт CSV
            </button>
          </div>
          {!records.length && <Empty title="За этот период нет записей" />}
          <div className="measurement-history">
            {records
              .slice()
              .reverse()
              .map((r) => (
                <article className="panel measurement-record" key={r.id}>
                  <header>
                    <h3>
                      {new Date(r.date + "T12:00:00").toLocaleDateString(
                        "ru-RU",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </h3>
                    <div>
                      <button
                        className="icon-button"
                        aria-label={`Изменить замер ${r.date}`}
                        onClick={() => setForm(r)}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        className="icon-button danger-text"
                        aria-label={`Удалить замер ${r.date}`}
                        onClick={() => setDeleting(r)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </header>
                  <dl>
                    {(
                      Object.entries(r.values) as [MeasurementKey, number][]
                    ).map(
                      ([key, value]) =>
                        value !== undefined && (
                          <div key={key}>
                            <dt>{measurementFields[key].label}</dt>
                            <dd>
                              {num(value)} {measurementFields[key].unit}
                            </dd>
                          </div>
                        ),
                    )}
                  </dl>
                  {r.note && <p>{r.note}</p>}
                </article>
              ))}
          </div>
        </>
      )}
      {form && (
        <MeasurementForm
          value={form === "new" ? undefined : form}
          onClose={() => setForm(undefined)}
        />
      )}
      {deleting && (
        <Modal title="Удалить замер?" onClose={() => setDeleting(undefined)}>
          <p>
            Будет удалена только запись за {deleting.date}. Тренировки и
            остальные замеры сохранятся.
          </p>
          <button
            className="button danger full"
            onClick={() => {
              change((s) => {
                s.measurements = s.measurements.filter(
                  (r) => r.id !== deleting.id,
                );
              });
              setDeleting(undefined);
              toast("Замер удалён");
            }}
          >
            Удалить эту запись
          </button>
        </Modal>
      )}
    </>
  );
}
function MeasurementForm({
  value,
  onClose,
}: {
  value?: Measurement;
  onClose: () => void;
}) {
  const { change, toast } = useStore();
  const [date, setDate] = useState(value?.date ?? localDate());
  const [note, setNote] = useState(value?.note ?? "");
  const [fields, setFields] = useState<Partial<Record<MeasurementKey, string>>>(
    value
      ? Object.fromEntries(
          Object.entries(value.values).map(([k, v]) => [
            k,
            String(v).replace(".", ","),
          ]),
        )
      : {},
  );
  const [error, setError] = useState("");
  const input = (key: MeasurementKey) => {
    const f = measurementFields[key];
    return (
      <label key={key}>
        {f.label}, {f.unit}
        <input
          aria-label={`${f.label}, ${f.unit}`}
          inputMode="decimal"
          value={fields[key] ?? ""}
          placeholder="Необязательно"
          onChange={(e) =>
            setFields((values) => ({ ...values, [key]: e.target.value }))
          }
        />
      </label>
    );
  };
  return (
    <Modal title={value ? "Изменить замер" : "Новый замер"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (date > localDate())
              throw Error("Нельзя записать фактический замер на будущую дату");
            const values = Object.fromEntries(
              Object.entries(fields)
                .filter(([, v]) => v?.trim())
                .map(([key, v]) => [key, Number(v!.trim().replace(",", "."))]),
            );
            const record = measurementSchema.parse({
              id: value?.id ?? uid(),
              createdAt: value?.createdAt ?? Date.now(),
              date,
              note,
              values,
            });
            change((s) => {
              const n = s.measurements.findIndex((r) => r.id === record.id);
              if (n >= 0) s.measurements[n] = record;
              else s.measurements.push(record);
            });
            toast("Замер сохранён");
            onClose();
          } catch (err) {
            setError(
              err instanceof Error && err.message.startsWith("Нельзя")
                ? err.message
                : "Укажите хотя бы один замер: положительное число. Можно вводить запятую или точку. Проверьте дату и значения.",
            );
          }
        }}
      >
        <label>
          Дата замера
          <input
            type="date"
            required
            max={localDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="measurement-form-grid">{common.map(input)}</div>
        <details
          open={
            !!value &&
            Object.keys(value.values).some(
              (k) => !common.includes(k as MeasurementKey),
            )
          }
        >
          <summary>Другие обхваты: шея, руки и ноги</summary>
          <div className="measurement-form-grid">
            {(Object.keys(measurementFields) as MeasurementKey[])
              .filter((k) => !common.includes(k))
              .map(input)}
          </div>
        </details>
        <label>
          Заметка
          <textarea
            rows={2}
            value={note}
            placeholder="Например, утром до завтрака"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p className="muted">
          Для удобного сравнения измеряйте в похожих условиях. Все поля, кроме
          даты, необязательны — достаточно одного значения.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full">
          <CheckIcon />
          Сохранить замер
        </button>
      </form>
    </Modal>
  );
}
function CheckIcon() {
  return <Ruler size={19} />;
}
