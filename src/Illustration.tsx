import { useState } from "react";
import { Exercise } from "./model";
import { mandatoryIds } from "./catalog";
export function exerciseMedia(id: string) {
  return mandatoryIds.includes(id)
    ? `${import.meta.env.BASE_URL}media/exercises/${id}.webp`
    : undefined;
}
export function Illustration({
  exercise,
  small = false,
}: {
  exercise: Exercise;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const source = exercise.image || exerciseMedia(exercise.id);
  if (!source || failed)
    return (
      <div className={small ? "exercise-thumb media-unavailable" : "notice"}>
        {small ? (
          <span>
            Техника
            <br />в описании
          </span>
        ) : (
          <p>
            {failed
              ? "Не удалось загрузить иллюстрацию. Текстовая техника остаётся доступной."
              : exercise.custom
                ? "Для этого упражнения изображение не добавлено."
                : "Это сохранённый вариант из прежнего каталога. Его результаты сохранены; текстовая техника доступна ниже."}
          </p>
        )}
      </div>
    );
  if (small)
    return (
      <span
        className={`exercise-thumb ${exercise.image ? "custom-thumb" : "photo-thumb"}`}
      >
        <img
          src={source}
          alt={exercise.name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </span>
    );
  return (
    <figure className="exercise-photo">
      <img
        src={source}
        alt={`${exercise.name}: исходное положение слева, движение справа`}
        decoding="async"
        onError={() => setFailed(true)}
      />
      {!exercise.custom && (
        <figcaption>
          <span>Исходное положение</span>
          <span>{exercise.measure === "time" ? "Удержание" : "Движение"}</span>
        </figcaption>
      )}
      <a
        className="text-button text-link"
        href={source}
        target="_blank"
        rel="noreferrer"
      >
        Открыть изображение крупно ↗
      </a>
    </figure>
  );
}
