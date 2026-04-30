import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

type Props = {
  handle: string;
};

/** Subtle handle/watermark in the bottom-left. Not a TikTok logo. */
export const CreatorHandle: React.FC<Props> = ({handle}) => {
  const {width, height} = useVideoConfig();
  const isPortrait = height > width;
  const fontSize = isPortrait ? width * 0.022 : height * 0.022;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: isPortrait ? width * 0.06 : width * 0.04,
          bottom: isPortrait ? height * 0.05 : height * 0.06,
          color: 'rgba(244, 240, 232, 0.55)',
          fontSize,
          fontFamily:
            '"Helvetica Neue", "Inter", system-ui, -apple-system, sans-serif',
          letterSpacing: '0.12em',
          textTransform: 'lowercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};
