import { Exercise, State, Template, makeItem, makeSet } from "./model";
// The visible built-in catalogue is intentionally limited to the 17 requested exercises.
const rows: [string, string, string, string, string, string, string, string][] =
  [
    [
      "machine-hip-thrust",
      "Ягодичные",
      "Ягодичный мост в рычаговом тренажёре",
      "Рычаговый тренажёр",
      "hipmachine",
      "Прижмите верх спины к опоре, поставьте стопы на платформу. Мягкий рычаг расположен поперёк таза, а не на животе.",
      "Поднимайте таз, толкая рычаг ягодицами. Вверху голени почти вертикальны, плечи, таз и колени на одной линии. Плавно опустите таз.",
      "Не переразгибайте поясницу; движение идёт в тазу.",
    ],
    [
      "barbell-rdl",
      "Ягодичные",
      "Румынская становая тяга со штангой",
      "Штанга",
      "rdl",
      "Держите штангу у бёдер, колени слегка согнуты.",
      "Отводите таз назад, ведя гриф близко к ногам. Вернитесь усилием ягодиц.",
      "Не округляйте спину и не превращайте движение в присед.",
    ],
    [
      "cable-kickback",
      "Ягодичные",
      "Отведение ноги назад в блоке",
      "Блок",
      "kickback",
      "Наденьте манжету нижнего блока, держитесь за стойку, корпус устойчив.",
      "Отведите одну ногу назад без поворота таза. Верните. Выполните обе стороны отдельно.",
      "Не раскачивайтесь и не прогибайте поясницу.",
    ],
    [
      "leg-extension",
      "Ноги",
      "Разгибание ног сидя в тренажёре",
      "Тренажёр",
      "legextension",
      "Совместите колени с осью тренажёра, валик над стопами.",
      "Разогните ноги без рывка и медленно согните.",
      "Не отрывайте таз от сиденья.",
    ],
    [
      "hip-adduction",
      "Ноги",
      "Сведение ног сидя в тренажёре",
      "Тренажёр",
      "adduction",
      "Сядьте, внутренние поверхности бёдер на подушках.",
      "Сведите бёдра к центру и плавно разведите.",
      "Не сводите рычаги ударом.",
    ],
    [
      "kettlebell-plie",
      "Ноги",
      "Приседания плие с гирей",
      "Гиря",
      "plie",
      "Поставьте стопы широко, носки разверните наружу. Держите одну гирю за ручку двумя руками между ног.",
      "Согните колени по направлению носков, опуская таз между бёдрами. Сохраняйте пятки на полу и встаньте, не округляя спину.",
      "Не сводите колени и не отрывайте пятки.",
    ],
    [
      "dumbbell-rdl",
      "Ягодичные",
      "Румынская тяга с гантелями",
      "Гантели",
      "rdl-dumbbell",
      "Гантели перед бёдрами, мягкие колени, спина нейтральна.",
      "Отведите таз назад, опуская гантели вдоль ног, и разогнитесь.",
      "Не тянитесь гантелями к полу за счёт округления спины.",
    ],
    [
      "glute-hyperextension",
      "Ягодичные",
      "Гиперэкстензия с акцентом на ягодицы",
      "Скамья",
      "glutehyper",
      "Опора ниже тазовой складки, стопы чуть развёрнуты. Верх спины можно слегка округлить, поясница стабильна.",
      "Согнитесь в тазу. Поднимайте корпус сокращением ягодиц только до линии ног, не выше.",
      "Не переразгибайте поясницу и не поднимайтесь рывком.",
    ],
    [
      "lying-leg-curl",
      "Ноги",
      "Сгибание ног лёжа в тренажёре",
      "Тренажёр",
      "legcurl",
      "Лягте животом на скамью, валик над пятками, колени у оси.",
      "Согните колени, приблизив пятки к ягодицам. Плавно опустите.",
      "Не поднимайте таз и не прогибайтесь.",
    ],
    [
      "hip-abduction",
      "Ягодичные",
      "Разведение ног сидя в тренажёре",
      "Тренажёр",
      "abduction",
      "Сядьте, наружные поверхности бёдер на подушках, таз неподвижен.",
      "Разведите колени наружу, задержитесь и медленно сведите.",
      "Не ударяйте стеком и не раскачивайтесь.",
    ],
    [
      "forearm-plank",
      "Пресс",
      "Планка на предплечьях",
      "Собственный вес",
      "plank",
      "Локти под плечами, предплечья на полу, опора на носки.",
      "Удерживайте прямую линию тела, напрягите пресс и ягодицы, дышите.",
      "Не провисайте в пояснице и не задерживайте дыхание.",
    ],
    [
      "smith-bench",
      "Грудь",
      "Жим штанги лёжа на горизонтальной скамье в тренажёре Смита",
      "Смит",
      "smith",
      "Лягте на горизонтальную скамью, гриф над серединой груди. Сведите лопатки, стопы на полу.",
      "Опустите гриф по направляющим к груди. Выжмите вверх, не отрывая таз.",
      "Не ставьте скамью так, чтобы гриф опускался к шее.",
    ],
    [
      "machine-chest",
      "Грудь",
      "Жим в тренажёре от груди вперёд",
      "Тренажёр",
      "chestpress",
      "Настройте сиденье: рукояти на уровне середины груди, спина прижата.",
      "Выжмите рукояти вперёд. Плавно вернитесь, сохраняя контроль.",
      "Не отрывайте спину от спинки.",
    ],
    [
      "cable-row",
      "Спина",
      "Горизонтальная тяга блока сидя узким хватом",
      "Блок",
      "row",
      "Сядьте, стопы на упорах, возьмите узкую рукоять.",
      "Тяните к поясу, ведя локти назад. Верните руки вперёд.",
      "Не раскачивайте корпус.",
    ],
    [
      "wide-pulldown",
      "Спина",
      "Вертикальная тяга широким прямым хватом к груди",
      "Блок",
      "pulldown",
      "Зафиксируйте бёдра, возьмите гриф прямым хватом шире плеч.",
      "Тяните к верхней части груди, опуская локти. Плавно выпрямите руки.",
      "Не тяните гриф за голову.",
    ],
    [
      "triceps-pushdown",
      "Руки — трицепс",
      "Разгибание рук в блоке",
      "Блок",
      "pushdown",
      "Встаньте перед верхним блоком, локти прижаты к корпусу.",
      "Разогните руки вниз, затем плавно согните до прямого угла.",
      "Не раскачивайте корпус.",
    ],
    [
      "dumbbell-curl",
      "Руки — бицепс",
      "Сгибание рук с гантелями",
      "Гантели",
      "curl",
      "Встаньте ровно, держите гантели вдоль корпуса, локти рядом с телом.",
      "Сгибайте руки поочерёдно или одновременно, разворачивая ладони к плечам. Медленно опускайте. Указанное число повторений выполняется каждой рукой.",
      "Не раскачивайте корпус.",
    ],
  ];
export const mandatoryIds = rows.map((r) => r[0]);
export const catalog: Exercise[] = rows.map(
  ([id, category, name, equipment, kind, setup, motion, mistakes]) => ({
    id,
    name,
    category,
    equipment,
    kind,
    variant: "",
    secondary: ["smith", "chestpress"].includes(kind)
      ? ["Руки — трицепс", "Дельты"]
      : ["row", "pulldown"].includes(kind)
        ? ["Руки — бицепс"]
        : category === "Ягодичные"
          ? ["Ноги"]
          : [],
    measure: kind === "plank" ? "time" : "weight",
    accounting:
      kind === "smith"
        ? "added"
        : kind === "plank"
          ? "body"
          : ["curl", "rdl-dumbbell"].includes(kind)
            ? "unknown"
            : ["rdl", "plie", "glutehyper"].includes(kind)
              ? "total"
              : "machine",
    technique: [
      setup,
      motion,
      "Двигайтесь плавно и в комфортной амплитуде. Остановитесь при резкой боли.",
    ],
    mistakes,
    aliases:
      kind === "hipmachine"
        ? "hip thrust хип траст хиптраст glute drive ягодичный мост рычажный тренажер"
        : kind === "plie"
          ? "плие сумо приседание гиря"
          : kind === "plank"
            ? "планка"
            : kind === "glutehyper"
              ? "гиперэкстензия гиперестезия на ягодицы"
              : name.toLowerCase(),
  }),
);
type SeedRow = [string, number, number, number];
export const seedRows: SeedRow[][] = [
  [
    ["smith-bench", 4, 10, 20],
    ["machine-chest", 3, 10, 18],
    ["cable-row", 4, 12, 22.6],
    ["wide-pulldown", 4, 12, 27.3],
    ["triceps-pushdown", 3, 6, 13],
    ["dumbbell-curl", 4, 10, 6],
    ["forearm-plank", 3, 45, 0],
  ],
  [
    ["machine-hip-thrust", 5, 8, 42.7],
    ["barbell-rdl", 4, 10, 25],
    ["cable-kickback", 3, 10, 9],
    ["leg-extension", 3, 12, 32],
    ["hip-adduction", 3, 15, 41],
  ],
  [
    ["kettlebell-plie", 4, 10, 20],
    ["dumbbell-rdl", 4, 10, 25],
    ["glute-hyperextension", 4, 12, 10],
    ["lying-leg-curl", 4, 12, 21.4],
    ["hip-abduction", 4, 15, 45],
    ["forearm-plank", 3, 45, 0],
  ],
];
const names = [
  "Спина + грудь + руки",
  "Ноги + ягодицы — день 1",
  "Ноги + ягодицы — день 2",
];
export function seedTemplates(): Template[] {
  return seedRows.map((rows, i) => ({
    id: `personal-template-v1-${i}`,
    name: names[i],
    note: "Ваша готовая тренировка. Отдых 90 с — редактируемое значение по умолчанию.",
    archived: false,
    items: rows.map(([id, count, reps, weight]) => {
      const e = catalog.find((e) => e.id === id)!;
      const item = makeItem(e);
      item.sets = Array.from({ length: count }, () => ({
        ...makeSet(),
        weight,
        reps: e.measure === "time" ? 0 : reps,
        seconds: e.measure === "time" ? reps : 0,
      }));
      if (id === "cable-kickback")
        item.sets = ["Л", "П"].flatMap((side) =>
          item.sets.map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            side: side as "Л" | "П",
          })),
        );
      return item;
    }),
  }));
}
export function initialState(): State {
  return {
    version: 2,
    seeded: ["curated-v2"],
    exercises: structuredClone(catalog),
    retiredExercises: [],
    templates: [],
    sessions: [],
    rules: [],
    exceptions: [],
    favorites: [],
    measurements: [],
    trainingDays: [],
    restEnd: null,
    effort: null,
    settings: { theme: "system", autoRest: true, sound: true, defaultRest: 90 },
  };
}
export function migrate(state: State): State {
  const currentIds = new Set(catalog.map((e) => e.id));
  const retired = [
    ...state.retiredExercises,
    ...state.exercises.filter((e) => !e.custom && !currentIds.has(e.id)),
  ];
  const unique = [...new Map(retired.map((e) => [e.id, e])).values()].filter(
    (e) => !currentIds.has(e.id),
  );
  return {
    ...state,
    seeded: [...new Set([...state.seeded, "curated-v2"])],
    retiredExercises: unique,
    exercises: [
      ...structuredClone(catalog),
      ...state.exercises.filter((e) => e.custom && !currentIds.has(e.id)),
    ],
  };
}
export function addPersonalTemplates(state: State) {
  for (const template of seedTemplates())
    if (!state.templates.some((t) => t.id === template.id))
      state.templates.push(template);
  if (!state.seeded.includes("personal-v1")) state.seeded.push("personal-v1");
}
