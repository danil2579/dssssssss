import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

/**
 * SVG fractal-noise grain. The seed is keyed off the frame index so it
 * animates frame-to-frame, but is fully deterministic.
 *
 * Two layers blended together (overlay + screen) keep it from looking flat.
 */
export const FilmGrainOverlay: React.FC = () => {
  const frame = useCurrentFrame();

  // Cycle a small set of seeds so grain animates without re-uploading huge
  // textures per frame. The pattern repeats every ~120 frames which is plenty.
  const seedA = (frame % 17) + 1;
  const seedB = ((frame * 7) % 23) + 1;

  const grainA = useMemo(
    () => (
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{display: 'block'}}
      >
        <filter id={`gA-${seedA}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={seedA}
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 1.2 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#gA-${seedA})`} />
      </svg>
    ),
    [seedA]
  );

  const grainB = useMemo(
    () => (
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{display: 'block'}}
      >
        <filter id={`gB-${seedB}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.6"
            numOctaves="1"
            seed={seedB}
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 0.95
                    0 0 0 0 0.85
                    0 0 0 0.9 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#gB-${seedB})`} />
      </svg>
    ),
    [seedB]
  );

  return (
    <>
      <AbsoluteFill
        style={{
          mixBlendMode: 'overlay',
          opacity: 0.08,
          pointerEvents: 'none',
        }}
      >
        {grainA}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: 0.06,
          pointerEvents: 'none',
        }}
      >
        {grainB}
      </AbsoluteFill>
    </>
  );
};
