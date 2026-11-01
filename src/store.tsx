import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { State } from "./model";
import { readState, writeState } from "./storage";
import { applyTheme } from "./theme";
type Store = {
  state: State;
  change: (fn: (s: State) => void) => void;
  replace: (s: State) => void;
  error: string;
  saving: boolean;
  toast: (text: string) => void;
};
const Context = createContext<Store>(null!);
export const useStore = () => useContext(Context);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>();
  const current = useRef<State | undefined>(undefined);
  const queue = useRef(Promise.resolve());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    readState()
      .then((s) => {
        applyTheme(s.settings.theme);
        current.current = s;
        setState(s);
        return writeState(s);
      })
      .catch(() =>
        setError(
          "Не удалось открыть хранилище. Данные не перезаписаны. Разрешите хранение данных в браузере и перезагрузите страницу.",
        ),
      );
  }, []);
  function replace(s: State) {
    applyTheme(s.settings.theme);
    current.current = s;
    setState(s);
    setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(() => writeState(s))
      .then(() => {
        if (current.current === s) {
          setSaving(false);
          setError("");
        }
      })
      .catch(() => {
        setSaving(false);
        setError(
          "Не удалось сохранить изменения на устройстве. Возможно, закончилось место. Не закрывайте приложение: экспортируйте резервную копию в настройках.",
        );
      });
  }
  function change(fn: (s: State) => void) {
    if (!current.current) return;
    const next = structuredClone(current.current);
    fn(next);
    replace(next);
  }
  function toast(t: string) {
    setNotice(t);
    window.setTimeout(() => setNotice(""), 4000);
  }
  if (!state)
    return (
      <div className="loading">
        <strong>Мои тренировки</strong>
        <p>{error || "Готовим ваше пространство…"}</p>
        {error && <button onClick={() => location.reload()}>Повторить</button>}
      </div>
    );
  return (
    <Context.Provider value={{ state, change, replace, error, saving, toast }}>
      {children}
      {notice && (
        <div role="status" className="toast">
          {notice}
        </div>
      )}
    </Context.Provider>
  );
}
