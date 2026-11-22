import type {
  KitBarsProps,
  KitBrowserProps,
  KitChartProps,
  KitLogosProps,
  KitStoryProps,
  KitEndProps,
  KitFollowProps,
  KitFootageProps,
  KitNumberProps,
  KitStageProps,
  KitStatementProps,
} from "./kit/types";

export interface SfxCue {
  /** file under public/, e.g. "sfx/whoosh-soft.mp3" */
  src: string;
  /** seconds into the scene */
  at?: number;
  /** 0..1 */
  vol?: number;
}

interface SceneBase {
  durationSec: number;
  /** Optional provenance pointers copied from the job asset manifest. */
  claimId?: string;
  assetId?: string;
  sourceUrl?: string;
  sfx?: SfxCue[];
  /** Hide the captions during this scene (scenes that show their own text do this automatically). */
  hideCaptions?: boolean;
  /** caption ink while this scene is on screen: "dark" = ink on a light stage, "light" = white on footage */
  captionTheme?: "light" | "dark";
  /** small top-left label for this scene, e.g. "Not financial advice" */
  disclaimer?: string;
}

export type Scene =
  | (SceneBase & { type: "statement" } & KitStatementProps)
  | (SceneBase & { type: "stage" } & KitStageProps)
  | (SceneBase & { type: "chart" } & KitChartProps)
  | (SceneBase & { type: "bars" } & KitBarsProps)
  | (SceneBase & { type: "number" } & KitNumberProps)
  | (SceneBase & { type: "footage" } & KitFootageProps)
  | (SceneBase & { type: "browser" } & KitBrowserProps)
  | (SceneBase & { type: "logos" } & KitLogosProps)
  | (SceneBase & { type: "story" } & KitStoryProps)
  | (SceneBase & { type: "end" } & KitEndProps)
  | (SceneBase & { type: "follow" } & KitFollowProps);

export interface CaptionWord {
  /** absolute seconds in the reel */
  start: number;
  end: number;
  text: string;
}

export interface MusicBed {
  src: string;
  /** trim into the track, seconds */
  from?: number;
  /** volume automation points (linear interp between them), t = reel seconds */
  points: { t: number; vol: number }[];
}

export interface BeatSheet {
  id: string;
  fps: number;
  width: number;
  height: number;
  style?: "kit";
  /** the reel's accent colour (hex), from the shot plan / your style pack */
  accent?: string;
  /** voiceover track in public/ */
  audio?: string;
  /** music bed, levelled under the voice by the compiler */
  music?: MusicBed;
  /** "dynamic" = 1-3 bold words with a highlighter on the spoken word; "single-word-top" = one small word at a time */
  captionStyle?: "single-word-top" | "dynamic";
  emphasis?: string[];
  scenes: Scene[];
  captions: CaptionWord[];
}
