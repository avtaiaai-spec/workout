import { useEffect, useState } from "react";
import {
  CalendarDays,
  NotebookText,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Play,
  ChevronLeft,
  ArrowUpRight,
} from "lucide-react";
import { useStore } from "./store";
import { Catalog, ExerciseDetail, CustomExercise } from "./Catalog";
import { Calendar, ScheduleForm } from "./Schedule";
import { Progress } from "./Progress";
import { Journal } from "./Journal";
import { WorkoutEditor } from "./Editor";
import { TemplateEditor } from "./TemplateEditor";
import { Measurements } from "./Measurements";
import { Settings } from "./Settings";
import { TimerSignals } from "./Timers";
import { ActiveWorkout } from "./ActiveWorkout";
import { CompletedSummary } from "./CompletedSummary";
import { Modal, Empty } from "./ui";
import {
  Exercise,
  Session,
  createSession,
  createUnplannedSession,
  repeatSession,
  replaceRemainingWork,
  makeItem,
  uid,
  localDate,
  asDate,
  clock,
  elapsed,
} from "./model";
import { Today } from "./Today";
import { applyTheme } from "./theme";
import { useViewport } from "./useViewport";
import { AppUpdateBanner, useAppUpdates } from "./AppUpdates";
const nav = [
  ["plan", "План", CalendarDays],
  ["journal", "Журнал", NotebookText],
  ["progress", "Прогресс", BarChart3],
] as const;
const go = (route: string) => {
  location.hash = route;
  window.scrollTo({ top: 0, behavior: "instant" });
};
export default function App() {
  useViewport();
  const { applying: applyingUpdate } = useAppUpdates();
  const { state, change, error, saving, toast } = useStore();
  const [route, setRoute] = useState(location.hash.slice(1) || "plan");
  const [info, setInfo] = useState<Exercise>();
  const [custom, setCustom] = useState(false);
  const [settings, setSettings] = useState(false);
  const [finishedSession, setFinishedSession] = useState<string>();
  const [plan, setPlan] = useState<{ templateId?: string; date?: string }>();
  const [choose, setChoose] = useState(false);
  const [addIds, setAddIds] = useState<string[]>();
  const [target, setTarget] = useState<{
    id: string;
    session: boolean;
    replace?: string;
  }>();
  const [conflict, setConflict] = useState(false);
  const [datedStart, setDatedStart] = useState<{
    id: string;
    occurrence: string;
    date: string;
  }>();
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(Date.now());
  const active = state.sessions.find((s) => s.status === "active");
  const [rawPage, id] = route.split("/");
  const page = ["today", "workouts"].includes(rawPage)
    ? "plan"
    : rawPage === "calendar"
      ? "planner"
      : rawPage;
  const focusMode = page === "session" && active?.id === id;
  const navPage = ["planner", "catalog", "edit"].includes(page)
    ? "plan"
    : page === "body"
      ? "progress"
      : page === "session"
        ? "journal"
        : page;
  useEffect(() => {
    const hash = () => setRoute(location.hash.slice(1) || "plan");
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
    const parts = route.split("/");
    if (parts[0] !== "catalog") return;
    if (["session", "template"].includes(parts[1]) && parts[2])
      setTarget({
        id: parts[2],
        session: parts[1] === "session",
        replace: parts[3] || undefined,
      });
    else setTarget(undefined);
  }, [route]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active?.id]);
  useEffect(() => {
    applyTheme(state.settings.theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(state.settings.theme);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [state.settings.theme]);
  function openSession(session: Session) {
    let nextId = session.id;
    change((s) => {
      const current = s.sessions.find((x) => x.status === "active");
      if (current) nextId = current.id;
      else s.sessions.push(session);
    });
    setChoose(false);
    go(`session/${nextId}`);
  }
  function start(templateId: string, occurrenceId?: string, confirmed = false) {
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
    if (!t?.items.length) {
      toast("Сначала добавьте упражнения в тренировку");
      return;
    }
    if (occurrenceId && !confirmed) {
      const date =
        state.exceptions.find((e) => e.id === occurrenceId)?.date ??
        occurrenceId.slice(-10);
      if (date !== localDate()) {
        setDatedStart({ id: templateId, occurrence: occurrenceId, date });
        return;
      }
    }
    openSession(createSession(t, occurrenceId, Date.now()));
  }
  function unplanned() {
    if (active) {
      setConflict(true);
      return;
    }
    openSession(createUnplannedSession());
  }
  function repeat(id: string) {
    if (active) {
      setConflict(true);
      return;
    }
    const source = state.sessions.find((s) => s.id === id);
    if (source) openSession(repeatSession(source));
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
        draft: true,
        draftStep: 1,
      }),
    );
    setTarget({ id, session: false });
    go(`catalog/template/${id}`);
    return id;
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
        .map((e) => {
          const item = makeItem(e, s.settings.defaultRest);
          return item;
        });
      if (t.items.length + items.length > 200) {
        toast("Не больше 200 упражнений в тренировке");
        return;
      }
      if (dest.replace) replaceRemainingWork(t, dest.replace, items);
      else t.items.push(...items);
      if (dest.session) {
        for (const item of items)
          item.plannedSets = item.sets.map((set) => ({
            ...structuredClone(set),
            done: false,
            recordedAt: undefined,
          }));
        const session = t as Session;
        const next = items[0];
        if (next) {
          session.currentItemId = next.id;
          session.currentSetId = next.sets[0]?.id;
        }
      } else t.draftStep = 2;
    });
    go(`${dest.session ? "session" : "edit"}/${dest.id}`);
    toast("Упражнения добавлены");
    setAddIds(undefined);
  }
  function addExercises(ids: string[]) {
    if (target) {
      applyAdd(ids, target);
      setTarget(undefined);
    } else setAddIds(ids);
  }
  return (
    <div
      inert={applyingUpdate || undefined}
      className={`app-shell ${focusMode ? "focus-mode" : ""} ${active && !focusMode ? "has-resume" : ""}`}
    >
      {!focusMode && (
        <aside className="sidebar">
          <a href="#plan" className="brand">
            Мои тренировки<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Основные разделы">
            {nav.map(([key, label, Icon]) => (
              <a
                key={key}
                href={`#${key}`}
                className={navPage === key ? "active" : ""}
                aria-current={navPage === key ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button
              className="settings-button"
              onClick={() => setSettings(true)}
            >
              <SettingsIcon size={20} />
              Настройки
            </button>
            <span className={`save-status ${error ? "error" : ""}`}>
              {error
                ? "Ошибка хранения"
                : saving
                  ? "Сохраняем…"
                  : online
                    ? "Данные на устройстве"
                    : "Без интернета · сохранено"}
            </span>
          </div>
        </aside>
      )}
      <div className="workspace">
        <AppUpdateBanner />
        <TimerSignals />
        <main>
          {!focusMode && (
            <div className="page-tools">
              <button
                className="icon-button"
                aria-label="Настройки"
                onClick={() => setSettings(true)}
              >
                <SettingsIcon size={20} />
              </button>
            </div>
          )}
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
          {page === "plan" ? (
            <Today
              key={id ?? "plan"}
              initialDate={id}
              onNew={newTemplate}
              onChoose={() => setChoose(true)}
              onUnplanned={unplanned}
              onStart={start}
              onEdit={(id) => go(`edit/${id}`)}
              onResume={(id) => go(`session/${id}`)}
              onPlan={(date, templateId) => setPlan({ date, templateId })}
              onCalendar={(date) => go(`planner/${date}`)}
              onProgress={() => go("progress")}
            />
          ) : page === "catalog" ? (
            <>
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
                  <span>
                    {target.replace
                      ? "Выберите замену"
                      : "Выберите одно или несколько упражнений"}
                  </span>
                </div>
              )}
              <Catalog
                onInfo={setInfo}
                onAdd={addExercises}
                onCustom={() => setCustom(true)}
              />
            </>
          ) : page === "planner" ? (
            <Calendar
              key={id ?? "planner"}
              initialDate={id}
              onPlan={(date) => setPlan({ date })}
              onStart={start}
              onSession={(id) => go(`session/${id}`)}
            />
          ) : page === "journal" ? (
            <Journal
              onSession={(id) => go(`session/${id}`)}
              onRepeat={repeat}
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
              key={id}
              id={id}
              onBack={() => go("plan")}
              onSchedule={(id) => setPlan({ templateId: id })}
              onInfo={setInfo}
              onStart={start}
              onAdd={(replace) => {
                setTarget({ id, session: false, replace });
                go(`catalog/template/${id}/${replace ?? ""}`);
              }}
            />
          ) : page === "session" && active?.id === id ? (
            <ActiveWorkout
              key={id}
              id={id}
              onBack={() => go("plan")}
              onInfo={setInfo}
              onAdd={(replace) => {
                setTarget({ id, session: true, replace });
                go(`catalog/session/${id}/${replace ?? ""}`);
              }}
              onComplete={() => setFinishedSession(id)}
            />
          ) : page === "session" ? (
            <WorkoutEditor
              key={id}
              id={id}
              session
              onBack={() => go(active?.id === id ? "plan" : "journal")}
              onInfo={setInfo}
              onStart={start}
              onRepeat={() => repeat(id)}
              onAdd={(replace) => {
                setTarget({ id, session: true, replace });
                go(`catalog/session/${id}/${replace ?? ""}`);
              }}
            />
          ) : (
            <Empty title="Страница не найдена">
              <button className="button primary" onClick={() => go("plan")}>
                Открыть план
              </button>
            </Empty>
          )}
        </main>
      </div>
      {!focusMode && (
        <nav className="bottom-nav" aria-label="Основная навигация">
          {nav.map(([key, label, Icon]) => (
            <a
              key={key}
              href={`#${key}`}
              className={navPage === key ? "active" : ""}
              aria-current={navPage === key ? "page" : undefined}
            >
              <Icon size={21} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      )}
      {active && !focusMode && (
        <button
          className="resume-dock"
          onClick={() => go(`session/${active.id}`)}
        >
          <Play size={18} />
          <span>
            Вернуться к тренировке
            <small>
              {active.name}
              {active.pausedAt ? " · пауза" : ""}
            </small>
          </span>
          <b>{clock(elapsed(active, now))}</b>
          <ArrowUpRight size={17} />
        </button>
      )}
      {finishedSession && (
        <CompletedSummary
          id={finishedSession}
          onClose={() => setFinishedSession(undefined)}
        />
      )}
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
            .map((t, i) => (
              <button
                className="choose-row"
                disabled={!t.items.length}
                key={t.id}
                onClick={() => start(t.id)}
              >
                <span className="row-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
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
              setChoose(false);
              newTemplate();
            }}
          >
            <Plus size={18} />
            Создать тренировку
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
              setTarget(undefined);
            }}
          >
            В новую тренировку
          </button>
        </Modal>
      )}
      {conflict && active && (
        <Modal title="Тренировка уже идёт" onClose={() => setConflict(false)}>
          <p>
            Продолжите или завершите «{active.name}». Одновременно записывается
            одно занятие.
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
      {datedStart && (
        <Modal
          title="Выполнить сейчас?"
          onClose={() => setDatedStart(undefined)}
        >
          <p>
            Занятие назначено на{" "}
            {asDate(datedStart.date).toLocaleDateString("ru-RU")}. Фактическая
            дата начала будет сегодняшней:{" "}
            {asDate(localDate()).toLocaleDateString("ru-RU")}. Связь с исходным
            планом сохранится.
          </p>
          <button
            className="button primary full"
            onClick={() => {
              const pending = datedStart;
              setDatedStart(undefined);
              start(pending.id, pending.occurrence, true);
            }}
          >
            Выполнить сейчас
          </button>
        </Modal>
      )}
    </div>
  );
}
