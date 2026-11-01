import { ReactNode, useEffect, useRef, useState } from "react";
import { X, Plus, Minus } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="dialog"] button:not([disabled]),[role="dialog"] input,[role="dialog"] select,[role="dialog"] textarea,[role="dialog"] a',
          ),
        ).filter((e) => e.offsetParent !== null);
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0]?.focus();
        }
      }
    };
    const previous = document.activeElement as HTMLElement;
    setTimeout(
      () =>
        document.querySelector<HTMLElement>('[role="dialog"] button')?.focus(),
      0,
    );
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Empty({
  title,
  children,
  icon,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon && <span className="empty-icon">{icon}</span>}
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function NumberInput({
  value,
  onChange,
  label,
  integer = false,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  integer?: boolean;
}) {
  const [text, setText] = useState(String(value).replace(".", ","));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value).replace(".", ","));
  }, [value]);
  function parse(raw: string) {
    const n = Number(raw.replace(",", "."));
    return raw.trim() !== "" &&
      Number.isFinite(n) &&
      n >= 0 &&
      n <= 10000 &&
      (!integer || Number.isInteger(n))
      ? n
      : null;
  }
  return (
    <input
      aria-label={label}
      inputMode={integer ? "numeric" : "decimal"}
      className="number-input"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        const input = e.currentTarget;
        if (window.innerWidth <= 700)
          window.setTimeout(() => {
            if (document.activeElement === input)
              window.dispatchEvent(new Event("workout:focus-field"));
          }, 250);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = parse(raw);
        if (n !== null) onChange(n);
      }}
      onBlur={() => {
        focused.current = false;
        const n = parse(text);
        setText(String(n ?? value).replace(".", ","));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
export function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <span className="stepper">
      <button
        aria-label="Убрать 15 секунд"
        onClick={() => onChange(Math.max(0, value - 15))}
      >
        <Minus size={16} />
      </button>
      <b>{value} с</b>
      <button
        aria-label="Добавить 15 секунд"
        onClick={() => onChange(value + 15)}
      >
        <Plus size={16} />
      </button>
    </span>
  );
}
