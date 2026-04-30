import React from 'react';
import {AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {valueNoise1D} from '../utils/random.js';

type Props = {
  src: string;
};

/**
 * Huge, dimmed, blurred duplicate of the main image — sits behind everything
 * and drifts slightly on its own (slower than the foreground) to create a
 * subtle parallax / depth feel.
 */
export const BackgroundDepthImage: React.FC<Props> = ({src}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width, height} = useVideoConfig();

  const t = frame / fps;
  const progress = frame / Math.max(1, durationInFrames - 1);

  // Slow continuous scale breathing on top of an already-large baseline
  const baseScale = 2.5;
  const scale = baseScale + interpolate(progress, [0, 1], [0, 0.05]);

  // Slow drift — slower than foreground (smaller amplitude per second)
  const driftX = valueNoise1D(t * 0.12, 11) * 22;
  const driftY = valueNoise1D(t * 0.10, 23) * 14;

  // Pull the image to the left so it peeks behind the foreground on the right
  const offsetX = -width * 0.08 + driftX;
  const offsetY = driftY;

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        // soft vignette using a radial mask on top of the image
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: '50% 50%',
          opacity: 0.18,
          filter: 'brightness(0.35) saturate(0.7) blur(2px)',
        }}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>

      {/* Vignette over the background to deepen the corners */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
