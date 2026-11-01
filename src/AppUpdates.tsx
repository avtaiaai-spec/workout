import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { RefreshCw, X } from "lucide-react";
import { useStore } from "./store";
export const APP_VERSION = __APP_VERSION__;
type Updates = {
  version: string;
  available: boolean;
  checking: boolean;
  applying: boolean;
  message: string;
  error: string;
  dismissed: boolean;
  check: () => Promise<void>;
  apply: () => Promise<void>;
  dismiss: () => void;
};
const Context = createContext<Updates>(null!);
export const useAppUpdates = () => useContext(Context);

/** Activating a new cache never reloads a page. Only an explicit, saved update does. */
export function AppUpdates({ children }: { children: ReactNode }) {
  const { flush } = useStore();
  const [available, setAvailable] = useState(false),
    [checking, setChecking] = useState(false),
    [applying, setApplying] = useState(false),
    [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const registrationReady = useRef<
    Promise<ServiceWorkerRegistration> | undefined
  >(undefined);
  const reloadRequested = useRef(false);
  const busy = useRef(false);
  useEffect(() => {
    document.documentElement.dataset.appVersion = APP_VERSION;
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let disposed = false,
      controlled = Boolean(navigator.serviceWorker.controller),
      lastCheck = 0;
    const cleanups: (() => void)[] = [];
    const offer = () => {
      if (!disposed) {
        setAvailable(true);
        setDismissed(false);
        setMessage("Новая версия готова к установке.");
      }
    };
    const watch = (worker: ServiceWorker) => {
      const changed = () => {
        if (worker.state === "installed" && controlled) offer();
      };
      worker.addEventListener("statechange", changed);
      cleanups.push(() => worker.removeEventListener("statechange", changed));
      changed();
    };
    const controllerChanged = () => {
      if (reloadRequested.current) {
        location.reload();
        return;
      }
      if (controlled) offer();
      controlled = true;
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controllerChanged,
    );
    const scope = new URL(import.meta.env.BASE_URL, location.href).pathname;
    registrationReady.current = navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope,
        updateViaCache: "none",
      })
      .catch(async (error) => {
        const existing = await navigator.serviceWorker.getRegistration(scope);
        if (existing) return existing;
        throw error;
      });
    void registrationReady.current
      .then((r) => {
        if (disposed) return;
        registration.current = r;
        const found = () => {
          if (r.installing) watch(r.installing);
        };
        r.addEventListener("updatefound", found);
        cleanups.push(() => r.removeEventListener("updatefound", found));
        found();
        if (r.waiting && controlled) offer();
      })
      .catch(() => {
        if (!disposed)
          setMessage(
            "Проверка обновлений будет доступна при подключении к интернету.",
          );
      });
    const backgroundCheck = () => {
      if (
        document.visibilityState !== "visible" ||
        !navigator.onLine ||
        Date.now() - lastCheck < 60000
      )
        return;
      lastCheck = Date.now();
      void registrationReady.current?.then((r) => r.update()).catch(() => {});
    };
    window.addEventListener("focus", backgroundCheck);
    window.addEventListener("online", backgroundCheck);
    document.addEventListener("visibilitychange", backgroundCheck);
    const interval = window.setInterval(backgroundCheck, 15 * 60000);
    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controllerChanged,
      );
      window.removeEventListener("focus", backgroundCheck);
      window.removeEventListener("online", backgroundCheck);
      document.removeEventListener("visibilitychange", backgroundCheck);
    };
  }, []);
  async function check() {
    if (busy.current) return;
    setError("");
    setMessage("");
    if (!navigator.onLine) {
      setMessage("Для проверки обновлений подключитесь к интернету.");
      return;
    }
    if (!registrationReady.current) {
      setMessage("Проверка обновлений доступна на опубликованном сайте.");
      return;
    }
    busy.current = true;
    setChecking(true);
    try {
      const r = await registrationReady.current;
      await r.update();
      const worker = r.installing;
      if (
        worker &&
        !["installed", "activated", "redundant"].includes(worker.state)
      )
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timeout);
            worker.removeEventListener("statechange", change);
            resolve();
          };
          const change = () => {
            if (["installed", "activated", "redundant"].includes(worker.state))
              finish();
          };
          const timeout = window.setTimeout(finish, 20000);
          worker.addEventListener("statechange", change);
          change();
        });
      if (r.waiting) {
        setAvailable(true);
        setDismissed(false);
        setMessage("Новая версия готова к установке.");
      } else
        setMessage(
          r.installing
            ? "Обновление загружается."
            : "Проверка завершена. Если доступна новая версия, нажмите «Обновить».",
        );
      if (available) setDismissed(false);
    } catch {
      setError(
        "Не удалось проверить обновления. Проверьте подключение и попробуйте снова.",
      );
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }
  async function apply() {
    if (busy.current) return;
    busy.current = true;
    setApplying(true);
    setError("");
    try {
      // IndexedDB commits first, including the current approach and both deadlines.
      await flush();
      const r = registration.current;
      if (r?.waiting) {
        reloadRequested.current = true;
        r.waiting.postMessage({ type: "SKIP_WAITING" });
        // The data is durable already; avoid trapping the UI if activation stalls.
        window.setTimeout(() => location.reload(), 8000);
      } else location.reload();
    } catch {
      busy.current = false;
      setApplying(false);
      setError(
        "Не удалось сохранить данные перед обновлением. Страница не перезагружена. Повторите попытку или сохраните резервную копию в настройках.",
      );
    }
  }
  return (
    <Context.Provider
      value={{
        version: APP_VERSION,
        available,
        checking,
        applying,
        message,
        error,
        dismissed,
        check,
        apply,
        dismiss: () => setDismissed(true),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function AppUpdateBanner() {
  const updates = useAppUpdates();
  const { state } = useStore();
  if (!updates.available || updates.dismissed) return null;
  const active = state.sessions.some((s) => s.status === "active");
  return (
    <section className="update-notice" aria-label="Обновление приложения">
      <div>
        <strong>Доступна новая версия</strong>
        <p>
          {active
            ? "Сохраним занятие и таймеры перед обновлением."
            : "Ваши тренировки и история сохранятся."}
        </p>
        {updates.error && (
          <p className="error" role="alert">
            {updates.error}
          </p>
        )}
      </div>
      <button
        className="button primary"
        disabled={updates.applying || updates.checking}
        onClick={() => void updates.apply()}
      >
        <RefreshCw size={17} />
        {updates.applying ? "Сохраняем…" : "Обновить"}
      </button>
      <button
        className="icon-button"
        aria-label="Напомнить об обновлении позже"
        disabled={updates.applying}
        onClick={updates.dismiss}
      >
        <X size={19} />
      </button>
    </section>
  );
}
