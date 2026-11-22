import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

/**
 * Scene-kit design tokens: fonts, neutrals and accent helpers. This is the
 * starter look; onboarding (AGENTS.md) rewrites it to match your reference
 * reels. One accent per reel, set in the shot plan.
 */

const sans = loadMontserrat("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;
const display = loadAnton("normal", { weights: ["400"], subsets: ["latin"] })
  .fontFamily;
const serif = loadPlayfair("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
}).fontFamily;

export const FONT = {
  sans: `${sans}, 'Helvetica Neue', Arial, sans-serif`,
  display: `${display}, 'Arial Narrow', Impact, sans-serif`,
  serif: `${serif}, Georgia, serif`,
};

export const KIT = {
  bgDark: "#0F0F0F",
  bgBlack: "#000000",
  bgLight: "#ECECEC",
  white: "#FFFFFF",
  ink: "#0F0F0F",
  silver: "#DADDE2",
  muted: "rgba(255,255,255,0.62)",
  mutedInk: "rgba(15,15,15,0.55)",
  negative: "#8A1C24",
  /** chrome gradient used by every 3D-ish object */
  chrome: "linear-gradient(160deg, #FFFFFF 0%, #C9CBD0 28%, #6E7076 58%, #2A2B2E 100%)",
  chromeSoft: "linear-gradient(160deg, #F4F5F7 0%, #A9ACB2 45%, #3A3B3F 100%)",
} as const;

/** Starter accent presets (a shot plan may also give any #hex). */
export const ACCENTS = {
  silver: "#DADDE2",
  blue: "#8EC5FF",
  green: "#34D399",
  violet: "#A78BFA",
  pink: "#F472B6",
  orange: "#FB923C",
} as const;

export type KitBg = "dark" | "black" | "light";

/** Mix a #rrggbb colour towards black (amount 0..1). */
export const deepen = (hex: string, amount: number): string => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, "$&$&") : m.slice(0, 6);
  const n = parseInt(full, 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/**
 * Accent used for TEXT/strokes: pale accents wash out on
 * the light stage, so they are deepened there for contrast.
 */
export const accentInk = (accent: string, light: boolean): string =>
  light ? deepen(accent, 0.42) : accent;

/** Mix a #rrggbb colour towards white (amount 0..1). */
export const lighten = (hex: string, amount: number): string => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, "$&$&") : m.slice(0, 6);
  const n = parseInt(full, 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.round(v + (255 - v) * amount);
  };
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/**
 * Highlighter-pen ink for an accent: a light, fluorescent-pastel version of it,
 * drawn with mix-blend-mode multiply so the text underneath stays crisp. A
 * near-grey accent would read as a text selection, so it borrows a soft blue.
 */
export const highlighterFor = (accent: string): string =>
  hueSat(accent).s < 0.15 ? "#BFDDFF" : lighten(accent, 0.35);

/** Default stage for every scene except footage (set per scene with `bg`). */
export const DEFAULT_BG: KitBg = "light";

export const isLightBg = (bg: KitBg | undefined): boolean => (bg ?? DEFAULT_BG) === "light";

export const bgColor = (bg: KitBg | undefined): string => {
  const b = bg ?? DEFAULT_BG;
  return b === "light" ? KIT.bgLight : b === "black" ? KIT.bgBlack : KIT.bgDark;
};

export const inkFor = (bg: KitBg | undefined): string => (isLightBg(bg) ? KIT.ink : KIT.white);

/** Relative luminance 0..1 of a #rrggbb colour. */
export const luminance = (hex: string): number => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, "$&$&") : m.slice(0, 6);
  const n = parseInt(full, 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

/** Ink or white, whichever reads on top of `hex`. */
export const textOn = (hex: string): string => (luminance(hex) > 0.45 ? KIT.ink : KIT.white);

/** Hue in degrees (0-360) and saturation (0-1) of a #rrggbb colour. */
export const hueSat = (hex: string): { h: number; s: number; l: number } => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.replace(/./g, "$&$&") : m.slice(0, 6);
  const n = parseInt(full, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
};

/** Accent guard: any valid #hex, otherwise the default blue. */
export const safeAccent = (hex: string | undefined): string =>
  hex && /^#[0-9a-f]{3,8}$/i.test(hex) ? hex : ACCENTS.blue;
