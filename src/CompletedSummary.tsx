import { useState } from "react";
import { useStore } from "./store";
import { clock, elapsed, num, stats, templateFromSession } from "./model";
import { Modal } from "./ui";
import { newRecords } from "./Progress";
export function CompletedSummary({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { state, change, toast } = useStore();
  const session = state.sessions.find((s) => s.id === id)!;
  const totals = stats([session]);
  const [name, setName] = useState(session.name),
    [saved, setSaved] = useState(false);
  const records = newRecords(session, state.sessions);
  return (
    <Modal title="Тренировка сохранена" onClose={onClose}>
      <h2>Результаты занятия</h2>
      <p>
        {session.date} · {clock(elapsed(session))}
      </p>
      <div className="summary-grid">
        <span>
          <b>
            {
              session.items.filter(
                (i) => !i.skipped && i.sets.some((s) => s.done),
              ).length
            }
          </b>
          упражнений
        </span>
        <span>
          <b>{totals.sets}</b>подходов
        </span>
        <span>
          <b>{totals.reps}</b>повторений
        </span>
      </div>
      <p className="muted">
        Внешний объём: {num(totals.volume)} кг·повт. Неуточнённый вес гантелей и
        вес помощи не включены.
      </p>
      {records.length > 0 && (
        <div className="notice">
          <b>Личные рекорды по сопоставимому показателю</b>
          <p>{records.join(" · ")}</p>
        </div>
      )}
      {session.note && <p>{session.note}</p>}
      <label className="save-template-name">
        Название нового шаблона
        <input
          aria-label="Название нового шаблона"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button
        className="button secondary full"
        disabled={saved || !name.trim() || !session.items.length}
        onClick={() => {
          change((s) =>
            s.templates.push(templateFromSession(session, name.trim())),
          );
          setSaved(true);
          toast("Состав сохранён как новый шаблон");
        }}
      >
        {saved ? "Новый шаблон сохранён" : "Сохранить как новый шаблон"}
      </button>
      {state.templates.some((t) => t.id === session.templateId) && (
        <button
          className="text-button"
          onClick={() => {
            if (
              !confirm(
                "Обновить исходный шаблон составом и результатами этого занятия?",
              )
            )
              return;
            change((s) => {
              const t = s.templates.find((t) => t.id === session.templateId)!;
              const copy = templateFromSession(session);
              t.items = copy.items;
              t.note = copy.note;
            });
            toast("Шаблон обновлён отдельно от истории");
          }}
        >
          Отдельно обновить исходный шаблон
        </button>
      )}
      <button className="button primary full" onClick={onClose}>
        Посмотреть результаты
      </button>
    </Modal>
  );
}
