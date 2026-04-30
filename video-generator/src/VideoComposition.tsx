import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {BackgroundDepthImage} from './components/BackgroundDepthImage.js';
import {CinematicImageLayer} from './components/CinematicImageLayer.js';
import {FilmGrainOverlay} from './components/FilmGrainOverlay.js';
import {DustParticles} from './components/DustParticles.js';
import {CaptionRenderer} from './components/CaptionRenderer.js';
import {CreatorHandle} from './components/CreatorHandle.js';
import type {VideoConfig} from './types.js';

/**
 * Resolves a path that may be either:
 *  - a local public-dir path like "/assets/main.png"
 *  - an absolute URL like "https://..."
 *  - a relative public path like "assets/main.png"
 */
const resolveAsset = (p: string): string => {
  if (/^https?:\/\//.test(p) || p.startsWith('data:')) return p;
  const trimmed = p.replace(/^\//, '');
  return staticFile(trimmed);
};

export const VideoComposition: React.FC<VideoConfig> = ({
  image,
  audio,
  creatorHandle,
  captions,
}) => {
  const imageSrc = resolveAsset(image);
  const audioSrc = audio ? resolveAsset(audio) : undefined;

  return (
    <AbsoluteFill style={{backgroundColor: '#040404', overflow: 'hidden'}}>
      {/* Layer 0: deep black with very subtle warm tint */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 65% 50%, #1a0e08 0%, #070605 45%, #020202 100%)',
        }}
      />

      {/* Layer 1: huge dim parallax background image */}
      <BackgroundDepthImage src={imageSrc} />

      {/* Layer 2: captions sit between background and foreground so the
          subject can overlap them slightly on the right edge */}
      <CaptionRenderer captions={captions} />

      {/* Layer 3: foreground subject */}
      <CinematicImageLayer src={imageSrc} />

      {/* Layer 4: dust + scratches */}
      <DustParticles />

      {/* Layer 5: film grain on top of everything */}
      <FilmGrainOverlay />

      {/* Layer 6: subtle global vignette */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Watermark */}
      {creatorHandle ? <CreatorHandle handle={creatorHandle} /> : null}

      {audioSrc ? <Audio src={audioSrc} /> : null}
    </AbsoluteFill>
  );
};
