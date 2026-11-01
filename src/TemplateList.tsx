import { useState } from "react";
import {
  Plus,
  Play,
  Copy,
  Archive,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { useStore } from "./store";
import { addPersonalTemplates } from "./catalog";
import { uid } from "./model";
export function TemplateList({
  onNew,
  onEdit,
  onStart,
  onPlan,
  selectedId,
}: {
  selectedId?: string;
  onNew: () => void;
  onEdit: (id: string) => void;
  onStart: (id: string) => void;
  onPlan: (id: string) => void;
}) {
  const { state, change, toast } = useStore();
  const [archived, setArchived] = useState(false);
  const templates = state.templates.filter((t) => t.archived === archived);
  return (
    <section className="saved-plans" aria-labelledby="saved-plans-title">
      <div className="section-heading small">
        <h2 id="saved-plans-title">Мои тренировки</h2>
        <button className="text-button text-link" onClick={onNew}>
          Создать <Plus size={16} />
        </button>
      </div>
      <div className="template-grid">
        {templates.map((t, index) => (
          <details
            className={`template-card ${t.id === selectedId ? "selected" : ""}`}
            key={t.id}
          >
            <summary>
              <span className="row-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="template-summary-copy">
                <strong>{t.name}</strong>
                <small>
                  {t.items.length} упражнений{t.draft ? " · черновик" : ""}
                </small>
              </span>
              <ChevronDown size={18} />
            </summary>
            <div className="template-body">
              <ol className="template-composition">
                {t.items.map((i) => (
                  <li key={i.id}>
                    {i.exercise.name}
                    <small>{i.sets.length} подходов</small>
                  </li>
                ))}
              </ol>
              {!t.items.length && (
                <p className="muted">Добавьте упражнения в редакторе.</p>
              )}
              <div className="template-main-actions">
                <button
                  className="button primary"
                  disabled={!t.items.length}
                  onClick={() => onStart(t.id)}
                >
                  <Play size={16} />
                  Начать
                </button>
                <button
                  className="button secondary"
                  onClick={() => onEdit(t.id)}
                >
                  {t.draft ? "Продолжить создание" : "Изменить"}
                </button>
              </div>
              <div className="template-tools">
                <button
                  className="text-button text-link"
                  onClick={() => onPlan(t.id)}
                >
                  <CalendarDays size={16} />
                  Назначить
                </button>
                <button
                  className="icon-button"
                  aria-label={`Дублировать ${t.name}`}
                  onClick={() => {
                    const copy = structuredClone(t);
                    copy.id = uid();
                    copy.name += " — копия";
                    change((s) => s.templates.push(copy));
                    toast("Копия создана");
                  }}
                >
                  <Copy size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={archived ? "Вернуть из архива" : "В архив"}
                  onClick={() =>
                    change((s) => {
                      const found = s.templates.find((x) => x.id === t.id);
                      if (found) found.archived = !t.archived;
                    })
                  }
                >
                  <Archive size={17} />
                </button>
              </div>
            </div>
          </details>
        ))}
      </div>
      {!templates.length && (
        <p className="plan-empty">
          {archived
            ? "Архив пуст."
            : "Соберите свою тренировку из упражнений каталога."}
        </p>
      )}
      <div className="plan-list-links">
        <button className="text-button" onClick={() => setArchived(!archived)}>
          {archived ? "Активные тренировки" : "Архив"}
        </button>
        <a href="#catalog" className="text-button text-link">
          Все упражнения
        </a>
      </div>
      {!state.seeded.includes("personal-v1") &&
        !state.templates.some((t) =>
          t.id.startsWith("personal-template-v1-"),
        ) && (
          <button
            className="text-button text-link preset-button"
            onClick={() => {
              change(addPersonalTemplates);
              toast("Три готовые тренировки добавлены. Их можно изменить.");
            }}
          >
            <Plus size={16} />
            Добавить мои три готовые тренировки
          </button>
        )}
    </section>
  );
}
