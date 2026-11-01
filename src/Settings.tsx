import { useState } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  Smartphone,
  Moon,
  Sun,
  Monitor,
  Database,
} from "lucide-react";
import { useStore } from "./store";
import { Modal } from "./ui";
import { importBackup, localDate } from "./model";
import { csv, download } from "./storage";
import { migrate } from "./catalog";
import { useAppUpdates } from "./AppUpdates";
export function Settings({ onClose }: { onClose: () => void }) {
  const { state, change, replace, toast } = useStore();
  const updates = useAppUpdates();
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<unknown>();
  const [bytes, setBytes] = useState("");
  const [persisted, setPersisted] = useState(false);
  async function storage() {
    const result = await navigator.storage?.estimate();
    setBytes(
      result
        ? `${Math.round((result.usage ?? 0) / 1024)} КБ использовано`
        : "Браузер не сообщает объём",
    );
    const ok = await navigator.storage?.persist?.();
    setPersisted(!!ok);
  }
  function restore() {
    try {
      const next = migrate(importBackup(pending, state, mode));
      replace(next);
      setPending(undefined);
      setError("");
      toast("Резервная копия восстановлена");
    } catch (e) {
      setError(
        e instanceof Error && e.message.length < 250
          ? e.message
          : "Неверная структура или версия файла. Данные не изменены.",
      );
      setPending(undefined);
    }
  }
  return (
    <Modal title="Настройки" onClose={onClose}>
      <section className="settings-section">
        <h3>Внешний вид</h3>
        <div className="theme-picker">
          {(
            [
              ["light", "Светлая", Sun],
              ["dark", "Тёмная", Moon],
              ["system", "Как на устройстве", Monitor],
            ] as const
          ).map(([key, title, Icon]) => (
            <button
              key={key}
              className={state.settings.theme === key ? "selected" : ""}
              aria-pressed={state.settings.theme === key}
              onClick={() =>
                change((s) => {
                  s.settings.theme = key;
                })
              }
            >
              <Icon size={21} />
              {title}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h3>Таймеры</h3>
        <label className="check-label">
          <input
            type="checkbox"
            checked={state.settings.autoRest}
            onChange={(e) =>
              change((s) => {
                s.settings.autoRest = e.target.checked;
              })
            }
          />
          Автоматический отдых после подхода
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={state.settings.sound}
            onChange={(e) =>
              change((s) => {
                s.settings.sound = e.target.checked;
              })
            }
          />
          Звук и вибрация, если доступны
        </label>
        <label>
          Отдых для новых подходов, секунд
          <input
            type="number"
            min="0"
            max="3600"
            value={state.settings.defaultRest}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 0 && n <= 3600)
                change((s) => {
                  s.settings.defaultRest = n;
                });
            }}
          />
        </label>
        <p className="muted">
          В готовых тренировках отдых 90 с задан по умолчанию. Вы можете выбрать
          другое время. Звук при заблокированном iPhone не гарантируется.
        </p>
      </section>
      <section className="settings-section">
        <h3>
          <Database size={18} />
          Резервная копия
        </h3>
        <div className="notice">
          <ShieldCheck size={20} />
          <p>
            Ваши данные хранятся в этом браузере на этом устройстве. Регистрация
            не нужна. Синхронизации между устройствами нет. Для переноса
            сохраните JSON-копию; она включает пользовательские изображения.
          </p>
        </div>
        <div className="form-row">
          <button
            className="button secondary"
            onClick={() =>
              download(
                JSON.stringify(state, null, 2),
                `workout-${localDate()}.json`,
              )
            }
          >
            <Download size={17} />
            Экспорт JSON
          </button>
          <button
            className="button secondary"
            onClick={() =>
              download(
                csv(state),
                `approaches-${localDate()}.csv`,
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download size={17} />
            Журнал CSV
          </button>
        </div>
        <label>
          Режим импорта
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "merge" | "replace")}
          >
            <option value="merge">
              Объединить (существующие записи сохраняются)
            </option>
            <option value="replace">Полностью заменить данные</option>
          </select>
        </label>
        <label className="file-upload">
          <Upload size={19} />
          Выбрать JSON-копию
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 25000000) {
                setError("Файл больше 25 МБ");
                return;
              }
              try {
                const parsed = JSON.parse(
                  (await f.text()).replace(/^\uFEFF/, ""),
                );
                importBackup(parsed, state, mode);
                setPending(parsed);
                setError("");
              } catch {
                setError(
                  "Не удалось проверить резервную копию: неверная структура, версия, дубликаты или конфликт активных занятий. Данные не изменены.",
                );
              }
            }}
          />
        </label>
        {pending !== undefined && (
          <div className="notice">
            <p>
              {mode === "replace"
                ? "Все текущие данные будут заменены. Сначала экспортируйте свою копию."
                : "Записи объединятся по ID. Совпадающие текущие записи останутся без изменений."}
            </p>
            <button
              className={`button ${mode === "replace" ? "danger" : "primary"}`}
              onClick={restore}
            >
              {mode === "replace"
                ? "Подтвердить полную замену"
                : "Восстановить копию"}
            </button>
            <button
              className="text-button"
              onClick={() => setPending(undefined)}
            >
              Отмена
            </button>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="text-button" onClick={storage}>
          Проверить и защитить хранилище
        </button>
        {bytes && (
          <p className="muted">
            {bytes}.{" "}
            {persisted
              ? "Постоянное хранение разрешено."
              : "Браузер управляет очисткой; регулярно сохраняйте копию."}
          </p>
        )}
      </section>
      <section className="settings-section">
        <h3>Обновление приложения</h3>
        <p>Версия {updates.version}</p>
        <button
          className="text-button text-link"
          disabled={updates.checking || updates.applying}
          onClick={() => void updates.check()}
        >
          {updates.checking ? "Проверяем…" : "Проверить обновления"}
        </button>
        {updates.available && (
          <button
            className="button primary full"
            disabled={updates.applying || updates.checking}
            onClick={() => void updates.apply()}
          >
            {updates.applying ? "Сохраняем…" : "Обновить приложение"}
          </button>
        )}
        {updates.message && <p role="status">{updates.message}</p>}
        {updates.error && (
          <p className="error" role="alert">
            {updates.error}
          </p>
        )}
      </section>
      <section className="settings-section">
        <h3>
          <Smartphone size={18} />
          Установить на iPhone
        </h3>
        <p>
          Откройте опубликованный сайт в Safari → «Поделиться» → «На экран
          Домой». Дождитесь первой полной загрузки с интернетом. После этого
          основные функции и локальные схемы работают офлайн.
        </p>
        <p className="muted">
          При появлении новой версии нажмите «Обновить». Занятие и таймеры
          сохраняются перед перезагрузкой. Данные браузера очищать не нужно.
        </p>
      </section>
    </Modal>
  );
}
