import { useEffect, useRef, useState } from "react";
import { Timer, X, Minus, Plus, Play, Check } from "lucide-react";
import { useStore } from "./store";
import { clock } from "./model";
import { Modal } from "./ui";
export function Timers({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { state, change } = useStore();
  useEffect(() => {
    window.addEventListener("workout:open-rest", onOpen);
    return () => window.removeEventListener("workout:open-rest", onOpen);
  }, [onOpen]);
  const [now, setNow] = useState(Date.now());
  const [custom, setCustom] = useState("90");
  const alerted = useRef(new Set<number>());
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    const arm = () => {
      if (!audio.current)
        try {
          audio.current = new AudioContext();
        } catch {}
      void audio.current?.resume();
    };
    document.addEventListener("pointerdown", arm, { once: true });
    return () => document.removeEventListener("pointerdown", arm);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    for (const end of [state.restEnd, state.effort?.end]) {
      if (end && end <= now && !alerted.current.has(end)) {
        alerted.current.add(end);
        if (state.settings.sound)
          try {
            navigator.vibrate?.([150, 60, 150]);
            const ctx = audio.current;
            if (ctx && ctx.state === "running") {
              const oscillator = ctx.createOscillator();
              const gain = ctx.createGain();
              oscillator.connect(gain);
              gain.connect(ctx.destination);
              gain.gain.setValueAtTime(0.12, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + 0.5,
              );
              oscillator.frequency.value = 660;
              oscillator.start();
              oscillator.stop(ctx.currentTime + 0.5);
            }
          } catch {}
      }
    }
  }, [now, state.restEnd, state.effort?.end, state.settings.sound]);
  const dock = useRef<HTMLDivElement>(null);
  const runningRest = state.restEnd !== null && state.restEnd > now;
  const visible = Boolean(runningRest || state.effort);
  useEffect(() => {
    if (!dock.current) {
      document.documentElement.style.setProperty("--timer-height", "0px");
      return;
    }
    const observer = new ResizeObserver((entries) =>
      document.documentElement.style.setProperty(
        "--timer-height",
        `${entries[0].borderBoxSize?.[0]?.blockSize ?? dock.current?.getBoundingClientRect().height ?? 0}px`,
      ),
    );
    observer.observe(dock.current);
    return () => observer.disconnect();
  }, [visible]);
  return (
    <>
      {visible && (
        <div
          ref={dock}
          className={`timer-dock ${state.restEnd || state.effort ? "running" : ""}`}
          aria-label="Панель таймеров"
        >
          {runningRest && (
            <div className="timer-topline">
              <button
                className="timer-toggle"
                onClick={onOpen}
                aria-haspopup="dialog"
              >
                <Timer size={21} />
                <span>
                  {state.restEnd ? (
                    now >= state.restEnd ? (
                      "Отдых завершён"
                    ) : (
                      <>
                        Отдых · <b>{clock(state.restEnd - now)}</b>
                      </>
                    )
                  ) : (
                    "Таймер отдыха"
                  )}
                </span>
              </button>
              {state.restEnd && (
                <div className="timer-quick-actions">
                  <button
                    className="button secondary"
                    aria-label="Увеличить отдых на 15 секунд"
                    onClick={() =>
                      change((s) => {
                        s.restEnd =
                          Math.max(Date.now(), s.restEnd ?? 0) + 15000;
                      })
                    }
                  >
                    <Plus size={17} />
                    15 с
                  </button>
                  <button
                    className="text-button"
                    aria-label="Пропустить отдых"
                    onClick={() =>
                      change((s) => {
                        s.restEnd = null;
                      })
                    }
                  >
                    Пропустить <X size={17} />
                  </button>
                </div>
              )}
            </div>
          )}
          {state.effort && (
            <div className="effort-timer">
              <span>
                <Timer size={18} />
                Подход ·{" "}
                <b>
                  {now >= state.effort.end
                    ? "Время вышло"
                    : clock(state.effort.end - now)}
                </b>
              </span>
              <button
                className="icon-button"
                aria-label="Остановить таймер подхода"
                onClick={() =>
                  change((s) => {
                    s.effort = null;
                  })
                }
              >
                <X size={18} />
              </button>
              {now >= state.effort.end && (
                <small>Отметьте подход в тренировке.</small>
              )}
            </div>
          )}
        </div>
      )}
      {open && (
        <Modal title="Таймер отдыха" onClose={onClose}>
          <div className="timer-controls">
            {state.restEnd && (
              <div className="rest-adjust">
                <button
                  className="button secondary"
                  aria-label="Уменьшить отдых на 15 секунд"
                  onClick={() =>
                    change((s) => {
                      s.restEnd = Math.max(
                        Date.now(),
                        (s.restEnd ?? Date.now()) - 15000,
                      );
                    })
                  }
                >
                  <Minus size={18} />
                  15 с
                </button>
                <b>{clock(state.restEnd - now)}</b>
                <button
                  className="button secondary"
                  onClick={() =>
                    change((s) => {
                      s.restEnd = Math.max(Date.now(), s.restEnd ?? 0) + 15000;
                    })
                  }
                >
                  <Plus size={18} />
                  15 с
                </button>
              </div>
            )}
            <div className="rest-presets">
              {[30, 60, 90, 120, 180].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    change((s) => {
                      s.restEnd = Date.now() + n * 1000;
                    });
                    onClose();
                  }}
                >
                  {n} с
                </button>
              ))}
            </div>
            <label>
              Свой отдых, секунд
              <div className="custom-rest">
                <input
                  aria-label="Произвольный отдых, секунд"
                  inputMode="numeric"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
                <button
                  className="button primary"
                  disabled={
                    !/^\d+$/.test(custom) ||
                    Number(custom) < 1 ||
                    Number(custom) > 3600
                  }
                  onClick={() => {
                    change((s) => {
                      s.restEnd = Date.now() + Number(custom) * 1000;
                    });
                    onClose();
                  }}
                >
                  <Play size={18} />
                  Старт
                </button>
              </div>
            </label>
            {state.restEnd && (
              <button
                className="button secondary full"
                onClick={() => {
                  change((s) => {
                    s.restEnd = null;
                  });
                  onClose();
                }}
              >
                Остановить отдых
              </button>
            )}
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
              Автозапуск отдыха
            </label>
            <p className="muted">Таймер подхода и отдых работают независимо.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
