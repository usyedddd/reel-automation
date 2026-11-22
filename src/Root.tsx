import React from "react";
import { Composition } from "remotion";
import { Reel, totalDurationInFrames } from "./Reel";
import { beatSheets } from "./generatedBeatSheets";
import { kitDemo } from "./kit/kitDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* gallery of every scene type (dev preview, not a reel) */}
      <Composition
        id={kitDemo.id}
        component={Reel}
        durationInFrames={totalDurationInFrames(kitDemo)}
        fps={kitDemo.fps}
        width={kitDemo.width}
        height={kitDemo.height}
        defaultProps={{ beats: kitDemo }}
      />
      {/* one composition per compiled reel (src/beats/*.json, see scripts/register_beats.py) */}
      {beatSheets.map((beats) => (
        <Composition
          key={beats.id}
          id={beats.id}
          component={Reel}
          durationInFrames={totalDurationInFrames(beats)}
          fps={beats.fps}
          width={beats.width}
          height={beats.height}
          defaultProps={{ beats }}
        />
      ))}
    </>
  );
};
