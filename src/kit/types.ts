import type { KitBg } from "./tokens";

/**
 * Scene props for the kit. All positions are canvas
 * px on the 1080x1920 frame; all times are seconds into the scene.
 */

export type KitCamera = "push" | "pull" | "panLeft" | "panRight" | "rise" | "none";

/** One line of a statement. Wrap words in **double asterisks** for bold. */
export interface KitLine {
  text: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  font?: "sans" | "display" | "serif";
  /** seconds when the first word lands (default: after the previous line) */
  at?: number;
  /** seconds between words (default 0.11) */
  stagger?: number;
  /** render this line in the reel accent */
  accent?: boolean;
  /** dim this line (connective / kicker) */
  muted?: boolean;
}

export interface KitStatementProps {
  bg?: KitBg;
  camera?: KitCamera;
  lines: KitLine[];
  /** vertical centre of the text block 0..1 (default 0.5) */
  y?: number;
  align?: "center" | "left";
  /** small label above the block (e.g. "Not financial advice") */
  kicker?: string;
  /** soft spotlight sweep from the top at this second */
  spotlightAt?: number;
}

export type KitElementKind =
  | "robot"
  | "person"
  | "card"
  | "badge"
  | "pill"
  | "text"
  | "image"
  | "number";

export interface KitElement {
  kind: KitElementKind;
  /** centre, canvas px */
  x: number;
  y: number;
  /** width in px (sensible default per kind) */
  size?: number;
  at?: number;
  /** seconds when it leaves */
  out?: number;
  /** robot/person/card/badge: light it with the accent */
  glow?: boolean;
  /** main text: card title / badge label / pill label / text content / number */
  label?: string;
  /** card subtitle / text under a person / number caption */
  sub?: string;
  /** card value line under the card */
  value?: string;
  /** image path in public/ (card portrait, logo, screenshot) */
  src?: string;
  /** image: keep colour (default false → grayscale) */
  color?: boolean;
  /** badge style */
  variant?: "chrome" | "brand" | "accent" | "glass" | "white";
  /** person mood */
  mood?: "neutral" | "sad" | "none";
  /** seconds when a red X strikes this element */
  strikeAt?: number;
  /** disable idle float */
  still?: boolean;
  /** text element styling */
  font?: "sans" | "display" | "serif";
  weight?: number;
  /** number element: count up from 0 to this value over 0.9s */
  countTo?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export interface KitLink {
  /** element indexes */
  from: number;
  to: number;
  at?: number;
  style?: "solid" | "dotted";
  /** a glowing dot travels along the link */
  flow?: boolean;
  /** curve amount -1..1 (0 = straight) */
  bend?: number;
}

export interface KitStageProps {
  bg?: KitBg;
  camera?: KitCamera;
  elements: KitElement[];
  links?: KitLink[];
  /** small heading text at the top of the stage */
  title?: { text: string; at?: number; y?: number };
  floorGlow?: boolean;
  spotlightAt?: number;
}

export interface KitChartPoint {
  value: number;
  /** label shown at the point, e.g. "$6B" */
  label?: string;
  /** seconds when the curve reaches this point */
  at: number;
}

export interface KitChartProps {
  bg?: KitBg;
  title?: string;
  points: KitChartPoint[];
  /** dashed bracket under the x-axis: from point i to point j */
  brackets?: { from: number; to: number; text: string; at?: number }[];
  /** re-scale the y-axis as bigger values arrive (default true) */
  rescale?: boolean;
}

export interface KitBarsProps {
  bg?: KitBg;
  title?: string;
  bars: { label: string; value: number; display?: string; accent?: boolean; at?: number }[];
}

export interface KitNumberProps {
  bg?: KitBg;
  camera?: KitCamera;
  /** text shown when not counting, e.g. "2030" or "$15T" */
  value?: string;
  countTo?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label?: string;
  sub?: string;
  font?: "display" | "sans";
  at?: number;
}

export interface KitFootageProps {
  src: string;
  from?: number;
  /** "none" = true colour (default), "bw" = desaturated */
  grade?: "bw" | "none";
  /** uppercase hook caption mid-frame (owns the captions while shown) */
  caption?: string;
  /** small name/date tag lower third */
  nameplate?: { name: string; title?: string };
  credit?: string;
  focusX?: number;
  zoomDir?: "in" | "out" | "none";
  /** serif title over footage (max 2-3 per reel) */
  serifTitle?: string;
}

/** A rectangle in SCREENSHOT pixels (as printed by capture.mjs --find). */
export interface KitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface KitBrowserProps {
  bg?: KitBg;
  /** screenshot in public/ (capture.mjs screenshot output) */
  src: string;
  srcWidth: number;
  srcHeight: number;
  /** text in the address bar, e.g. "google.com/search?q=…" */
  url?: string;
  /** zoom the camera onto this region at `zoomAt` */
  focus?: KitRect;
  zoomAt?: number;
  /** max zoom factor (default 2.2) */
  maxZoom?: number;
  /** src may be a screen recording (.mp4); `from` = seconds into it */
  from?: number;
  /** "dark" for dark-themed sites: highlights become a translucent band */
  pageTone?: "light" | "dark";
  /** highlighter-pen strokes swept over phrases at `at` seconds */
  highlights?: (KitRect & { at: number })[];
  /** small label above the window, e.g. "Google search" */
  label?: string;
  /** credit line under the window */
  credit?: string;
}

/** A brand logo file in public/ (svg/png from tools/get_logo.mjs or site_logo.mjs). */
export interface KitLogo {
  src: string;
  /** optional caption under the logo chip */
  label?: string;
  /** seconds into the scene when this logo lands (default: staggered from `at`) */
  at?: number;
}

export interface KitLogosProps {
  bg?: KitBg;
  /** 1-3 logos; with 2+ they lock up with the joiner ("Brand A × Brand B") */
  logos: KitLogo[];
  joiner?: "×" | "+" | "→";
  /** line above the lockup */
  title?: string;
  /** line below the lockup */
  sub?: string;
  /** seconds when the logos land (default 0.05, staggered) */
  at?: number;
  /** a website screenshot shown faded behind the lockup */
  bgSrc?: string;
}

export interface KitStoryBeat {
  text: string;
  /** seconds into the scene */
  at: number;
  /** render as the big payoff number/line */
  big?: boolean;
}

export interface KitStoryProps {
  bg?: KitBg;
  /** person's face (square crop) for the avatar */
  face?: string;
  name: string;
  /** e.g. "AI filmmaker" */
  role?: string;
  /** a large still or .mp4 (the person, the thing they made, their site recording) */
  media?: string;
  /** aspect of `media` (w/h), default 4/3 */
  mediaAspect?: number;
  /** small tag on the media, e.g. "AI-generated" */
  mediaTag?: string;
  /** story lines revealed on cue */
  beats: KitStoryBeat[];
  /** small brand logos in the card header */
  logos?: string[];
  /** source line, e.g. "Business Insider · Jun 2025" */
  source?: string;
}

export interface KitEndProps {
  /** stage colour (default black) */
  bg?: KitBg;
  /** your channel handle, e.g. "@yourhandle" */
  handle: string;
  /** short mark inside the disc (default: first two letters of the handle) */
  mark?: string;
  /** statement shown above the disc */
  line?: string;
}

export interface KitFollowProps {
  /** stage colour (default dark) */
  bg?: KitBg;
  handle: string;
  /** "follow" = profile card + cursor click; "keyword" = comment-keyword CTA */
  mode?: "follow" | "keyword";
  keyword?: string;
  bio?: string;
  mark?: string;
  /** line above the card */
  line?: string;
  /** seconds when the cursor clicks Follow (default 1.2) */
  clickAt?: number;
}
