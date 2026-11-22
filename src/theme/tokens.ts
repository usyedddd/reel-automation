import React, { createContext, useContext } from "react";

/**
 * Design tokens shared by every scene. Change the look here (and in
 * src/kit/tokens.ts) to match your style pack; the accent can also be set per
 * reel through the shot plan's "accent".
 */
export interface Theme {
  id: "kit";
  /** light field / dark field / white */
  cream: string;
  black: string;
  white: string;
  /** the reel's accent (highlights, bars, emphasis) */
  accent: string;
  accentSoft: string;
  /** text on light / text on dark */
  ink: string;
  inkOnDark: string;
  muted: string;
  mutedOnDark: string;
  /** font stacks */
  serif: string;
  sans: string;
  mono: string;
  display: string;
  radius: { card: number; chip: number };
  shadow: { card: string; cardOnDark: string };
}

export const THEME: Theme = {
  id: "kit",
  cream: "#ECECEC",
  black: "#0F0F0F",
  white: "#ffffff",
  accent: "#8EC5FF",
  accentSoft: "rgba(142, 197, 255, 0.16)",
  ink: "#0F0F0F",
  inkOnDark: "#ffffff",
  muted: "rgba(15,15,15,0.55)",
  mutedOnDark: "rgba(255,255,255,0.62)",
  serif: "'Playfair Display', Georgia, serif",
  sans: "Montserrat, 'Helvetica Neue', Arial, sans-serif",
  mono: "'Menlo', 'SF Mono', 'Courier New', monospace",
  display: "Anton, 'Arial Narrow', Impact, sans-serif",
  radius: { card: 28, chip: 999 },
  shadow: {
    card: "0 30px 80px rgba(0,0,0,0.18)",
    cardOnDark: "0 30px 90px rgba(0,0,0,0.85)",
  },
};

const ThemeContext = createContext<Theme>(THEME);

const hexToRgba = (hex: string, alpha: number): string => {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.replace(/./g, "$&$&") : m.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export const ThemeProvider: React.FC<{ accent?: string; children: React.ReactNode }> = ({ accent, children }) => {
  const value = accent ? { ...THEME, accent, accentSoft: hexToRgba(accent, 0.16) } : THEME;
  return React.createElement(ThemeContext.Provider, { value }, children);
};

/** Active theme. Components use this — never hardcode colours. */
export const useTheme = (): Theme => useContext(ThemeContext);
