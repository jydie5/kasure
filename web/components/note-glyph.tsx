import type { Accent } from "@/lib/notes-types";

// ノート ID から決まる「表紙の書」。同じノートは常に同じ絵になる。
// 円相・雨・枯山水・日輪・青海波の 5 系統を、ID 由来の乱数でゆらがせる。

const ACCENT_VAR: Record<Accent, string> = {
  sumi: "var(--ink)",
  shu: "var(--shu)",
  ai: "var(--ai)",
  matcha: "var(--matcha)",
  kin: "var(--kin)",
};

function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 400;
const H = 500;
const r2 = (n: number) => Math.round(n * 100) / 100;

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${r2(x0)} ${r2(y0)}A${r2(r)} ${r2(r)} 0 ${large} 1 ${r2(x1)} ${r2(y1)}`;
}

function Enso({ rand, accent }: { rand: () => number; accent: string }) {
  // 入りで太く、抜けで細くかすれる一筆の円。外形をポリゴンで描き、かすれ線を重ねる
  const cx = W / 2 + (rand() - 0.5) * 24;
  const cy = H * 0.43 + (rand() - 0.5) * 24;
  const r = 122 + rand() * 26;
  const start = rand() * Math.PI * 2;
  const sweep = Math.PI * (1.66 + rand() * 0.26);
  const maxW = 26 + rand() * 12;
  const steps = 140;
  const wobble = rand() * 1000;
  const point = (t: number, side: number) => {
    const a = start + sweep * t;
    const width = maxW * (0.86 + 0.14 * Math.sin(t * Math.PI)) * (1 - Math.pow(t, 2.2) * 0.92);
    const rr = r + Math.sin(t * 9 + wobble) * 3 + side * width * 0.5;
    return `${r2(cx + rr * Math.cos(a))} ${r2(cy + rr * Math.sin(a))}`;
  };
  const outer = Array.from({ length: steps + 1 }, (_, i) => point(i / steps, 1));
  const inner = Array.from({ length: steps + 1 }, (_, i) => point(1 - i / steps, -1));
  const body = `M${outer.join("L")}L${inner.join("L")}Z`;
  const streaks = Array.from({ length: 18 }, (_, i) => {
    const off = (i / 17 - 0.5) * maxW * 0.9;
    const t0 = 0.62 + rand() * 0.22;
    const t1 = Math.min(1.04, t0 + 0.2 + rand() * 0.25);
    const a0 = start + sweep * t0;
    const a1 = start + sweep * t1;
    return (
      <path
        key={i}
        d={arc(cx, cy, r + off * (1 - t0 * 0.6), a0, a1)}
        stroke={accent}
        strokeWidth={0.6 + rand() * 1.6}
        strokeDasharray={`${8 + rand() * 40} ${2 + rand() * 14}`}
        strokeOpacity={0.5 + rand() * 0.4}
        fill="none"
        strokeLinecap="round"
      />
    );
  });
  return (
    <g>
      <path d={body} fill={accent} />
      {streaks}
      <circle cx={r2(cx + r * Math.cos(start))} cy={r2(cy + r * Math.sin(start))} r={r2(maxW * 0.45)} fill={accent} />
    </g>
  );
}

function Rain({ rand, accent }: { rand: () => number; accent: string }) {
  const cols = 9 + Math.floor(rand() * 6);
  const gap = (W - 80) / (cols - 1);
  const hi = Math.floor(rand() * cols);
  return (
    <g>
      {Array.from({ length: cols }, (_, i) => {
        const x = 40 + i * gap;
        const y0 = 50 + rand() * 60;
        const len = 120 + rand() * 260;
        const isHi = i === hi;
        return (
          <g key={i}>
            <line
              x1={x}
              x2={x}
              y1={y0}
              y2={y0 + len}
              stroke={isHi ? accent : "var(--ink)"}
              strokeWidth={isHi ? 3 : 1.2}
              strokeLinecap="round"
              strokeOpacity={isHi ? 1 : 0.55}
            />
            {rand() > 0.55 && <circle cx={x} cy={y0 + len + 14} r={2.2} fill="var(--ink)" fillOpacity={0.5} />}
          </g>
        );
      })}
    </g>
  );
}

function Karesansui({ rand, accent }: { rand: () => number; accent: string }) {
  const stones = Array.from({ length: 2 + Math.floor(rand() * 2) }, (_, i) => ({
    x: 90 + rand() * 220,
    y: 140 + rand() * 230,
    r: 22 + rand() * (i === 0 ? 34 : 18),
  }));
  const rings = stones.flatMap((s, si) =>
    Array.from({ length: 6 }, (_, k) => (
      <circle
        key={`${si}-${k}`}
        cx={s.x}
        cy={s.y}
        r={s.r + 12 + k * 11}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={0.28 - k * 0.035}
        strokeWidth={1}
      />
    )),
  );
  const lines = Array.from({ length: 30 }, (_, i) => {
    const y = 30 + i * 15;
    return <line key={i} x1={24} x2={W - 24} y1={y} y2={y} stroke="var(--ink)" strokeOpacity={0.09} strokeWidth={1} />;
  });
  return (
    <g>
      {lines}
      {rings}
      {stones.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i === 0 ? accent : "var(--ink)"} fillOpacity={i === 0 ? 1 : 0.86} />
      ))}
    </g>
  );
}

function Nichirin({ rand, accent }: { rand: () => number; accent: string }) {
  const horizon = 270 + rand() * 80;
  const r = 70 + rand() * 50;
  const cx = 120 + rand() * 160;
  return (
    <g>
      <defs>
        <clipPath id={`sky-${Math.round(horizon)}`}>
          <rect x={0} y={0} width={W} height={horizon} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={horizon - r * 0.35} r={r} fill={accent} clipPath={`url(#sky-${Math.round(horizon)})`} />
      {Array.from({ length: 12 }, (_, i) => {
        const y = horizon + 10 + i * (8 + i * 1.6);
        const inset = (rand() * 0.4 + 0.1) * W * (1 - i / 14);
        return (
          <line
            key={i}
            x1={cx - inset}
            x2={cx + inset}
            y1={y}
            y2={y}
            stroke={i % 3 === 0 ? accent : "var(--ink)"}
            strokeOpacity={0.75 - i * 0.05}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        );
      })}
      <line x1={28} x2={W - 28} y1={horizon} y2={horizon} stroke="var(--ink)" strokeWidth={1.2} />
    </g>
  );
}

function Seigaiha({ rand, accent }: { rand: () => number; accent: string }) {
  const R = 34 + Math.floor(rand() * 10);
  const shapes = [];
  const hiRow = Math.floor(rand() * 6);
  for (let row = 0; row * (R / 2) < H + R; row++) {
    const y = row * (R / 2) + 40;
    const offset = row % 2 ? R : 0;
    for (let x = -R + offset; x < W + R; x += R * 2) {
      for (let k = 0; k < 3; k++) {
        const rr = R - k * (R / 3.2);
        shapes.push(
          <path
            key={`${row}-${x}-${k}`}
            d={arc(x, y, rr, Math.PI, Math.PI * 2)}
            fill={k === 0 ? "var(--paper-2)" : "none"}
            stroke={row % 6 === hiRow ? accent : "var(--ink)"}
            strokeOpacity={row % 6 === hiRow ? 0.9 : 0.42}
            strokeWidth={1.1}
          />,
        );
      }
    }
  }
  return <g>{shapes}</g>;
}

const VARIANTS = [Enso, Rain, Karesansui, Nichirin, Seigaiha];

export function NoteGlyph({ id, title, accent }: { id: string; title: string; accent: Accent }) {
  const rand = seeded(id);
  const Variant = VARIANTS[Math.floor(rand() * VARIANTS.length)];
  const color = ACCENT_VAR[accent] ?? ACCENT_VAR.sumi;
  const seal = Array.from(title.trim())[0] ?? "白";
  const sealAngle = (rand() - 0.5) * 8;

  return (
    <svg className="glyph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={title}>
      <rect width={W} height={H} fill="var(--paper-2)" />
      {Variant({ rand, accent: color })}
      <g transform={`translate(${W - 74} ${H - 82}) rotate(${sealAngle} 22 22)`}>
        <rect width={44} height={44} rx={3} fill="var(--shu)" />
        <text
          x={22}
          y={23}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-shippori), serif"
          fontWeight={800}
          fontSize={26}
          fill="var(--paper)"
        >
          {seal}
        </text>
      </g>
    </svg>
  );
}
