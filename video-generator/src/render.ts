/**
 * Headless render script.
 *
 * Usage:
 *   ts-node --esm src/render.ts <config.json> [landscape|portrait] [outPath]
 *
 * Examples:
 *   pnpm render configs/sample.json
 *   pnpm render configs/sample.json portrait out/portrait.mp4
 */
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {readFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {VideoConfig} from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const configArg = argv[0] ?? 'configs/sample.json';
const orientation = (argv[1] ?? 'landscape') as 'landscape' | 'portrait';
const outArg = argv[2];

const configPath = path.isAbsolute(configArg)
  ? configArg
  : path.resolve(projectRoot, configArg);

const config = JSON.parse(readFileSync(configPath, 'utf-8')) as VideoConfig;

const compositionId =
  orientation === 'portrait'
    ? 'CinematicVideoPortrait'
    : 'CinematicVideoLandscape';

const defaultOut = path.resolve(
  projectRoot,
  'out',
  `${path.basename(configArg, '.json')}-${orientation}.mp4`
);
const outputLocation = outArg
  ? path.isAbsolute(outArg)
    ? outArg
    : path.resolve(projectRoot, outArg)
  : defaultOut;

mkdirSync(path.dirname(outputLocation), {recursive: true});

const main = async () => {
  console.log(`[render] bundling…`);
  const bundleLocation = await bundle({
    entryPoint: path.resolve(projectRoot, 'src/index.ts'),
    publicDir: path.resolve(projectRoot, 'public'),
    webpackOverride: (c) => c,
  });

  console.log(`[render] selecting composition: ${compositionId}`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: config,
  });

  console.log(
    `[render] rendering ${composition.width}x${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames`
  );
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps: config,
    crf: 18,
    pixelFormat: 'yuv420p',
    onProgress: ({progress}) => {
      const pct = (progress * 100).toFixed(1);
      process.stdout.write(`\r[render] ${pct}%   `);
    },
  });

  console.log(`\n[render] done → ${outputLocation}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
