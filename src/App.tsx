import { useEffect, useState } from "react";
import {
  CalendarDays,
  Dumbbell,
  LayoutGrid,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Play,
  Check,
  Copy,
  Archive,
  Heart,
  Sparkles,
  WifiOff,
  CircleHelp,
  MoreHorizontal,
  Ruler,
} from "lucide-react";
import { useStore } from "./store";
import { Catalog, ExerciseDetail, CustomExercise } from "./Catalog";
import { Calendar, ScheduleForm } from "./Schedule";
import { Progress, Stat } from "./Progress";
import { WorkoutEditor } from "./Editor";
import { TemplateEditor } from "./TemplateEditor";
import { Measurements } from "./Measurements";
import { addPersonalTemplates } from "./catalog";
import { Settings } from "./Settings";
import { Timers } from "./Timers";
import { Modal, Empty } from "./ui";
import {
  Exercise,
  createSession,
  localDate,
  asDate,
  shiftDate,
  monday,
  occurrences,
  stats,
  makeItem,
  uid,
  clock,
  elapsed,
} from "./model";
import { Illustration } from "./Illustration";
import { Today } from "./Today";
import { applyTheme } from "./theme";
import { useViewport } from "./useViewport";
const nav = [
  ["today", "Сегодня", LayoutGrid],
  ["workouts", "Тренировки", Dumbbell],
  ["catalog", "Упражнения", Archive],
  ["calendar", "Календарь", CalendarDays],
  ["progress", "Прогресс", BarChart3],
  ["body", "Замеры тела", Ruler],
] as const;
const go = (route: string) => {
  location.hash = route;
  window.scrollTo({ top: 0, behavior: "instant" });
};
export default function App() {
  useViewport();
  const { state, change, error, saving, toast } = useStore();
  const [route, setRoute] = useState(location.hash.slice(1) || "today");
  const [info, setInfo] = useState<Exercise>();
  const [custom, setCustom] = useState(false);
  const [settings, setSettings] = useState(false);
  const [plan, setPlan] = useState<{ templateId?: string; date?: string }>();
  const [choose, setChoose] = useState(false);
  const [addIds, setAddIds] = useState<string[]>();
  const [target, setTarget] = useState<{
    id: string;
    session: boolean;
    replace?: string;
  }>();
  const [conflict, setConflict] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [showArchived, setShowArchived] = useState(false);
  const active = state.sessions.find((s) => s.status === "active");
  const [page, id] = route.split("/");
  useEffect(() => {
    const hash = () => setRoute(location.hash.slice(1) || "today");
    const net = () => setOnline(navigator.onLine);
    window.addEventListener("hashchange", hash);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, []);
  useEffect(() => {
    applyTheme(state.settings.theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(state.settings.theme);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [state.settings.theme]);
  function start(templateId: string, occurrenceId?: string) {
    const existing =
      occurrenceId &&
      state.sessions.find(
        (s) => s.occurrenceId === occurrenceId && s.status !== "cancelled",
      );
    if (existing) {
      go(`session/${existing.id}`);
      setChoose(false);
      return;
    }
    if (active) {
      setConflict(true);
      return;
    }
    const t = state.templates.find((t) => t.id === templateId);
    if (!t || !t.items.length) {
      toast("Сначала добавьте упражнения в шаблон");
      return;
    }
    const session = createSession(t, occurrenceId);
    let openId = session.id;
    change((s) => {
      const existing = s.sessions.find((x) => x.status === "active");
      if (existing) openId = existing.id;
      else s.sessions.push(session);
    });
    setChoose(false);
    go(`session/${openId}`);
  }
  function newTemplate() {
    const id = uid();
    change((s) =>
      s.templates.push({
        id,
        name: "Новая тренировка",
        items: [],
        note: "",
        archived: false,
      }),
    );
    go(`edit/${id}`);
    return id;
  }
  function addExercises(ids: string[]) {
    if (target) {
      applyAdd(ids, target);
      setTarget(undefined);
    } else setAddIds(ids);
  }
  function applyAdd(
    ids: string[],
    dest: { id: string; session: boolean; replace?: string },
  ) {
    change((s) => {
      const t = (dest.session ? s.sessions : s.templates).find(
        (t) => t.id === dest.id,
      );
      if (!t) return;
      const items = ids
        .map((id) => s.exercises.find((e) => e.id === id))
        .filter((e): e is Exercise => !!e)
        .map((e) => makeItem(e, s.settings.defaultRest));
      if (t.items.length + items.length - (dest.replace ? 1 : 0) > 200) {
        toast("Не больше 200 упражнений в тренировке");
        return;
      }
      if (dest.replace) {
        const n = t.items.findIndex((i) => i.id === dest.replace);
        if (n >= 0) t.items.splice(n, 1, ...items);
      } else t.items.push(...items);
    });
    go(`${dest.session ? "session" : "edit"}/${dest.id}`);
    toast("Упражнения добавлены");
    setAddIds(undefined);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#today" className="brand">
          <span className="brand-mark">
            <Dumbbell size={24} />
          </span>
          <span>
            Мои
            <br />
            тренировки<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="nav-label">ВАШЕ ПРОСТРАНСТВО</span>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <a
              href={`#${key}`}
              key={key}
              className={
                page === key || (page === "edit" && key === "workouts")
                  ? "active"
                  : ""
              }
            >
              <Icon size={20} />
              <span>{label}</span>
              {page === key && <i />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <Shield />
            <span>
              <b>Только для вас</b>
              <small>Данные на устройстве</small>
            </span>
            <span className="local-dot" />
          </div>
          <button className="settings-button" onClick={() => setSettings(true)}>
            <SettingsIcon size={20} />
            Настройки
          </button>
          <span className="sidebar-footer">Ваш ритм. Ваш прогресс.</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Моё пространство <ChevronRight size={13} />
            <b>{nav.find((n) => n[0] === page)?.[1] ?? "Тренировка"}</b>
          </span>
          <a href="#today" className="mobile-brand">
            <Dumbbell size={21} />
            Мои тренировки
          </a>
          <div className="topbar-right">
            <span className={`save-status ${error ? "error" : ""}`}>
              <i />
              {error
                ? "Ошибка хранения"
                : saving
                  ? "Сохраняем…"
                  : online
                    ? "Сохранено на устройстве"
                    : "Офлайн · данные на устройстве"}
            </span>
            <button
              className="icon-button"
              aria-label="Настройки"
              onClick={() => setSettings(true)}
            >
              <SettingsIcon size={19} />
            </button>
            <span className="avatar">Я</span>
          </div>
        </header>
        <Timers />
        <main>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button
                className="button secondary"
                onClick={() => setSettings(true)}
              >
                Экспорт данных
              </button>
            </div>
          )}
          {active && page !== "session" && page !== "today" && (
            <button
              className="active-banner"
              onClick={() => go(`session/${active.id}`)}
            >
              <span className="pulse" />
              <span>
                Есть незавершённая тренировка · <b>{active.name}</b>
              </span>
              <span>
                Продолжить <ArrowUpRight size={17} />
              </span>
            </button>
          )}
          {page === "today" ? (
            <Today
              onNew={newTemplate}
              onChoose={() => setChoose(true)}
              onStart={start}
              onEdit={(id) => go(`edit/${id}`)}
              onResume={(id) => go(`session/${id}`)}
              onPlan={(date) => setPlan({ date })}
              onCalendar={(date) => go(`calendar/${date}`)}
              onProgress={() => go("progress")}
            />
          ) : page === "workouts" ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ПЛАН, КОТОРЫЙ МОЖНО МЕНЯТЬ</span>
                  <h1>Мои тренировки</h1>
                  <p>Ваши готовые шаблоны. Ваши собственные решения.</p>
                </div>
                <button className="button primary" onClick={newTemplate}>
                  <Plus size={18} />
                  Создать тренировку
                </button>
              </div>
              {!state.templates.length && (
                <Empty
                  title="Ваши тренировки — с чистого листа"
                  icon={<Dumbbell />}
                >
                  <p>
                    Создайте тренировку, выберите упражнения и задайте вес,
                    подходы, повторения и отдых.
                  </p>
                  <button className="button primary full" onClick={newTemplate}>
                    Создать первую тренировку
                  </button>
                </Empty>
              )}
              {!state.templates.some((t) =>
                t.id.startsWith("personal-template-v1-"),
              ) && (
                <button
                  className="text-button text-link preset-button"
                  onClick={() => {
                    change(addPersonalTemplates);
                    toast(
                      "Три готовые тренировки добавлены. Их можно изменить.",
                    );
                  }}
                >
                  <Plus size={18} />
                  Добавить мои три готовые тренировки
                </button>
              )}
              <div className="filter-bar">
                <button
                  className={
                    !showArchived ? "text-button active-text" : "text-button"
                  }
                  onClick={() => setShowArchived(false)}
                >
                  Активные
                </button>
                <button
                  className={
                    showArchived ? "text-button active-text" : "text-button"
                  }
                  onClick={() => setShowArchived(true)}
                >
                  Архив
                </button>
              </div>
              <div className="template-grid">
                {state.templates
                  .filter((t) => t.archived === showArchived)
                  .map((t, i) => (
                    <article className="template-card" key={t.id}>
                      <div className={`template-cover cover-${i % 3}`}>
                        <span className="template-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <Dumbbell size={72} strokeWidth={1.1} />
                        <span className="tag">{t.items.length} упражнений</span>
                      </div>
                      <div className="template-body">
                        <h2>{t.name}</h2>
                        <p>
                          {t.items.reduce((n, i) => n + i.sets.length, 0)}{" "}
                          подходов · можно изменить
                        </p>
                        <div className="template-preview">
                          {t.items.slice(0, 3).map((it) => (
                            <span key={it.id}>{it.exercise.name}</span>
                          ))}
                          {t.items.length > 3 && (
                            <small>Ещё {t.items.length - 3} упражнения</small>
                          )}
                        </div>
                        <div className="template-main-actions">
                          <button
                            className="button primary"
                            disabled={!t.items.length}
                            onClick={() => start(t.id)}
                          >
                            <Play size={16} />
                            Начать
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => go(`edit/${t.id}`)}
                          >
                            Изменить
                          </button>
                        </div>
                        <div className="template-tools">
                          <button
                            className="text-button"
                            onClick={() => setPlan({ templateId: t.id })}
                          >
                            <CalendarDays size={16} />В план
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
                            <Copy size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={
                              showArchived ? "Вернуть из архива" : "В архив"
                            }
                            onClick={() =>
                              change((s) => {
                                s.templates.find(
                                  (x) => x.id === t.id,
                                )!.archived = !t.archived;
                              })
                            }
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              <p className="footnote">
                Готовые тренировки можно добавить отдельно. Веса не являются
                автоматически рассчитанными рекомендациями. Дни недели вы
                назначаете самостоятельно.
              </p>
            </>
          ) : page === "catalog" ? (
            <>
              <Catalog
                onInfo={setInfo}
                onAdd={addExercises}
                onCustom={() => setCustom(true)}
              />
              {target && (
                <div className="catalog-target">
                  <button
                    className="text-button"
                    onClick={() => {
                      go(`${target.session ? "session" : "edit"}/${target.id}`);
                      setTarget(undefined);
                    }}
                  >
                    <ChevronLeft size={16} />
                    Вернуться к тренировке
                  </button>
                  {target.replace
                    ? "Выберите замену упражнению"
                    : "Выберите упражнения из любых категорий"}
                </div>
              )}
            </>
          ) : page === "calendar" ? (
            <Calendar
              key={id ?? "calendar"}
              initialDate={id}
              onPlan={(date) => setPlan({ date })}
              onStart={start}
              onSession={(id) => go(`session/${id}`)}
            />
          ) : page === "progress" ? (
            <Progress
              onSession={(id) => go(`session/${id}`)}
              onExercise={setInfo}
            />
          ) : page === "body" ? (
            <Measurements />
          ) : page === "edit" ? (
            <TemplateEditor
              id={id}
              onBack={() => go("workouts")}
              onInfo={setInfo}
              onStart={start}
              onAdd={(replace) => {
                setTarget({ id, session: false, replace });
                go("catalog");
              }}
            />
          ) : page === "session" ? (
            <WorkoutEditor
              key={route}
              id={id}
              session={page === "session"}
              onBack={() => go("progress")}
              onInfo={setInfo}
              onStart={start}
              onAdd={(replace) => {
                setTarget({ id, session: page === "session", replace });
                go("catalog");
              }}
            />
          ) : (
            <Empty title="Страница не найдена">
              <button className="button primary" onClick={() => go("today")}>
                На главную
              </button>
            </Empty>
          )}
          <footer className="page-footer">
            <span>
              Мои тренировки<span className="heading-dot">.</span>
            </span>
            <small>С заботой о вашем ритме</small>
            <span>
              <span className="local-dot" /> Личное пространство
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {nav
          .filter((n) => n[0] !== "body")
          .map(([key, label, Icon]) => (
            <a
              key={key}
              href={`#${key}`}
              className={
                page === key || (page === "body" && key === "progress")
                  ? "active"
                  : ""
              }
            >
              <Icon size={21} />
              <span>{label}</span>
            </a>
          ))}
      </nav>
      {info && (
        <ExerciseDetail
          exercise={info}
          onClose={() => setInfo(undefined)}
          onAdd={() => {
            const e = info;
            setInfo(undefined);
            addExercises([e.id]);
          }}
        />
      )}
      {custom && <CustomExercise onClose={() => setCustom(false)} />}
      {settings && <Settings onClose={() => setSettings(false)} />}
      {plan && (
        <ScheduleForm
          templateId={plan.templateId}
          initialDate={plan.date}
          onClose={() => setPlan(undefined)}
        />
      )}
      {choose && (
        <Modal title="Выберите тренировку" onClose={() => setChoose(false)}>
          {state.templates
            .filter((t) => !t.archived)
            .map((t) => (
              <button
                className="choose-row"
                disabled={!t.items.length}
                key={t.id}
                onClick={() => start(t.id)}
              >
                <Dumbbell size={23} />
                <span>
                  <b>{t.name}</b>
                  <small>{t.items.length} упражнений</small>
                </span>
                <Play size={18} />
              </button>
            ))}
          <button
            className="button secondary full"
            onClick={() => {
              newTemplate();
              setChoose(false);
            }}
          >
            <Plus size={18} />
            Создать новую
          </button>
        </Modal>
      )}
      {addIds && (
        <Modal
          title="В какую тренировку добавить?"
          onClose={() => setAddIds(undefined)}
        >
          {active && (
            <button
              className="choose-row"
              onClick={() => applyAdd(addIds, { id: active.id, session: true })}
            >
              <span>
                <b>В активное занятие</b>
                <small>{active.name}</small>
              </span>
              <Plus size={18} />
            </button>
          )}
          {state.templates
            .filter((t) => !t.archived)
            .map((t) => (
              <button
                key={t.id}
                className="choose-row"
                onClick={() => applyAdd(addIds, { id: t.id, session: false })}
              >
                <span>{t.name}</span>
                <Plus size={18} />
              </button>
            ))}
          <button
            className="button primary full"
            onClick={() => {
              const id = newTemplate();
              applyAdd(addIds, { id, session: false });
            }}
          >
            В новую тренировку
          </button>
        </Modal>
      )}
      {conflict && active && (
        <Modal title="Тренировка уже идёт" onClose={() => setConflict(false)}>
          <p>
            Одновременно можно записывать одно занятие. Продолжите или завершите
            «{active.name}».
          </p>
          <button
            className="button primary full"
            onClick={() => {
              go(`session/${active.id}`);
              setConflict(false);
              setChoose(false);
            }}
          >
            Продолжить текущее занятие
          </button>
        </Modal>
      )}
    </div>
  );
}
function Shield() {
  return (
    <svg
      width="20"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M12 2L3 6v6c0 6 9 10 9 10s9-4 9-10V6z" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}
function TimerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v5l3 1M9 2h6" />
    </svg>
  );
}
