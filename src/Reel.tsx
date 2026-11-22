import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ThemeProvider } from "./theme/tokens";
import { KitBars, KitChart, KitEnd, KitFollow, KitFootage, KitNumber, KitStage, KitStatement } from "./kit/scenes";
import { KitCaption, KitDisclaimer, KitDynamicCaption } from "./kit/KitCaption";
import { KitBrowser } from "./kit/KitBrowser";
import { KitLogos, KitStory } from "./kit/KitBrand";
import { highlighterFor, isLightBg, safeAccent, type KitBg } from "./kit/tokens";
import type { BeatSheet, Scene } from "./types";

const SceneSwitch: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case "statement":
      return <KitStatement {...scene} />;
    case "stage":
      return <KitStage {...scene} />;
    case "chart":
      return <KitChart {...scene} />;
    case "bars":
      return <KitBars {...scene} />;
    case "number":
      return <KitNumber {...scene} />;
    case "footage":
      return <KitFootage {...scene} />;
    case "browser":
      return <KitBrowser {...scene} />;
    case "logos":
      return <KitLogos {...scene} />;
    case "story":
      return <KitStory {...scene} />;
    case "end":
      return <KitEnd {...scene} />;
    case "follow":
      return <KitFollow {...scene} />;
    default: {
      const neverScene: never = scene;
      throw new Error(`Unsupported scene: ${JSON.stringify(neverScene)}`);
    }
  }
};

/** Each scene arrives with a short de-blur + settle instead of a hard cut. */
const SoftIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, 7], [0, 1], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1.025 - 0.025 * k})`,
        filter: k >= 0.999 ? undefined : `blur(${(1 - k) * 10}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Scenes that show their own text: captions step aside while they're on screen. */
const ownsText = (s: Scene): boolean =>
  s.type === "statement" ||
  s.type === "end" ||
  s.type === "follow" ||
  (s.type === "footage" && Boolean(s.caption || s.serifTitle));

/** Footage is dark unless told otherwise; every other scene follows its bg (default light). */
const isLightScene = (s: Scene): boolean => {
  if (s.type === "footage") return false;
  return isLightBg("bg" in s ? (s.bg as KitBg | undefined) : undefined);
};

export const Reel: React.FC<{ beats: BeatSheet }> = ({ beats }) => {
  const { fps } = useVideoConfig();
  const accent = safeAccent(beats.accent);
  let cursor = 0;

  const hidden: { start: number; end: number }[] = [];
  const darkRanges: { start: number; end: number }[] = [];
  const cuts: number[] = [];
  {
    let c = 0;
    for (const s of beats.scenes) {
      const span = { start: c, end: c + s.durationSec };
      if (s.hideCaptions ?? ownsText(s)) hidden.push(span);
      if (s.captionTheme === "dark" || (s.captionTheme === undefined && isLightScene(s))) darkRanges.push(span);
      if (c > 0) cuts.push(c);
      c += s.durationSec;
    }
  }

  return (
    <ThemeProvider accent={accent}>
      <AbsoluteFill style={{ background: "black" }}>
        {beats.audio && <Audio src={staticFile(beats.audio)} />}
        {beats.music && (
          <Audio
            src={staticFile(beats.music.src)}
            startFrom={Math.round((beats.music.from ?? 0) * fps)}
            volume={(f) => {
              const t = f / fps;
              const pts = beats.music!.points;
              if (t <= pts[0].t) return pts[0].vol;
              for (let i = 0; i < pts.length - 1; i++) {
                if (t >= pts[i].t && t < pts[i + 1].t) {
                  const k = (t - pts[i].t) / (pts[i + 1].t - pts[i].t);
                  return pts[i].vol + k * (pts[i + 1].vol - pts[i].vol);
                }
              }
              return pts[pts.length - 1].vol;
            }}
          />
        )}
        {beats.scenes.map((scene, i) => {
          const from = Math.round(cursor * fps);
          const dur = Math.round(scene.durationSec * fps);
          cursor += scene.durationSec;
          return (
            <Sequence key={i} from={from} durationInFrames={dur} premountFor={fps}>
              <SoftIn>
                <SceneSwitch scene={scene} />
              </SoftIn>
              {scene.disclaimer && <KitDisclaimer text={scene.disclaimer} light={isLightScene(scene)} />}
              {(scene.sfx ?? []).map((cue, j) => (
                <Sequence
                  key={`sfx-${j}`}
                  from={Math.round((cue.at ?? 0) * fps)}
                  durationInFrames={dur - Math.round((cue.at ?? 0) * fps)}
                  premountFor={fps}
                >
                  <Audio src={staticFile(cue.src)} volume={cue.vol ?? 0.4} />
                </Sequence>
              ))}
            </Sequence>
          );
        })}
        {beats.captionStyle === "single-word-top" ? (
          <KitCaption captions={beats.captions} hidden={hidden} darkRanges={darkRanges} />
        ) : (
          <KitDynamicCaption
            captions={beats.captions}
            cuts={cuts}
            marker={highlighterFor(accent)}
            hidden={hidden}
            darkRanges={darkRanges}
          />
        )}
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export const totalDurationInFrames = (beats: BeatSheet): number =>
  Math.round(beats.scenes.reduce((s, sc) => s + sc.durationSec, 0) * beats.fps);
