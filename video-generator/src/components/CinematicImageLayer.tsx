import React from 'react';
import {AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {valueNoise1D} from '../utils/random.js';

type Props = {
  src: string;
};

/**
 * The main subject. Lives on the right side of the canvas with a slow
 * cinematic Ken-Burns: gentle zoom, sub-pixel drift, micro-rotation, plus
 * a warm glow + drop shadow underneath.
 */
export const CinematicImageLayer: React.FC<Props> = ({src}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width, height} = useVideoConfig();

  const progress = frame / Math.max(1, durationInFrames - 1);
  const t = frame / fps;

  // 1.0 → 1.035 over the full clip (subtle cinematic push-in)
  const scale = interpolate(progress, [0, 1], [1.0, 1.035]);

  // Smooth low-frequency drift, deterministic per frame
  const driftX = valueNoise1D(t * 0.18, 101) * 8;
  const driftY = valueNoise1D(t * 0.22, 211) * 5;
  const rotate = valueNoise1D(t * 0.15, 307) * 0.3;

  // Layout — right-anchored frame, responsive to portrait/landscape
  const isPortrait = height > width;
  const frameWidth = isPortrait ? width * 0.86 : width * 0.46;
  const frameHeight = isPortrait ? height * 0.55 : height * 0.82;
  const right = isPortrait ? (width - frameWidth) / 2 : width * 0.06;
  const top = (height - frameHeight) / 2;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* Warm radial glow behind the subject */}
      <div
        style={{
          position: 'absolute',
          right: right - frameWidth * 0.18,
          top: top - frameHeight * 0.1,
          width: frameWidth * 1.4,
          height: frameHeight * 1.2,
          background:
            'radial-gradient(ellipse at center, rgba(255,176,110,0.22) 0%, rgba(255,140,80,0.10) 35%, rgba(0,0,0,0) 70%)',
          filter: 'blur(40px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Subject */}
      <div
        style={{
          position: 'absolute',
          right,
          top,
          width: frameWidth,
          height: frameHeight,
          transform: `translate(${driftX}px, ${driftY}px) scale(${scale}) rotate(${rotate}deg)`,
          transformOrigin: '50% 55%',
          filter:
            'drop-shadow(0 30px 50px rgba(0,0,0,0.65)) drop-shadow(0 0 30px rgba(255,170,110,0.18))',
        }}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
