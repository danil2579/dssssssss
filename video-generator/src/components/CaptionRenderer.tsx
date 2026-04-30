import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont as loadFraunces} from '@remotion/google-fonts/Fraunces';
import type {Caption} from '../types.js';

const {fontFamily: faunFamily} = loadFraunces('italic', {
  weights: ['900'],
  subsets: ['latin'],
});

type Props = {
  captions: Caption[];
};

/**
 * Vintage serif phrase-by-phrase captions. Left-anchored, vertically
 * centered, with a soft fade + slide + scale-in animation per phrase.
 */
export const CaptionRenderer: React.FC<Props> = ({captions}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  const isPortrait = height > width;
  const blockWidth = isPortrait ? width * 0.84 : width * 0.45;
  const blockLeft = isPortrait ? width * 0.08 : width * 0.06;
  const fontSize = isPortrait ? width * 0.085 : height * 0.105;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {captions.map((cap, idx) => {
        const startFrame = Math.round(cap.start * fps);
        const endFrame = Math.round(cap.end * fps);
        if (frame < startFrame - fps * 0.3 || frame > endFrame + fps * 0.4)
          return null;

        const localFrame = frame - startFrame;

        const inAnim = spring({
          frame: localFrame,
          fps,
          config: {damping: 18, stiffness: 110, mass: 0.9},
          durationInFrames: Math.round(fps * 0.55),
        });

        const opacityIn = interpolate(localFrame, [0, fps * 0.35], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const opacityOut = interpolate(
          frame,
          [endFrame - fps * 0.25, endFrame + fps * 0.25],
          [1, 0],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
        );
        const opacity = Math.min(opacityIn, opacityOut);

        const slideY = interpolate(inAnim, [0, 1], [22, 0]);
        const scale = interpolate(inAnim, [0, 1], [0.98, 1.0]);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: blockLeft,
              top: '50%',
              width: blockWidth,
              transform: `translateY(-50%)`,
              opacity,
            }}
          >
            <div
              style={{
                transform: `translateY(${slideY}px) scale(${scale})`,
                transformOrigin: 'left center',
              }}
            >
              <CaptionLines text={cap.text} fontSize={fontSize} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const CaptionLines: React.FC<{text: string; fontSize: number}> = ({
  text,
  fontSize,
}) => {
  const lines = text.split('\n');
  return (
    <div
      style={{
        fontFamily: `${faunFamily}, "Cormorant Garamond", "Playfair Display", Georgia, serif`,
        fontWeight: 900,
        fontStyle: 'italic',
        color: '#f4f0e8',
        fontSize,
        lineHeight: 0.96,
        letterSpacing: '-0.005em',
        textShadow:
          '0 4px 18px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.65), 0 0 1px rgba(0,0,0,0.9)',
      }}
    >
      <svg width="0" height="0" style={{position: 'absolute'}}>
        <defs>
          <filter id="caption-distress" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: 'block',
            filter: 'url(#caption-distress)',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};
