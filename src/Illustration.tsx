import { Exercise } from "./model";
// Original schematic instructional drawings. Coordinates are authored for this project.
type P = [number, number];
type Pose = {
  h: P;
  s: P;
  hip: P;
  k1: P;
  f1: P;
  k2?: P;
  f2?: P;
  e1: P;
  w1: P;
  e2?: P;
  w2?: P;
};
const standing: Pose = {
  h: [95, 43],
  s: [95, 63],
  hip: [95, 112],
  k1: [81, 145],
  f1: [77, 178],
  k2: [109, 145],
  f2: [116, 178],
  e1: [71, 86],
  w1: [68, 117],
  e2: [119, 86],
  w2: [122, 117],
};
const seated: Pose = {
  ...standing,
  h: [78, 47],
  s: [78, 66],
  hip: [78, 116],
  k1: [122, 119],
  f1: [133, 165],
  k2: [112, 121],
  f2: [118, 165],
  e1: [102, 84],
  w1: [125, 83],
  e2: [95, 88],
  w2: [117, 88],
};
const lying: Pose = {
  h: [48, 103],
  s: [66, 107],
  hip: [122, 111],
  k1: [145, 145],
  f1: [150, 175],
  k2: [138, 143],
  f2: [140, 175],
  e1: [80, 76],
  w1: [80, 49],
  e2: [96, 82],
  w2: [96, 49],
};
function frame(
  e: Exercise,
  end: boolean,
): { pose: Pose; equipment: React.ReactNode } {
  const k = e.kind;
  let p: Pose = { ...standing };
  let q: React.ReactNode = null;
  const line = (x: number, y: number, x2: number, y2: number) => (
    <line x1={x} y1={y} x2={x2} y2={y2} />
  );
  const bench = (
    <>
      <path d="M40 122h98M55 122v53m70-53v53" />
      <rect x="36" y="117" width="106" height="7" rx="3" />
    </>
  );
  const stack = (
    <>
      <rect x="166" y="32" width="19" height="145" rx="3" />
      <path d="M165 133h21m-21 10h21m-21 10h21m-21 10h21" />
    </>
  );
  const dumb = (pt: P) => (
    <g className="draw-weight">
      <path d={`M${pt[0] - 9} ${pt[1]}h18`} />
      <path d={`M${pt[0] - 9} ${pt[1] - 5}v10m18-10v10`} />
    </g>
  );
  const bar = (pt: P) => (
    <g className="draw-weight">
      <path d={`M${pt[0] - 32} ${pt[1]}h64`} />
      <path d={`M${pt[0] - 25} ${pt[1] - 9}v18m50-18v18`} />
    </g>
  );
  if (
    [
      "smith",
      "bench",
      "bench-dumbbell",
      "closebench",
      "skull",
      "incline",
    ].includes(k)
  ) {
    p = { ...lying };
    if (end) {
      p.w1 = [78, 40];
      p.e1 = [75, 72];
      p.w2 = [98, 40];
      p.e2 = [98, 73];
    } else {
      p.w1 = [81, 91];
      p.e1 = [88, 119];
      p.w2 = [102, 91];
      p.e2 = [115, 117];
    }
    if (k === "skull") {
      p.w1 = end ? [80, 42] : [39, 79];
      p.e1 = [78, 71];
    }
    if (k === "incline") {
      p.h = [52, 71];
      p.s = [67, 87];
      q = <path d="M36 76l62 46h45m-85-17v70m70-53v53" />;
    } else q = bench;
    q = (
      <>
        {q}
        {k === "smith" && <path d="M24 178V22h132v156M20 178h140" />}
        {k === "bench-dumbbell" || k === "incline" ? (
          <>
            {dumb(p.w1)}
            {dumb(p.w2!)}
          </>
        ) : (
          bar(p.w1)
        )}
      </>
    );
  } else if (
    [
      "chestpress",
      "shouldermachine",
      "shoulderpress",
      "pecdeck",
      "reversefly",
      "preacher",
      "wrist",
      "wristreverse",
      "rotation",
    ].includes(k)
  ) {
    p = { ...seated };
    q = (
      <>
        <path d="M57 52v76h53m-37 0v47m-19 0h70" />
        {k === "chestpress" ||
        k === "shouldermachine" ||
        k === "pecdeck" ||
        k === "reversefly"
          ? stack
          : null}
      </>
    );
    if (k === "chestpress") {
      p.w1 = end ? [143, 78] : [99, 78];
      p.e1 = end ? [114, 78] : [68, 97];
      q = (
        <>
          {q}
          <path d={`M170 40L${p.w1[0]} 78v21`} />
        </>
      );
    } else if (k === "shoulderpress" || k === "shouldermachine") {
      p.w1 = end ? [80, 17] : [62, 66];
      p.e1 = end ? [78, 43] : [53, 84];
      p.w2 = end ? [112, 17] : [115, 66];
      p.e2 = end ? [106, 43] : [121, 84];
      q = (
        <>
          {q}
          {k === "shouldermachine" ? (
            <path d={`M175 32L${p.w2[0]} ${p.w2[1]}`} />
          ) : (
            <>
              {dumb(p.w1)}
              {dumb(p.w2)}
            </>
          )}
        </>
      );
    } else if (k === "pecdeck" || k === "reversefly") {
      p = {
        ...standing,
        hip: [95, 119],
        k1: [80, 147],
        f1: [77, 178],
        w1: end ? [92, 83] : [35, 68],
        e1: end ? [69, 75] : [57, 67],
        w2: end ? [101, 83] : [155, 68],
        e2: end ? [120, 75] : [132, 67],
      };
      if (k === "reversefly") {
        p.w1 = end ? [35, 68] : [92, 83];
        p.w2 = end ? [155, 68] : [101, 83];
      }
      q = (
        <>
          {q}
          <path d={`M${p.w1[0]} ${p.w1[1]}v-8m${p.w2![0]} ${p.w2![1]}v-8`} />
        </>
      );
    } else if (k === "preacher") {
      p.w1 = end ? [105, 66] : [148, 126];
      p.e1 = [112, 103];
      q = (
        <>
          {q}
          <path d="M91 91l43 24m-21-12v71" />
          {bar(p.w1)}
        </>
      );
    } else {
      p.e1 = [114, 120];
      p.w1 = end ? [143, 108] : [143, 136];
      q = (
        <>
          {q}
          {dumb(p.w1)}
          <path d="M90 126h44" />
        </>
      );
    }
  } else if (["row", "pulldown", "pullup", "assisted", "erg"].includes(k)) {
    p = { ...seated };
    if (k === "row" || k === "erg") {
      p.w1 = end ? [100, 99] : [150, 89];
      p.e1 = end ? [65, 98] : [116, 81];
      q = (
        <>
          <path d="M48 128h60m-50 0v45m52-1h42l8-29" />
          {stack}
          <path d={`M175 103L${p.w1[0]} ${p.w1[1]}`} />
          {k === "erg" && (
            <>
              <circle cx="169" cy="133" r="25" />
              <path d="M57 142h91" />
            </>
          )}
        </>
      );
    } else {
      p = { ...standing };
      if (k === "pulldown") p = { ...seated, k1: [116, 118], f1: [129, 165] };
      p.w1 = end ? [53, 71] : [48, 25];
      p.e1 = end ? [46, 97] : [56, 53];
      p.w2 = end ? [137, 71] : [142, 25];
      p.e2 = end ? [146, 97] : [135, 53];
      if (k === "pullup" || k === "assisted") {
        p.h = end ? [95, 19] : [95, 64];
        p.s = end ? [95, 39] : [95, 84];
        p.hip = end ? [95, 96] : [95, 132];
        p.w1 = [48, 25];
        p.w2 = [142, 25];
        p.k1 = end ? [80, 127] : [80, 156];
        p.f1 = end ? [96, 143] : [96, 179];
      }
      q = (
        <>
          <path d="M24 179V18h146v161M42 25h108" />
          {k === "pulldown" && (
            <>
              <path d="M54 126h76m-63-10h69" />
              {stack}
              <path d={`M175 32L95 12v${end ? 58 : 13}`} />
              <path d={`M45 ${end ? 71 : 25}h100`} />
            </>
          )}
          {k === "assisted" && (
            <>
              <path d={`M64 ${end ? 130 : 159}h52v9H64z`} />
              {stack}
            </>
          )}
        </>
      );
    }
  } else if (
    ["rdl", "rdl-dumbbell", "bentrow", "dbrow", "rear", "swing"].includes(k)
  ) {
    p = end
      ? { ...standing, h: [96, 41], w1: [81, 119], w2: [113, 119] }
      : {
          ...standing,
          h: [60, 75],
          s: [77, 88],
          hip: [125, 112],
          k1: [103, 145],
          f1: [91, 178],
          k2: [130, 146],
          f2: [143, 178],
          e1: [76, 113],
          w1: [76, 146],
          e2: [89, 119],
          w2: [90, 148],
        };
    if (k === "bentrow" || k === "dbrow" || k === "rear") {
      p = { ...p, h: [60, 75], s: [77, 88], hip: [125, 112] };
      p.w1 = end ? [111, 103] : [76, 146];
      p.e1 = end ? [113, 75] : [77, 116];
    }
    if (k === "rear" && end) {
      p.w1 = [38, 66];
      p.e1 = [57, 77];
    }
    if (k === "swing" && end) {
      p.w1 = [43, 75];
      p.e1 = [63, 70];
    }
    q =
      k === "rdl" || k === "bentrow" ? (
        bar(p.w1)
      ) : (
        <>
          {dumb(p.w1)}
          {k === "rdl-dumbbell" && dumb(p.w2!)}
          {k === "dbrow" && <path d="M20 121h70m-60 0v54m49-54v54" />}
          {k === "swing" && <circle cx={p.w1[0]} cy={p.w1[1] + 9} r="10" />}
        </>
      );
  } else if (["hipmachine", "hipbar"].includes(k)) {
    p = {
      h: [41, 88],
      s: [62, 98],
      hip: end ? [111, 99] : [111, 144],
      k1: [151, 104],
      f1: [153, 169],
      e1: [80, 109],
      w1: [111, end ? 99 : 144],
      k2: [140, 108],
      f2: [140, 170],
    };
    q = (
      <>
        <path d="M23 110h48m-37 0v65m30-65v65M131 177h45" />
        {k === "hipmachine" ? (
          <>
            <path d="M16 180h172M111 174v-52l55-36" />
            <path className="draw-weight" d={`M94 ${end ? 99 : 144}l31 2`} />
            <circle cx="166" cy="86" r="17" />
          </>
        ) : (
          bar([111, end ? 99 : 144])
        )}
      </>
    );
  } else if (
    [
      "legextension",
      "adduction",
      "abduction",
      "legpress",
      "legcurl",
      "hyper",
      "glutehyper",
      "calf",
    ].includes(k)
  ) {
    p = { ...seated };
    if (k === "legextension") {
      p.k1 = [120, 120];
      p.f1 = end ? [161, 116] : [126, 170];
      q = (
        <>
          <path d="M57 45v83h73m-60 0v48" />
          {stack}
          <path
            className="draw-weight"
            d={`M${p.f1[0] - 10} ${p.f1[1] - 9}h18`}
          />
        </>
      );
    } else if (k === "adduction" || k === "abduction") {
      const wide = k === "abduction" ? end : !end;
      p = {
        ...standing,
        h: [95, 41],
        s: [95, 60],
        hip: [95, 113],
        k1: wide ? [46, 133] : [85, 143],
        f1: wide ? [42, 173] : [85, 177],
        k2: wide ? [144, 133] : [105, 143],
        f2: wide ? [148, 173] : [105, 177],
        e1: [67, 95],
        w1: [67, 122],
        e2: [123, 95],
        w2: [123, 122],
      };
      q = (
        <>
          <path d="M69 44h52v85H69zM95 130v50M60 181h72" />
          <path
            className="draw-weight"
            d={`M${p.k1[0] + (k === "adduction" ? 8 : -8)} ${p.k1[1] - 8}v18m${p.k2![0] + (k === "adduction" ? -8 : 8)} ${p.k2![1] - 8}v18`}
          />
        </>
      );
    } else if (k === "legcurl") {
      p = {
        h: [42, 101],
        s: [61, 107],
        hip: [116, 111],
        k1: [148, 114],
        f1: end ? [153, 65] : [182, 116],
        e1: [52, 131],
        w1: [36, 127],
      };
      q = (
        <>
          {bench}
          <path className="draw-weight" d={`M${p.f1[0] - 8} ${p.f1[1]}h16`} />
          <path d="M155 127v49h33" />
        </>
      );
    } else if (k === "hyper" || k === "glutehyper") {
      p = {
        h: end ? [52, 67] : [72, 145],
        s: end ? [68, 82] : [76, 126],
        hip: [104, 111],
        k1: [132, 143],
        f1: [155, 171],
        e1: end ? [83, 95] : [58, 120],
        w1: end ? [77, 88] : [64, 116],
      };
      q = (
        <>
          <path d="M94 111l21 8m-15-4l-31 62h97M151 164l-12 11M147 170l22-55" />
          <circle cx={p.w1[0]} cy={p.w1[1]} r="9" />
        </>
      );
    } else if (k === "legpress") {
      p = {
        h: [39, 94],
        s: [51, 112],
        hip: [74, 147],
        k1: end ? [112, 108] : [89, 100],
        f1: end ? [147, 70] : [116, 76],
        e1: [51, 139],
        w1: [72, 151],
      };
      q = (
        <>
          <path d="M24 110l43 52h35m15-103l43 34M93 174l77-112M72 167l76-110" />
        </>
      );
    } else {
      p = {
        ...standing,
        h: [95, end ? 34 : 43],
        s: [95, end ? 54 : 63],
        hip: [95, end ? 103 : 112],
      };
      q = <path d="M62 180h69v8H62M68 66h54M75 18v48m40-48v48" />;
    }
  } else if (
    [
      "squat",
      "goblet",
      "plie",
      "lunge",
      "bulgarian",
      "stepup",
      "kickback",
    ].includes(k)
  ) {
    p = end
      ? {
          ...standing,
          h: [94, 82],
          s: [94, 102],
          hip: [98, 139],
          k1: [57, 137],
          f1: [62, 179],
          k2: [140, 137],
          f2: [139, 179],
          e1: [81, 122],
          w1: [94, 108],
          e2: [107, 122],
          w2: [94, 108],
        }
      : { ...standing };
    if (k === "plie") {
      p.f1 = [49, 179];
      p.f2 = [148, 179];
      p.w1 = end ? [93, 156] : [93, 124];
      p.e1 = end ? [83, 135] : [81, 95];
      p.w2 = p.w1;
      q = dumb(p.w1);
    }
    if (k === "squat") q = bar([95, end ? 105 : 65]);
    if (k === "goblet") q = dumb(p.w1);
    if (["lunge", "bulgarian", "stepup"].includes(k)) {
      p = {
        ...standing,
        k1: end ? [60, 126] : [78, 144],
        f1: [57, 177],
        k2: end ? [133, 157] : [130, 136],
        f2: k === "bulgarian" ? [153, 134] : [159, 179],
        hip: end ? [100, 122] : [95, 112],
      };
      q = (
        <>
          {dumb(p.w1)}
          {dumb(p.w2!)}
          {k === "bulgarian" && <path d="M138 141h42m-34 0v39m26-39v39" />}
          {k === "stepup" && <path d="M39 145h49v35H39z" />}
        </>
      );
    }
    if (k === "kickback") {
      p = {
        ...standing,
        h: [78, 54],
        s: [92, 74],
        hip: [115, 115],
        k1: [105, 149],
        f1: [101, 179],
        k2: end ? [144, 129] : [127, 151],
        f2: end ? [175, 143] : [133, 178],
        e1: [66, 86],
        w1: [40, 93],
      };
      q = (
        <>
          <path d="M30 179V30h18v149M30 165h22" />
          <path d={`M40 167L${p.f2![0]} ${p.f2![1]}`} />
          <circle cx={p.f2![0]} cy={p.f2![1]} r="4" />
        </>
      );
    }
  } else if (
    [
      "curl",
      "barcurl",
      "hammer",
      "reversecurl",
      "cablecurl",
      "pushdown",
      "rope",
      "overhead",
      "lateral",
      "carry",
      "battlerope",
    ].includes(k)
  ) {
    p = { ...standing };
    if (["curl", "barcurl", "hammer", "reversecurl", "cablecurl"].includes(k)) {
      p.w1 = end ? [65, 63] : [65, 120];
      p.w2 = end ? [126, 63] : [126, 120];
      p.e1 = [67, 96];
      p.e2 = [123, 96];
    } else if (["pushdown", "rope"].includes(k)) {
      p.w1 = end ? [65, 124] : [59, 83];
      p.w2 = end ? [126, 124] : [130, 83];
      p.e1 = [67, 94];
      p.e2 = [123, 94];
    } else if (k === "overhead") {
      p.e1 = [80, 34];
      p.w1 = end ? [84, 12] : [111, 46];
      p.e2 = [106, 34];
      p.w2 = end ? [112, 12] : [119, 46];
    } else if (k === "lateral") {
      p.e1 = end ? [56, 65] : [71, 86];
      p.w1 = end ? [24, 70] : [68, 117];
      p.e2 = end ? [134, 65] : [119, 86];
      p.w2 = end ? [165, 70] : [122, 117];
    } else if (k === "battlerope") {
      p.w1 = end ? [56, 71] : [56, 120];
      p.w2 = end ? [137, 120] : [137, 71];
      q = (
        <path
          d={`M${p.w1[0]} ${p.w1[1]}q-30 20-31 55t-17 45M${p.w2![0]} ${p.w2![1]}q30 20 31 30t17 45`}
        />
      );
    }
    if (["cablecurl", "pushdown", "rope", "overhead"].includes(k))
      q = (
        <>
          {stack}
          <path
            d={`M175 ${k === "cablecurl" ? 169 : 25}L${p.w1[0]} ${p.w1[1]}`}
          />
          <path className="draw-weight" d={`M${p.w1[0]} ${p.w1[1]}h18`} />
        </>
      );
    else if (["barcurl", "reversecurl"].includes(k)) q = bar(p.w1);
    else if (k !== "battlerope")
      q = (
        <>
          {dumb(p.w1)}
          {dumb(p.w2!)}
        </>
      );
  } else if (
    [
      "plank",
      "sideplank",
      "pushup",
      "crunch",
      "reversecrunch",
      "burpee",
      "kneeraise",
      "cablecrunch",
    ].includes(k)
  ) {
    q = <path d="M17 181h172" />;
    if (
      k === "plank" ||
      k === "sideplank" ||
      k === "pushup" ||
      k === "burpee"
    ) {
      p = {
        h: [44, end && k === "pushup" ? 136 : 113],
        s: [60, end && k === "pushup" ? 145 : 130],
        hip: [117, 145],
        k1: [148, 160],
        f1: [174, 177],
        e1: k === "plank" ? [51, 174] : [52, 154],
        w1: k === "plank" ? [27, 174] : [52, 177],
      };
      if (k === "sideplank") {
        p.e2 = [81, 105];
        p.w2 = [87, 69];
      }
      if (k === "burpee" && end)
        p = {
          ...standing,
          h: [95, 24],
          s: [95, 44],
          e1: [65, 29],
          w1: [54, 9],
          e2: [125, 29],
          w2: [136, 9],
        };
    } else if (k === "kneeraise") {
      p = {
        ...standing,
        w1: [48, 25],
        e1: [58, 48],
        w2: [142, 25],
        e2: [134, 48],
        k1: end ? [57, 114] : [82, 145],
        f1: end ? [66, 146] : [76, 178],
      };
      q = <path d="M25 179V19h143v160M45 25h103" />;
    } else if (k === "cablecrunch") {
      p = {
        h: end ? [79, 114] : [82, 60],
        s: end ? [98, 125] : [92, 80],
        hip: [124, 140],
        k1: [111, 176],
        f1: [151, 176],
        e1: [78, 89],
        w1: [76, end ? 115 : 61],
      };
      q = (
        <>
          {stack}
          <path d={`M175 25L${p.w1[0]} ${p.w1[1]}`} />
        </>
      );
    } else {
      p = {
        h: end ? [47, 127] : [36, 157],
        s: end ? [66, 144] : [59, 169],
        hip: [112, end && k === "reversecrunch" ? 155 : 172],
        k1: [136, 128],
        f1: k === "reversecrunch" ? [126, 92] : [163, 176],
        e1: [73, 128],
        w1: [49, 122],
      };
    }
  } else if (["walk", "run", "bike", "elliptical", "stepper"].includes(k)) {
    p = {
      ...standing,
      k1: end ? [122, 130] : [72, 139],
      f1: end ? [143, 162] : [47, 177],
      k2: end ? [76, 142] : [128, 137],
      f2: end ? [61, 179] : [149, 160],
      e1: [64, 83],
      w1: [52, 67],
      e2: [123, 85],
      w2: [137, 70],
    };
    if (k === "bike") {
      p = {
        ...seated,
        h: [89, 57],
        s: [100, 76],
        hip: [95, 120],
        e1: [124, 91],
        w1: [144, 91],
        k1: end ? [115, 123] : [127, 141],
        f1: end ? [127, 156] : [109, 165],
      };
      q = (
        <>
          <circle cx="55" cy="152" r="25" />
          <circle cx="148" cy="152" r="25" />
          <path d="M55 152l42-28 21 28H55m63 0l25-59h12M82 121h26" />
        </>
      );
    } else if (k === "elliptical" || k === "stepper")
      q = (
        <path d="M38 181h127M57 175l74-90 13-42m-22 129l-51-82-9-39M42 172h37m46 0h37" />
      );
    else q = <path d="M25 183h152v-8H25m128-1V78h-26" />;
  } else if (k.startsWith("stretch-")) {
    p = { ...standing };
    if (k === "stretch-chest") {
      p.e1 = [48, 64];
      p.w1 = [48, 31];
      q = <path d="M36 18v162" />;
    }
    if (k === "stretch-lat") {
      p = {
        ...standing,
        h: [75, 92],
        s: [95, 97],
        hip: [140, 121],
        e1: [58, 98],
        w1: [25, 101],
        k1: [131, 149],
        f1: [123, 179],
      };
      q = <path d="M16 108h49m-40 0v71" />;
    }
    if (k === "stretch-quad") {
      p.k2 = [115, 143];
      p.f2 = [139, 112];
      p.e2 = [132, 96];
      p.w2 = [139, 112];
    }
    if (k === "stretch-ham") {
      p = {
        ...standing,
        h: [70, 78],
        s: [84, 94],
        hip: [111, 119],
        k1: [80, 148],
        f1: [46, 179],
        k2: [131, 150],
        f2: [141, 179],
        e1: [70, 119],
        w1: [65, 145],
      };
    }
    if (k === "stretch-glute") {
      p = {
        h: [35, 154],
        s: [55, 173],
        hip: [113, 173],
        k1: [118, 126],
        f1: [158, 141],
        k2: [146, 123],
        f2: [120, 142],
        e1: [85, 139],
        w1: [123, 128],
      };
      q = <path d="M18 182h168" />;
    }
    if (k === "stretch-calf") {
      p = {
        ...standing,
        h: [70, 43],
        s: [78, 63],
        hip: [100, 113],
        k1: [68, 141],
        f1: [52, 179],
        k2: [132, 144],
        f2: [157, 179],
        e1: [44, 72],
        w1: [25, 62],
      };
      q = <path d="M20 20v161" />;
    }
    if (!end) {
      p = { ...p, s: [p.s[0] + 3, p.s[1] - 4] };
    }
  }
  return { pose: p, equipment: q };
}
function Drawing({ exercise, end }: { exercise: Exercise; end: boolean }) {
  const { pose: p, equipment } = frame(exercise, end);
  const path = (points: P[]) =>
    points.map((v, i) => `${i ? "L" : "M"}${v.join(" ")}`).join(" ");
  return (
    <svg
      viewBox="0 0 205 200"
      role="img"
      aria-label={`${exercise.name}: ${end ? "конечное" : "начальное"} положение`}
    >
      <g className="draw-equipment">{equipment}</g>
      <g className="draw-person">
        {exercise.kind === "glutehyper" ? (
          <path
            d={`M${p.s.join(" ")}Q${p.s[0] - 3} ${p.s[1] + 18} ${p.hip.join(" ")}`}
          />
        ) : (
          <path d={path([p.s, p.hip])} />
        )}
        <path d={path([p.hip, p.k1, p.f1])} />
        {p.k2 && p.f2 && <path d={path([p.hip, p.k2, p.f2])} />}
        <path d={path([p.s, p.e1, p.w1])} />
        {p.e2 && p.w2 && <path d={path([p.s, p.e2, p.w2])} />}
        <path d={path([p.h, p.s])} />
        <circle cx={p.h[0]} cy={p.h[1]} r="10" />
      </g>
      {exercise.kind === "glutehyper" && (
        <ellipse
          cx={p.hip[0] - 1}
          cy={p.hip[1]}
          rx="11"
          ry="8"
          fill="#dfae89"
        />
      )}
      <circle className="draw-joint" cx={p.hip[0]} cy={p.hip[1]} r="4" />
      <circle className="draw-joint" cx={p.s[0]} cy={p.s[1]} r="4" />
    </svg>
  );
}
export function Illustration({
  exercise,
  small = false,
}: {
  exercise: Exercise;
  small?: boolean;
}) {
  if (exercise.custom && !exercise.image)
    return (
      <div className={small ? "exercise-thumb custom-empty" : "notice"}>
        {small
          ? "＋"
          : "Для этого пользовательского упражнения иллюстрация не добавлена. Смотрите текстовую технику."}
      </div>
    );
  if (exercise.image)
    return (
      <img
        className={small ? "exercise-thumb" : "custom-image"}
        src={exercise.image}
        alt={exercise.name}
        onError={(e) => {
          e.currentTarget.alt =
            "Изображение недоступно. Текстовая техника ниже.";
        }}
      />
    );
  return (
    <div className={small ? "exercise-thumb" : "illustration"}>
      {small ? (
        <Drawing exercise={exercise} end={false} />
      ) : (
        <>
          <div>
            <Drawing exercise={exercise} end={false} />
            <span>01 · Исходное положение</span>
          </div>
          <div>
            <Drawing exercise={exercise} end />
            <span>
              {exercise.measure === "time"
                ? "02 · Удержание / движение"
                : "02 · Выполнение"}
            </span>
          </div>
          <p>Схема движения · выполняйте плавно и без боли</p>
        </>
      )}
    </div>
  );
}
