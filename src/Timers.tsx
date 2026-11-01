import { useEffect, useRef, useState } from "react";
import { Timer, Plus, X, Play } from "lucide-react";
import { useStore } from "./store";
import { clock, Item } from "./model";
import { NumberInput } from "./ui";

/** Notifications are headless: there is no global timer panel or toolbar button. */
export function TimerSignals() {
  const { state } = useStore();
  const [now, setNow] = useState(Date.now());
  const alerted = useRef(new Set<number>());
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    const arm = () => {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
      } catch {}
    };
    document.addEventListener("pointerdown", arm, { once: true });
    const interval = setInterval(() => setNow(Date.now()), 300);
    return () => {
      clearInterval(interval);
      document.removeEventListener("pointerdown", arm);
    };
  }, []);
  useEffect(() => {
    const active = state.sessions.find((s) => s.status === "active");
    const deadlines = [
      state.restEnd,
      state.effort?.end,
      ...(active?.items.map((i) => i.restEnd) ?? []),
    ];
    for (const end of deadlines) {
      if (!end || end > now || alerted.current.has(end)) continue;
      alerted.current.add(end);
      if (!state.settings.sound) continue;
      try {
        navigator.vibrate?.([150, 60, 150]);
        const ctx = audio.current;
        if (ctx?.state === "running") {
          const oscillator = ctx.createOscillator(),
            gain = ctx.createGain();
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          oscillator.frequency.value = 660;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.5);
        }
      } catch {}
    }
  }, [
    now,
    state.restEnd,
    state.effort?.end,
    state.sessions,
    state.settings.sound,
  ]);
  return null;
}
export function ExerciseRestTimer({
  sessionId,
  item,
}: {
  sessionId: string;
  item: Item;
}) {
  const { state, change } = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(timer);
  }, []);
  const end =
    item.restEnd ?? (state.restItemId === item.id ? state.restEnd : null);
  const running = !!end && end > now;
  const rest =
    item.sets.find((s) => !s.done)?.rest ??
    item.plannedSets?.[0]?.rest ??
    item.sets[0]?.rest ??
    state.settings.defaultRest;
  function deadline(value: number | null) {
    change((s) => {
      const i = s.sessions
        .find((x) => x.id === sessionId)
        ?.items.find((i) => i.id === item.id);
      if (i) i.restEnd = value;
      s.restEnd = value;
      s.restItemId = value ? item.id : undefined;
    });
  }
  return (
    <section
      className={`exercise-rest ${running ? "running" : ""}`}
      aria-label="Отдых между подходами"
    >
      <div className="exercise-rest-heading">
        <Timer size={18} />
        <span>
          <strong>
            {running ? `Отдых · ${clock(end! - now)}` : "Отдых между подходами"}
          </strong>
          <small>
            {running
              ? "Можно записать следующий подход в любое время"
              : `${rest} с · ${state.settings.autoRest ? "запускается после подхода" : "автозапуск выключен"}`}
          </small>
        </span>
      </div>
      <div className="exercise-rest-actions">
        {running ? (
          <>
            <button
              className="button secondary"
              aria-label="Увеличить отдых на 15 секунд"
              onClick={() => deadline(Math.max(Date.now(), end!) + 15000)}
            >
              <Plus size={16} />
              15 с
            </button>
            <button
              className="text-button"
              aria-label="Пропустить отдых"
              onClick={() => deadline(null)}
            >
              Пропустить
              <X size={16} />
            </button>
          </>
        ) : (
          <button
            className="text-button"
            disabled={!rest}
            onClick={() => deadline(Date.now() + rest * 1000)}
          >
            <Play size={15} />
            Начать отдых
          </button>
        )}
      </div>
      <details>
        <summary>Изменить отдых</summary>
        <label>
          Отдых между подходами, с
          <NumberInput
            integer
            max={3600}
            label="Отдых между подходами, секунд"
            value={rest}
            onChange={(value) =>
              change((s) => {
                const i = s.sessions
                  .find((x) => x.id === sessionId)
                  ?.items.find((x) => x.id === item.id);
                if (!i) return;
                for (const set of i.sets) if (!set.done) set.rest = value;
                if (i.plannedSets)
                  for (const set of i.plannedSets) set.rest = value;
              })
            }
          />
        </label>
      </details>
    </section>
  );
}
