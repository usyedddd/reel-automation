import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useTheme } from "../theme/tokens";
import { BlurWords } from "./BlurWords";
import { Stage } from "./Stage";
import { blurIn, easeInOut, easeOut, enterP, exitP, floatY } from "./motion";
import {
  Badge,
  Cursor,
  FloorGlow,
  GlassCard,
  Pill,
  Robot,
  SpherePerson,
  StrikeX,
  Waveform,
} from "./primitives";
import { KIT, FONT, accentInk, inkFor, isLightBg } from "./tokens";
import type {
  KitBarsProps,
  KitChartProps,
  KitElement,
  KitEndProps,
  KitFollowProps,
  KitFootageProps,
  KitNumberProps,
  KitStageProps,
  KitStatementProps,
} from "./types";

type Timed = { durationSec: number };

const resolveSrc = (src: string) => (/^https?:/.test(src) ? src : staticFile(src));
const isVideo = (src: string) => /\.(mp4|mov|webm|m4v)$/i.test(src);

const formatCount = (v: number, decimals = 0) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/* ------------------------------------------------------------------ */
/* statement — word-by-word blur-in statement on a clean stage       */
/* ------------------------------------------------------------------ */

export const KitStatement: React.FC<KitStatementProps & Timed> = ({
  bg,
  camera = "push",
  lines,
  y = 0.5,
  align = "center",
  kicker,
  spotlightAt,
  durationSec,
}) => {
  const theme = useTheme();
  const light = isLightBg(bg);
  return (
    <Stage bg={bg} camera={camera} durationSec={durationSec} spotlightAt={spotlightAt}>
      {kicker && <Kicker text={kicker} light={light} />}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y * 1920,
          transform: "translateY(-50%)",
          display: "flex",
          justifyContent: align === "center" ? "center" : "flex-start",
          padding: align === "left" ? "0 90px" : 0,
        }}
      >
        <BlurWords lines={lines} light={light} accent={accentInk(theme.accent, light)} align={align} width={940} />
      </div>
    </Stage>
  );
};

const Kicker: React.FC<{ text: string; light: boolean }> = ({ text, light }) => (
  <div
    style={{
      position: "absolute",
      top: 330,
      left: 90,
      fontFamily: FONT.sans,
      fontSize: 24,
      fontWeight: 500,
      color: light ? KIT.mutedInk : KIT.muted,
    }}
  >
    {text}
  </div>
);

/* ------------------------------------------------------------------ */
/* stage — composable figures (robots, people, cards, badges, pills) */
/* ------------------------------------------------------------------ */

const DEFAULT_SIZE: Record<KitElement["kind"], number> = {
  robot: 190,
  person: 300,
  card: 520,
  badge: 220,
  pill: 72,
  text: 44,
  image: 360,
  number: 150,
};

const StageElement: React.FC<{ el: KitElement; index: number; light: boolean; accent: string }> = ({
  el,
  index,
  light,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = el.size ?? DEFAULT_SIZE[el.kind];
  const p = enterP(frame, fps, el.at ?? 0, 14) * exitP(frame, fps, el.out);
  const bob = el.still ? 0 : floatY(frame, fps, index, el.kind === "text" ? 0 : 6);
  const strike =
    el.strikeAt === undefined
      ? 0
      : interpolate(frame, [el.strikeAt * fps, el.strikeAt * fps + 9], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easeOut,
        });
  const ink = light ? KIT.ink : KIT.white;

  let body: React.ReactNode = null;
  switch (el.kind) {
    case "robot": {
      const blinkPhase = ((frame + index * 23) % 110) / 110;
      const blink = blinkPhase > 0.94 ? Math.sin(((blinkPhase - 0.94) / 0.06) * Math.PI) : 0;
      body = <Robot size={size} accent={accent} glow={el.glow ?? true} blink={blink} />;
      break;
    }
    case "person":
      body = <SpherePerson size={size} accent={accent} glow={el.glow} mood={el.mood} light={light} />;
      break;
    case "card":
      body = (
        <GlassCard
          width={size}
          title={el.label}
          sub={el.sub}
          value={el.value}
          src={el.src}
          bw={!el.color}
          light={light}
          accent={accent}
          highlight={el.glow}
        />
      );
      break;
    case "badge":
      body = (
        <Badge
          size={size}
          label={el.label ?? ""}
          accent={accent}
          variant={el.variant === "brand" || el.variant === "accent" ? el.variant : "chrome"}
          light={light}
        />
      );
      break;
    case "pill":
      body = (
        <Pill
          label={el.label ?? ""}
          height={size}
          accent={accent}
          variant={el.variant === "glass" || el.variant === "accent" ? el.variant : "white"}
        />
      );
      break;
    case "text":
      body = (
        <div
          style={{
            fontFamily: FONT[el.font ?? "sans"],
            fontWeight: el.weight ?? (el.font === "display" ? 400 : 500),
            fontSize: size,
            color: el.glow ? accentInk(accent, light) : ink,
            whiteSpace: "pre",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {el.label}
        </div>
      );
      break;
    case "image":
      body = el.src ? (
        <Img
          src={resolveSrc(el.src)}
          style={{
            width: size,
            borderRadius: size * 0.06,
            filter: el.color ? undefined : "grayscale(1) contrast(1.06)",
            boxShadow: light ? "0 24px 60px rgba(0,0,0,0.15)" : "0 30px 80px rgba(0,0,0,0.8)",
          }}
        />
      ) : null;
      break;
    case "number": {
      const cp = interpolate(frame, [(el.at ?? 0) * fps, (el.at ?? 0) * fps + 0.9 * fps], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easeOut,
      });
      const text =
        el.countTo !== undefined
          ? `${el.prefix ?? ""}${formatCount(el.countTo * cp, el.decimals ?? 0)}${el.suffix ?? ""}`
          : el.label ?? "";
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              fontFamily: el.font === "display" ? FONT.display : FONT.sans,
              fontWeight: el.font === "display" ? 400 : 800,
              fontSize: size,
              letterSpacing: "-0.02em",
              color: el.glow ? accentInk(accent, light) : ink,
              lineHeight: 1,
            }}
          >
            {text}
          </div>
          {el.sub && (
            <div style={{ fontFamily: FONT.sans, fontSize: size * 0.22, color: light ? KIT.mutedInk : KIT.muted, marginTop: 8 }}>
              {el.sub}
            </div>
          )}
        </div>
      );
      break;
    }
  }

  const caption =
    (el.kind === "robot" || el.kind === "person") && el.label ? (
      <div
        style={{
          marginTop: 12,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: Math.max(32, size * 0.16),
          color: ink,
          textAlign: "center",
        }}
      >
        {el.label}
      </div>
    ) : null;

  return (
    <div
      style={{
        position: "absolute",
        left: el.x,
        top: el.y + bob,
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", ...blurIn(p, 22, 16) }}>
        <div style={{ position: "relative" }}>
          {body}
          {strike > 0 && <StrikeX p={strike} stroke={Math.max(8, Math.min(16, size * 0.05))} />}
        </div>
        {caption}
      </div>
    </div>
  );
};

/** Approximate half-extent of an element along direction (dx, dy), plus a gap. */
const edgeRadius = (el: KitElement, dx: number, dy: number): number => {
  const size = el.size ?? DEFAULT_SIZE[el.kind];
  const gap = 18;
  const box = (hw: number, hh: number) =>
    Math.min(Math.abs(dx) > 1e-3 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-3 ? hh / Math.abs(dy) : Infinity) + gap;
  switch (el.kind) {
    case "card":
      return box(size / 2, size * 0.16 + (el.value ? 40 : 0));
    case "pill":
      return box(size * 2.4, size / 2);
    case "robot":
      return box(size * 0.45, size * 0.45);
    case "person":
      return box(size * 0.45, size * 0.48);
    case "badge":
      return size / 2 + gap;
    case "number":
      return box(size * 1.4, size * 0.6);
    case "text":
      return box(size * 3, size * 0.7);
    case "image":
      return box(size / 2, size * 0.35);
  }
};

export const KitStage: React.FC<KitStageProps & Timed> = ({
  bg,
  camera = "push",
  elements,
  links = [],
  title,
  floorGlow = true,
  spotlightAt,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = isLightBg(bg);
  return (
    <Stage bg={bg} camera={camera} durationSec={durationSec} spotlightAt={spotlightAt}>
      {floorGlow && (
        <FloorGlow color={light ? theme.accent : theme.accent} y={1250} strength={light ? 0.1 : 0.14} />
      )}
      {title && (
        <div
          style={{
            position: "absolute",
            top: title.y ?? 420,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: 40,
            color: light ? KIT.ink : KIT.white,
            ...blurIn(enterP(frame, fps, title.at ?? 0), 12, 10),
          }}
        >
          {title.text}
        </div>
      )}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {links.map((l, i) => {
          const ea = elements[l.from];
          const eb = elements[l.to];
          if (!ea || !eb) return null;
          // stop the line at each element's edge so it never runs through text
          const ux = eb.x - ea.x;
          const uy = eb.y - ea.y;
          const ul = Math.hypot(ux, uy) || 1;
          const a = { x: ea.x + (ux / ul) * edgeRadius(ea, ux / ul, uy / ul), y: ea.y + (uy / ul) * edgeRadius(ea, ux / ul, uy / ul) };
          const b = { x: eb.x - (ux / ul) * edgeRadius(eb, -ux / ul, -uy / ul), y: eb.y - (uy / ul) * edgeRadius(eb, -ux / ul, -uy / ul) };
          const p = interpolate(frame, [(l.at ?? 0) * fps, (l.at ?? 0) * fps + 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeInOut,
          });
          const mx = (a.x + b.x) / 2 - (b.y - a.y) * (l.bend ?? 0) * 0.5;
          const my = (a.y + b.y) / 2 + (b.x - a.x) * (l.bend ?? 0) * 0.5;
          const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
          const len = Math.hypot(b.x - a.x, b.y - a.y) * 1.2 + 1;
          const stroke = light ? "rgba(15,15,15,0.45)" : "rgba(255,255,255,0.55)";
          const flowT = ((frame / fps) * 0.7 + i * 0.37) % 1;
          const q = (t: number) => ({
            x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x,
            y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y,
          });
          const dot = q(flowT);
          return (
            <g key={i} opacity={p}>
              <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={2.5}
                strokeDasharray={l.style === "dotted" ? "2 12" : `${len}`}
                strokeDashoffset={l.style === "dotted" ? 0 : len * (1 - p)}
                strokeLinecap="round"
              />
              {l.flow && p > 0.95 && (
                <circle cx={dot.x} cy={dot.y} r={7} fill={KIT.white} style={{ filter: `drop-shadow(0 0 10px ${theme.accent})` }} />
              )}
            </g>
          );
        })}
      </svg>
      {elements.map((el, i) => (
        <StageElement key={i} el={el} index={i} light={light} accent={theme.accent} />
      ))}
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* chart — glowing growth curve that re-scales as values climb       */
/* ------------------------------------------------------------------ */

export const KitChart: React.FC<KitChartProps & Timed> = ({ bg, title, points, brackets = [], rescale = true, durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = isLightBg(bg);
  const accentLine = accentInk(theme.accent, light);
  const t = frame / fps;
  const X0 = 150;
  const X1 = 930;
  const Y0 = 1260; // baseline
  const H = 560;
  const n = points.length;
  const xs = points.map((_, i) => X0 + ((X1 - X0) * (i + 0.5)) / Math.max(1, n));
  // progress of the line towards each point (0..1)
  const seg = points.map((pt) => interpolate(t, [pt.at - 0.55, pt.at], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut }));
  const reached = points.filter((_, i) => seg[i] > 0.02);
  // The first point is the baseline: keep it low (~1/3 height) until bigger
  // values arrive, then zoom the axis out so it visibly shrinks.
  const floor = Math.max(1e-9, (points[0]?.value ?? 1) * 3.2);
  const maxOf = (pts: KitChartProps["points"]) =>
    Math.max(floor, ...pts.map((pt) => pt.value * 1.18));
  const targetMax = maxOf(rescale && reached.length ? reached : points);
  // ease the domain towards the newest max for the "camera zoom-out" feel
  const prevMax = maxOf(rescale && reached.length > 1 ? reached.slice(0, -1) : rescale ? [] : points);
  const lastIdx = Math.max(0, reached.length - 1);
  const domainMax = rescale ? prevMax + (targetMax - prevMax) * seg[lastIdx] : targetMax;
  const yOf = (v: number) => Y0 - (Math.min(v, domainMax) / domainMax) * H;
  // the line starts level with the baseline value (flat lead-in, no fake spike)
  const startX = X0;
  const startY = yOf(points[0]?.value ?? 0);
  // build the visible path
  let d = `M ${startX} ${startY}`;
  let tipX = startX;
  let tipY = startY;
  let px = startX;
  let py = startY;
  for (let i = 0; i < n; i++) {
    if (seg[i] <= 0) break;
    const tx = xs[i];
    const ty = yOf(points[i].value);
    const cx1 = px + (tx - px) * 0.55;
    const cy1 = py;
    const cx2 = px + (tx - px) * 0.75;
    const cy2 = ty;
    const s = seg[i];
    // de Casteljau split at s
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const ax = lerp(px, cx1, s), ay = lerp(py, cy1, s);
    const bx = lerp(cx1, cx2, s), by = lerp(cy1, cy2, s);
    const cxx = lerp(cx2, tx, s), cyy = lerp(cy2, ty, s);
    const dx = lerp(ax, bx, s), dy = lerp(ay, by, s);
    const ex = lerp(bx, cxx, s), ey = lerp(by, cyy, s);
    const fx = lerp(dx, ex, s), fy = lerp(dy, ey, s);
    d += ` C ${ax} ${ay} ${dx} ${dy} ${fx} ${fy}`;
    tipX = fx;
    tipY = fy;
    px = tx;
    py = ty;
    if (s < 1) break;
  }
  const ink = light ? KIT.ink : KIT.white;
  const grid = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const appear = enterP(frame, fps, 0, 12);
  return (
    <Stage bg={bg} camera="push" durationSec={durationSec}>
      <FloorGlow color={theme.accent} y={Y0 + 40} strength={light ? 0.22 : 0.28} />
      {title && (
        <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", fontFamily: FONT.sans, fontWeight: 500, fontSize: 44, color: ink, ...blurIn(appear) }}>
          {title}
        </div>
      )}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: appear }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={X0 + i * ((X1 - X0) / 8)} x2={X0 + i * ((X1 - X0) / 8)} y1={Y0 - H - 40} y2={Y0} stroke={grid} strokeWidth={1.5} />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h${i}`} x1={X0} x2={X1} y1={Y0 - i * ((H + 40) / 5)} y2={Y0 - i * ((H + 40) / 5)} stroke={grid} strokeWidth={1.5} />
        ))}
        <line x1={X0} y1={Y0 - H - 60} x2={X0} y2={Y0} stroke={ink} strokeOpacity={0.7} strokeWidth={2.5} />
        <line x1={X0} y1={Y0} x2={X1 + 20} y2={Y0} stroke={ink} strokeOpacity={0.7} strokeWidth={2.5} />
        <path d={d} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${theme.accent}88)` }} />
        <circle cx={tipX} cy={tipY} r={17} fill={light ? "#FFFFFF" : "#1B1C1E"} stroke={accentLine} strokeWidth={4} />
        <circle cx={tipX} cy={tipY} r={6} fill={accentLine} />
        {brackets.map((b, i) => {
          const bp = enterP(frame, fps, b.at ?? points[b.to]?.at ?? 0, 10);
          const x1 = b.from < 0 ? X0 : xs[b.from] ?? X0;
          const x2 = xs[b.to] ?? X1;
          return (
            <g key={i} opacity={bp}>
              <path d={`M ${x1} ${Y0 + 34} L ${x1} ${Y0 + 50} L ${x2} ${Y0 + 50} L ${x2} ${Y0 + 34}`} fill="none" stroke={ink} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="6 6" />
              <text x={(x1 + x2) / 2} y={Y0 + 92} textAnchor="middle" fontFamily={FONT.sans} fontSize={30} fill={ink} fillOpacity={0.8}>
                {b.text}
              </text>
            </g>
          );
        })}
      </svg>
      {points.map((pt, i) => {
        if (!pt.label) return null;
        const lp = enterP(frame, fps, pt.at - 0.05, 10);
        const latest = i === lastIdx;
        const x = xs[i];
        const y = yOf(pt.value);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + 26,
              top: y - (latest ? 92 : 58),
              fontFamily: FONT.display,
              fontSize: latest ? 76 : 40,
              color: ink,
              opacity: lp * (latest ? 1 : 0.55),
              filter: lp >= 0.999 ? undefined : `blur(${(1 - lp) * 10}px)`,
              whiteSpace: "nowrap",
            }}
          >
            {pt.label}
          </div>
        );
      })}
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* bars — chrome bars, the "new way" bar lit in the accent           */
/* ------------------------------------------------------------------ */

export const KitBars: React.FC<KitBarsProps & Timed> = ({ bg, title, bars, durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = isLightBg(bg);
  const ink = inkFor(bg);
  const accentText = accentInk(theme.accent, light);
  const max = Math.max(...bars.map((b) => b.value)) * 1.1;
  const gap = 46;
  const barW = Math.min(220, (840 - gap * (bars.length - 1)) / bars.length);
  const totalW = bars.length * barW + (bars.length - 1) * gap;
  const left0 = (1080 - totalW) / 2;
  const base = 1330;
  const H = 640;
  return (
    <Stage bg={bg} camera="push" durationSec={durationSec}>
      <FloorGlow color={theme.accent} y={base} strength={light ? 0.12 : 0.16} />
      {title && (
        <div style={{ position: "absolute", top: 480, left: 0, right: 0, textAlign: "center", fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, color: light ? KIT.mutedInk : KIT.muted, ...blurIn(enterP(frame, fps, 0)) }}>
          {title}
        </div>
      )}
      {bars.map((b, i) => {
        const p = interpolate(frame, [(b.at ?? 0.2 + i * 0.35) * fps, (b.at ?? 0.2 + i * 0.35) * fps + 20], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easeOut,
        });
        const h = (b.value / max) * H * p;
        const x = left0 + i * (barW + gap);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: base - h,
                width: barW,
                height: h,
                borderRadius: "10px 10px 2px 2px",
                background: b.accent
                  ? `linear-gradient(180deg, ${theme.accent} 0%, ${theme.accent}66 70%, ${theme.accent}22 100%)`
                  : light
                    ? "linear-gradient(100deg, #FFFFFF 0%, #C9CBD0 45%, #F4F5F7 60%, #9EA1A7 100%)"
                    : "linear-gradient(100deg, #F4F5F7 0%, #8D9096 35%, #3A3B3F 55%, #C9CBD0 75%, #4B4D52 100%)",
                boxShadow: b.accent ? `0 0 50px ${theme.accent}66` : undefined,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x - 40,
                width: barW + 80,
                top: base - h - 84,
                textAlign: "center",
                fontFamily: FONT.display,
                fontSize: 60,
                color: b.accent ? accentText : ink,
                opacity: p,
              }}
            >
              {b.display ?? ""}
            </div>
            <div
              style={{
                position: "absolute",
                left: x - 40,
                width: barW + 80,
                top: base + 20,
                textAlign: "center",
                fontFamily: FONT.sans,
                fontWeight: 600,
                fontSize: 30,
                color: b.accent ? accentText : ink,
                opacity: Math.min(1, p * 2),
              }}
            >
              {b.label}
            </div>
          </React.Fragment>
        );
      })}
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* number — one huge number / year, optional count-up                */
/* ------------------------------------------------------------------ */

export const KitNumber: React.FC<KitNumberProps & Timed> = ({
  bg,
  camera = "push",
  value,
  countTo,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  sub,
  font = "sans",
  at = 0.1,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = isLightBg(bg);
  const ink = inkFor(bg);
  const p = enterP(frame, fps, at, 14);
  const cp = interpolate(frame, [at * fps, at * fps + 1.1 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const text = countTo !== undefined ? `${prefix}${formatCount(countTo * cp, decimals)}${suffix}` : value ?? "";
  // auto-fit: size from the FINAL string so the number never grows mid-count
  const finalText = countTo !== undefined ? `${prefix}${formatCount(countTo, decimals)}${suffix}` : value ?? "";
  const maxSize = font === "display" ? 260 : 210;
  const perChar = font === "display" ? 0.5 : 0.66; // approx glyph width / font size
  const fitSize = Math.min(maxSize, 920 / Math.max(1, finalText.length * perChar));
  return (
    <Stage bg={bg} camera={camera} durationSec={durationSec}>
      <FloorGlow color={theme.accent} y={1100} strength={light ? 0.1 : 0.12} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {label && (
          <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 44, color: ink, marginBottom: 18, ...blurIn(enterP(frame, fps, Math.min(0.12, Math.max(0, at - 0.2)))) /* label lands on entry */ }}>
            {label}
          </div>
        )}
        <div
          style={{
            fontFamily: font === "display" ? FONT.display : FONT.sans,
            fontWeight: font === "display" ? 400 : 800,
            fontSize: fitSize,
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
            lineHeight: 1,
            color: ink,
            ...blurIn(p, 30, 22),
          }}
        >
          {text}
        </div>
        {sub && (
          <div style={{ fontFamily: FONT.sans, fontSize: 36, color: light ? KIT.mutedInk : KIT.muted, marginTop: 24, ...blurIn(enterP(frame, fps, at + 0.4)) }}>
            {sub}
          </div>
        )}
      </AbsoluteFill>
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* footage — B&W real footage with hook caption / nameplate          */
/* ------------------------------------------------------------------ */

export const KitFootage: React.FC<KitFootageProps & Timed> = ({
  src,
  from = 0,
  grade = "none",
  caption,
  nameplate,
  credit,
  focusX = 0.5,
  zoomDir = "in",
  serifTitle,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.max(1, Math.round(durationSec * fps));
  const z = zoomDir === "none" ? 1 : interpolate(frame, [0, total], zoomDir === "in" ? [1, 1.08] : [1.08, 1], { extrapolateRight: "clamp" });
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${focusX * 100}% 50%`,
    filter: grade === "bw" ? "grayscale(1) contrast(1.12) brightness(0.92)" : undefined,
  };
  return (
    <AbsoluteFill style={{ background: KIT.bgBlack, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${z})` }}>
        {isVideo(src) ? (
          <OffthreadVideo src={resolveSrc(src)} startFrom={Math.round(from * fps)} muted style={style} />
        ) : (
          <Img src={resolveSrc(src)} style={style} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)" }} />
      {caption && (
        <div
          style={{
            position: "absolute",
            top: 820,
            left: 70,
            right: 70,
            textAlign: "center",
            fontFamily: FONT.sans,
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.15,
            textTransform: "uppercase",
            color: KIT.white,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
            ...blurIn(enterP(frame, fps, 0.05)),
          }}
        >
          {caption}
        </div>
      )}
      {serifTitle && (
        <div
          style={{
            position: "absolute",
            top: 820,
            left: 60,
            right: 60,
            textAlign: "center",
            fontFamily: FONT.serif,
            fontSize: 110,
            lineHeight: 1,
            color: KIT.white,
            textShadow: "0 6px 30px rgba(0,0,0,0.7)",
            ...blurIn(enterP(frame, fps, 0.1), 20, 16),
          }}
        >
          {serifTitle}
        </div>
      )}
      {nameplate && (
        <div style={{ position: "absolute", left: 80, bottom: 470, ...blurIn(enterP(frame, fps, 0.3)) }}>
          <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 40, color: KIT.white }}>{nameplate.name}</div>
          {nameplate.title && <div style={{ fontFamily: FONT.sans, fontSize: 28, color: "rgba(255,255,255,0.75)" }}>{nameplate.title}</div>}
        </div>
      )}
      {credit && (
        <div style={{ position: "absolute", bottom: 300, width: "100%", textAlign: "center", fontFamily: FONT.sans, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>
          {credit}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* end — brand sign-off: logo disc + live waveform                   */
/* ------------------------------------------------------------------ */

export const BrandDisc: React.FC<{ size: number; mark: string }> = ({ size, mark }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle at 35% 30%, #1E1F22 0%, #000000 70%)",
      border: `${Math.max(2, size * 0.02)}px solid #FFFFFF`,
      boxShadow: `0 0 ${size * 0.4}px rgba(255,255,255,0.12)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT.sans,
      fontWeight: 700,
      fontSize: size * 0.4,
      letterSpacing: "-0.04em",
      color: "#FFFFFF",
    }}
  >
    {mark}
  </div>
);

/** Default disc mark: first two letters/digits of the handle ("@yourhandle" → "yo"). */
const markFrom = (handle: string): string => handle.replace(/[^a-z0-9]/gi, "").slice(0, 2).toLowerCase() || "ok";

export const KitEnd: React.FC<KitEndProps & Timed> = ({ bg, handle, mark = markFrom(handle), line, durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const light = isLightBg(bg);
  const ink = inkFor(bg);
  const p = enterP(frame, fps, 0.05, 16);
  return (
    <Stage bg={bg} camera="none" durationSec={durationSec}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 70 }}>
        {line && <BlurWords lines={[{ text: line, size: "md" }]} light={light} accent={ink} />}
        <div
          style={{
            ...blurIn(p, 20, 18),
            transform: `scale(${0.9 + 0.1 * p})`,
            borderRadius: "50%",
            boxShadow: light ? "0 30px 70px rgba(0,0,0,0.22)" : undefined,
          }}
        >
          <BrandDisc size={300} mark={mark} />
        </div>
        <div style={{ opacity: p }}>
          <Waveform width={560} frame={frame} fps={fps} color={ink} />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 40, color: ink, opacity: p }}>{handle}</div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ------------------------------------------------------------------ */
/* follow — profile card + cursor clicking Follow, or keyword CTA    */
/* ------------------------------------------------------------------ */

export const KitFollow: React.FC<KitFollowProps & Timed> = ({
  bg,
  handle,
  mode = "follow",
  keyword,
  bio = "",
  mark = markFrom(handle),
  line,
  clickAt = 1.2,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const light = isLightBg(bg);
  const ink = inkFor(bg);
  const muted = light ? KIT.mutedInk : KIT.muted;
  const secondaryBtn = light ? "#E4E5E7" : "#2A2B2E";
  const p = enterP(frame, fps, 0.05, 16);

  if (mode === "keyword") {
    const kp = enterP(frame, fps, 0.35, 16);
    const pulse = 1 + 0.03 * Math.sin((frame / fps) * 4);
    return (
      <Stage bg={bg} camera="push" durationSec={durationSec}>
        <FloorGlow color={theme.accent} y={1000} strength={light ? 0.14 : 0.18} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 54 }}>
          <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 48, color: ink, ...blurIn(p) }}>{line ?? "Comment"}</div>
          <div
            style={{
              ...blurIn(kp, 24, 18),
              transform: `scale(${(0.92 + 0.08 * kp) * pulse})`,
              padding: "34px 90px",
              borderRadius: 999,
              background: light
                ? "linear-gradient(180deg, #1E1F22 0%, #000000 100%)"
                : "linear-gradient(180deg, #FFFFFF 0%, #D5D7DB 100%)",
              boxShadow: light
                ? `0 30px 70px rgba(0,0,0,0.25), 0 0 80px ${theme.accent}66`
                : `0 30px 90px rgba(0,0,0,0.7), 0 0 80px ${theme.accent}55`,
              fontFamily: FONT.display,
              fontSize: 150,
              letterSpacing: "0.02em",
              color: light ? KIT.white : KIT.ink,
              lineHeight: 1,
            }}
          >
            {(keyword ?? "LINK").toUpperCase()}
          </div>
          <div style={{ fontFamily: FONT.sans, fontSize: 34, color: muted, ...blurIn(enterP(frame, fps, 0.8)) }}>
            we'll send it to you · link also in bio
          </div>
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 20, opacity: enterP(frame, fps, 1.0) }}>
            <BrandDisc size={70} mark={mark} />
            <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 34, color: ink }}>{handle}</div>
          </div>
        </AbsoluteFill>
      </Stage>
    );
  }

  // cursor path: enters bottom-right, glides to the Follow button, clicks.
  // btn = centre of the Follow button (measured from a render); the pointer
  // tip sits ~(8, 5) px inside the 64 px cursor box.
  const cardX = 140;
  const cardY = 820;
  const btn = { x: cardX + 330, y: cardY + 172 };
  const cp = interpolate(frame, [(clickAt - 0.8) * fps, clickAt * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const cx = interpolate(cp, [0, 1], [980, btn.x - 8]);
  const cy = interpolate(cp, [0, 1], [1500, btn.y - 5]);
  const pressed = frame >= clickAt * fps && frame < clickAt * fps + 6;
  const followed = frame >= clickAt * fps + 3;
  return (
    <Stage bg={bg} camera="push" durationSec={durationSec}>
      {line && (
        <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <BlurWords lines={[{ text: line, size: "md" }]} light={light} accent={accentInk(theme.accent, light)} />
        </div>
      )}
      <div style={{ position: "absolute", left: cardX, top: cardY, display: "flex", gap: 40, alignItems: "center", ...blurIn(p, 20, 16) }}>
        <div style={{ borderRadius: "50%", boxShadow: light ? "0 20px 50px rgba(0,0,0,0.2)" : undefined }}>
          <BrandDisc size={170} mark={mark} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 54, color: ink }}>{handle}</div>
          <div style={{ fontFamily: FONT.sans, fontSize: 30, color: muted }}>{bio}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            <div
              style={{
                padding: "14px 46px",
                borderRadius: 14,
                fontFamily: FONT.sans,
                fontWeight: 700,
                fontSize: 30,
                color: followed ? ink : KIT.white,
                background: followed ? secondaryBtn : "#0095F6",
                transform: pressed ? "scale(0.94)" : undefined,
              }}
            >
              {followed ? "Following" : "Follow"}
            </div>
            <div style={{ padding: "14px 40px", borderRadius: 14, fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, color: ink, background: secondaryBtn }}>
              Message
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: cx, top: cy, opacity: interpolate(cp, [0, 0.15], [0, 1], { extrapolateRight: "clamp" }) }}>
        <Cursor size={64} pressed={pressed} />
      </div>
    </Stage>
  );
};
