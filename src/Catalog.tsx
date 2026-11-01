import { useState } from "react";
import {
  Search,
  Heart,
  Plus,
  Check,
  ArrowUpRight,
  Dumbbell,
} from "lucide-react";
import { useStore } from "./store";
import {
  Exercise,
  categories,
  uid,
  accountingSchema,
  accountingLabels,
  measureSchema,
  completedSets,
  num,
} from "./model";
import { Illustration } from "./Illustration";
import { Modal, Empty } from "./ui";
import { ExerciseProgress } from "./Progress";
export function Catalog({
  onInfo,
  onAdd,
  onCustom,
}: {
  onInfo: (e: Exercise) => void;
  onAdd: (ids: string[]) => void;
  onCustom: () => void;
}) {
  const { state, change } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [equipment, setEquipment] = useState("Все");
  const [favorites, setFavorites] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const recentIds = [
    ...new Set(
      [...state.sessions]
        .sort((a, b) => b.startedAt - a.startedAt)
        .flatMap((s) => s.items.map((i) => i.exercise.id)),
    ),
  ].slice(0, 12);
  const [selected, setSelected] = useState<string[]>([]);
  const visible = state.exercises.filter(
    (e) =>
      (category === "Все" ||
        e.category === category ||
        e.secondary.includes(category)) &&
      (equipment === "Все" || e.equipment === equipment) &&
      (!favorites || state.favorites.includes(e.id)) &&
      (!recentOnly || recentIds.includes(e.id)) &&
      `${e.name} ${e.aliases}`
        .toLowerCase()
        .replaceAll("ё", "е")
        .includes(query.toLowerCase().replaceAll("ё", "е")),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h1>
            Каталог
            <span className="title-count">{state.exercises.length}</span>
          </h1>
        </div>
        <button className="button secondary" onClick={onCustom}>
          <Plus size={18} />
          Своё упражнение
        </button>
      </div>
      <div className="catalog-categories">
        {["Все", ...categories].map((c, i) => (
          <button
            key={c}
            className={`category-card cat-${i % 4} ${category === c ? "selected" : ""}`}
            onClick={() => setCategory(c)}
          >
            <b>{c}</b>
            <small>
              {c === "Все"
                ? state.exercises.length
                : state.exercises.filter((e) => e.category === c).length}{" "}
              упражнений
            </small>
          </button>
        ))}
      </div>
      <div className="filter-bar">
        <label className="search">
          <Search size={19} />
          <input
            placeholder="Название или синоним упражнения"
            aria-label="Поиск упражнений"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Оборудование"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          {["Все", ...new Set(state.exercises.map((e) => e.equipment))].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
        <button
          className={`button ${favorites ? "primary" : "secondary"}`}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart size={17} />
          Избранное
        </button>
      </div>
      <button
        className={`text-button ${recentOnly ? "active-text" : ""}`}
        aria-pressed={recentOnly}
        onClick={() => setRecentOnly(!recentOnly)}
      >
        Недавние
      </button>
      <div className="section-label">
        {category} <span>{visible.length}</span>
      </div>
      <div className="exercise-grid">
        {visible.map((e) => (
          <article className="exercise-card" key={e.id}>
            <button className="exercise-info" onClick={() => onInfo(e)}>
              <Illustration exercise={e} small />
              <span>
                <small>{e.category}</small>
                <h3>{e.name}</h3>
                <em>{e.equipment}</em>
                <span className="text-link">
                  Техника <ArrowUpRight size={14} />
                </span>
              </span>
            </button>
            <div className="exercise-actions">
              <button
                className={`icon-button ${state.favorites.includes(e.id) ? "favorite" : ""}`}
                aria-label={`В избранное: ${e.name}`}
                onClick={() =>
                  change((s) => {
                    s.favorites = s.favorites.includes(e.id)
                      ? s.favorites.filter((id) => id !== e.id)
                      : [...s.favorites, e.id];
                  })
                }
              >
                <Heart
                  size={18}
                  fill={
                    state.favorites.includes(e.id) ? "currentColor" : "none"
                  }
                />
              </button>
              <button
                className={`select-exercise ${selected.includes(e.id) ? "selected" : ""}`}
                aria-label={`Выбрать: ${e.name}`}
                aria-pressed={selected.includes(e.id)}
                onClick={() =>
                  setSelected(
                    selected.includes(e.id)
                      ? selected.filter((id) => id !== e.id)
                      : [...selected, e.id],
                  )
                }
              >
                {selected.includes(e.id) ? (
                  <Check size={19} />
                ) : (
                  <Plus size={19} />
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <Empty title="Ничего не нашлось" icon={<Search />}>
          <p>Попробуйте другое название или оборудование.</p>
        </Empty>
      )}
      {selected.length > 0 && (
        <div className="selection-bar">
          <span>
            Выбрано: <b>{selected.length}</b>
          </span>
          <button
            className="button primary"
            onClick={() => {
              onAdd(selected);
              setSelected([]);
            }}
          >
            <Plus size={18} />
            Добавить выбранные · {selected.length}
          </button>
          <button className="text-button" onClick={() => setSelected([])}>
            Сбросить
          </button>
        </div>
      )}
    </>
  );
}
export function ExerciseDetail({
  exercise: e,
  onClose,
  onAdd,
}: {
  exercise: Exercise;
  onClose: () => void;
  onAdd: () => void;
}) {
  const { state, change } = useStore();
  const [tab, setTab] = useState("Техника");
  const rows = completedSets(state.sessions).filter(
    (r) => r.item.exercise.id === e.id,
  );
  return (
    <Modal title="Карточка упражнения" onClose={onClose} wide>
      <div className="detail-title">
        <span className="tag">{e.category}</span>
        <h2>{e.name}</h2>
        <p>
          {e.equipment} ·{" "}
          {e.secondary.length
            ? `Также: ${e.secondary.join(", ")}`
            : "Основная группа: " + e.category}
        </p>
      </div>
      <div className="tabs">
        {["Техника", "История", "Прогресс"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Техника" ? (
        <>
          <Illustration exercise={e} />
          <span className="offline-note">
            ✓ Иллюстрация и описание доступны без интернета
          </span>
          <h3>Как выполнять</h3>
          <ol className="technique">
            {e.technique.map((t, i) => (
              <li key={i}>
                <span>{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <div className="notice">
            <b>Обратите внимание</b>
            <p>{e.mistakes}</p>
          </div>
        </>
      ) : tab === "История" ? (
        rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Учёт</th>
                  <th>Результат</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.session.id + r.item.id + r.set.id}>
                    <td>{r.session.date}</td>
                    <td>{accountingLabels[r.item.accounting]}</td>
                    <td>
                      {r.set.side && `${r.set.side} · `}
                      {e.measure === "time"
                        ? `${r.set.seconds} с`
                        : e.measure === "cardio"
                          ? `${r.set.seconds} с / ${r.set.distance} км`
                          : `${num(r.set.weight)} кг × ${r.set.reps}`}
                      {r.set.warmup ? " · разминка" : ""}
                      {r.set.note && <small>{r.set.note}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="История ещё впереди">
            <p>Здесь появится каждый выполненный подход завершённых занятий.</p>
          </Empty>
        )
      ) : (
        <ExerciseProgress exercise={e} />
      )}
      <div className="modal-footer">
        <button
          className="button secondary"
          onClick={() =>
            change((s) => {
              s.favorites = s.favorites.includes(e.id)
                ? s.favorites.filter((x) => x !== e.id)
                : [...s.favorites, e.id];
            })
          }
        >
          <Heart size={17} />
          {state.favorites.includes(e.id) ? "В избранном" : "В избранное"}
        </button>
        <button className="button primary" onClick={onAdd}>
          <Plus size={18} />В тренировку
        </button>
      </div>
    </Modal>
  );
}
export function CustomExercise({ onClose }: { onClose: () => void }) {
  const { change, toast } = useStore();
  const [error, setError] = useState("");
  const [image, setImage] = useState("");
  return (
    <Modal title="Своё упражнение" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const name = String(data.get("name")).trim();
          if (!name) {
            setError("Укажите название");
            return;
          }
          const description = String(data.get("technique"));
          change((s) =>
            s.exercises.push({
              id: uid(),
              name,
              category: String(data.get("category")),
              secondary: [],
              equipment: String(data.get("equipment")) || "Другое",
              measure: measureSchema.parse(data.get("measure")),
              accounting: accountingSchema.parse(data.get("accounting")),
              kind: "custom",
              variant: "",
              technique: [description || "Описание пока не добавлено."],
              mistakes:
                "Выбирайте комфортную нагрузку и контролируйте движение.",
              aliases: "",
              custom: true,
              image,
            }),
          );
          toast("Упражнение добавлено");
          onClose();
        }}
      >
        <label>
          Название
          <input name="name" required maxLength={160} />
        </label>
        <label>
          Категория
          <select name="category">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Оборудование
          <input name="equipment" placeholder="Например, эспандер" />
        </label>
        <div className="form-row">
          <label>
            Тип измерения
            <select name="measure">
              <option value="weight">Вес и повторения</option>
              <option value="reps">Только повторения</option>
              <option value="time">Длительность</option>
              <option value="cardio">Время и дистанция</option>
            </select>
          </label>
          <label>
            Учёт веса
            <select name="accounting">
              {Object.entries(accountingLabels).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Техника
          <textarea name="technique" rows={4} />
        </label>
        <label>
          Изображение (PNG, JPEG, WebP, до 2 МБ)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
                setError("Выберите PNG, JPEG или WebP");
                return;
              }
              if (f.size > 2000000) {
                setError("Изображение больше 2 МБ");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setImage(String(reader.result));
                setError("");
              };
              reader.readAsDataURL(f);
            }}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button primary full">
          <Dumbbell size={18} />
          Сохранить упражнение
        </button>
      </form>
    </Modal>
  );
}
