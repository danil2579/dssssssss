import React from 'react';
import {Composition} from 'remotion';
import {VideoComposition} from './VideoComposition.js';
import {defaultConfig, type VideoConfig} from './types.js';

const calculateMetadata = ({props}: {props: VideoConfig}) => ({
  durationInFrames: Math.max(1, Math.round(props.duration * props.fps)),
  fps: props.fps,
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CinematicVideoLandscape"
        component={VideoComposition}
        defaultProps={defaultConfig}
        width={1920}
        height={1080}
        fps={defaultConfig.fps}
        durationInFrames={Math.round(defaultConfig.duration * defaultConfig.fps)}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="CinematicVideoPortrait"
        component={VideoComposition}
        defaultProps={defaultConfig}
        width={1080}
        height={1920}
        fps={defaultConfig.fps}
        durationInFrames={Math.round(defaultConfig.duration * defaultConfig.fps)}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
