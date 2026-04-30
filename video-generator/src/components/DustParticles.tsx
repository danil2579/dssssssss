import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {mulberry32} from '../utils/random.js';

type Particle = {
  baseX: number; // 0..1
  baseY: number; // 0..1
  size: number; // px
  speed: number; // px/sec drift
  drift: number; // horizontal drift amplitude in px
  opacity: number;
  phase: number;
};

type Scratch = {
  startFrame: number;
  durationFrames: number;
  x: number; // 0..1
  length: number; // 0..1 of height
  thickness: number; // px
  opacity: number;
};

const PARTICLE_COUNT = 55;
const SCRATCH_COUNT = 6;

/**
 * Slow drifting white dust + occasional vertical scratches. All positions
 * are derived from a fixed seed so the result is identical run-to-run.
 */
export const DustParticles: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();

  const particles = useMemo<Particle[]>(() => {
    const r = mulberry32(0xc0ffee);
    return Array.from({length: PARTICLE_COUNT}, () => ({
      baseX: r(),
      baseY: r(),
      size: 1 + r() * 2.5,
      speed: 4 + r() * 14,
      drift: 6 + r() * 18,
      opacity: 0.15 + r() * 0.45,
      phase: r() * Math.PI * 2,
    }));
  }, []);

  const scratches = useMemo<Scratch[]>(() => {
    const r = mulberry32(0xfeed42);
    return Array.from({length: SCRATCH_COUNT}, () => {
      const start = Math.floor(r() * durationInFrames);
      const dur = 2 + Math.floor(r() * 5); // 2-6 frames, very flickery
      return {
        startFrame: start,
        durationFrames: dur,
        x: 0.05 + r() * 0.9,
        length: 0.15 + r() * 0.6,
        thickness: 0.6 + r() * 1.4,
        opacity: 0.08 + r() * 0.18,
      };
    });
  }, [durationInFrames]);

  const t = frame / fps;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{position: 'absolute', inset: 0}}
      >
        {particles.map((p, i) => {
          // Slow vertical drift wrapping the canvas
          const yPx = ((p.baseY * height + t * p.speed) % (height + 40)) - 20;
          const xPx =
            p.baseX * width + Math.sin(t * 0.6 + p.phase) * p.drift;
          return (
            <circle
              key={i}
              cx={xPx}
              cy={yPx}
              r={p.size}
              fill="#fff5e6"
              opacity={p.opacity}
            />
          );
        })}

        {scratches.map((s, i) => {
          if (
            frame < s.startFrame ||
            frame >= s.startFrame + s.durationFrames
          )
            return null;
          const yStart = (1 - s.length) * height * 0.5;
          const yEnd = yStart + s.length * height;
          return (
            <line
              key={i}
              x1={s.x * width}
              x2={s.x * width + 0.4}
              y1={yStart}
              y2={yEnd}
              stroke="#fff2dc"
              strokeWidth={s.thickness}
              opacity={s.opacity}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
