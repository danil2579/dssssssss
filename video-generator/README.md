# Cinematic Video Generator

A deterministic, production-quality short-form video template built on **React +
Remotion**. Drop in a cut-out image, an audio track, and a list of timed
caption phrases — out comes a finished, cinematic-looking 1920×1080 (or
1080×1920) MP4 with consistent grain, dust, depth, parallax, and vintage serif
typography.

The visual structure is fixed and reproducible — same JSON input, same
pixel-identical output every time.

## Visual structure

Layers are stacked in this exact order:

```
0. solid black with subtle warm radial tint
1. BackgroundDepthImage   — huge dim blurred duplicate of the subject
2. CaptionRenderer        — vintage serif phrases (left side)
3. CinematicImageLayer    — main subject (right side, slow Ken-Burns)
4. DustParticles          — slow white dust + occasional vertical scratches
5. FilmGrainOverlay       — animated SVG fractal grain
6. global vignette
7. CreatorHandle watermark
```

All randomness is seeded via `mulberry32` so identical inputs always produce
identical outputs.

## Project layout

```
video-generator/
├── src/
│   ├── index.ts                  # registerRoot
│   ├── Root.tsx                  # landscape + portrait compositions
│   ├── VideoComposition.tsx      # orchestrates all layers
│   ├── components/
│   │   ├── BackgroundDepthImage.tsx
│   │   ├── CinematicImageLayer.tsx
│   │   ├── FilmGrainOverlay.tsx
│   │   ├── DustParticles.tsx
│   │   ├── CaptionRenderer.tsx
│   │   └── CreatorHandle.tsx
│   ├── utils/random.ts           # deterministic PRNG + value noise
│   ├── render.ts                 # headless render → mp4
│   └── types.ts                  # VideoConfig + defaults
├── configs/
│   └── sample.json               # the example config
├── public/assets/                # drop main.png / audio.mp3 here
├── ui/
│   ├── server.js                 # Express + multer + SSE render
│   └── public/                   # static editor app (HTML/CSS/JS)
├── remotion.config.ts
├── package.json
└── tsconfig.json
```

## Install

```bash
cd video-generator
npm install
```

Remotion uses a system `ffmpeg` if available; on most platforms the renderer
package will provide its own. No extra setup required.

## Configure

Author a JSON config (or use the included `configs/sample.json`):

```json
{
  "duration": 29,
  "fps": 30,
  "image": "/assets/main.png",
  "audio": "/assets/audio.mp3",
  "creatorHandle": "@mybrand",
  "captions": [
    { "start": 8.7,  "end": 11.2, "text": "the morning\nis" },
    { "start": 11.3, "end": 14.4, "text": "the feeling\nis bizarre" },
    { "start": 14.5, "end": 18.5, "text": "i still don't\nknow where\nyou are" },
    { "start": 18.6, "end": 23.2, "text": "they keep me\npretty like\na movie star" }
  ]
}
```

Paths beginning with `/assets/` are resolved from `public/assets/` (Remotion's
public dir). Absolute `https://...` URLs also work.

## Render

```bash
# 1920×1080 landscape from sample.json → out/sample-landscape.mp4
npm run render -- configs/sample.json landscape

# 1080×1920 portrait
npm run render -- configs/sample.json portrait

# Custom output path
npm run render -- configs/myclip.json landscape out/myclip.mp4
```

## Preview in Remotion Studio

```bash
npm run studio
```

Opens an interactive timeline + canvas at <http://localhost:3000> with both
landscape and portrait compositions selectable.

## Web UI

A simple editor for uploading assets and editing caption timing:

```bash
npm run ui
# → http://localhost:5174
```

The UI lets you:

- Upload the main image / audio (saved into `public/assets/`)
- Edit creator handle, duration, fps
- Add / edit / remove caption phrases with start/end seconds
- Save the working config to `configs/active.json`
- Trigger a render (landscape or portrait) and watch logs stream in
- Preview the finished MP4 inline + browse recent renders

## Animation reference

| Layer            | Behaviour |
|------------------|-----------|
| Main image       | scale 1.0 → 1.035, x drift ±8 px, y drift ±5 px, rotate ±0.3°, warm drop shadow + glow |
| Background image | scale ≈2.5, opacity 0.18, brightness 0.35, blur 2px, slower parallax |
| Film grain       | 2 fractal-noise SVG layers, opacity 0.06–0.08, screen + overlay blend |
| Dust             | 55 white particles drifting vertically, sinusoidal x sway |
| Scratches        | 6 vertical white lines, each visible 2–6 frames, deterministic seeds |
| Captions         | spring-in fade + 22px slide-up + 0.98 → 1.0 scale, fade-out near end |

## Adding more templates

The composition is intentionally modular. To create a second template:

1. Copy `VideoComposition.tsx` to e.g. `VideoComposition.Faded.tsx`
2. Swap layers / parameters
3. Register a new `<Composition>` in `Root.tsx` with a new id
4. `npm run render -- <config> <orientation>` against that composition id (add
   a CLI flag in `render.ts` if you want to pick template by name)

Because every layer takes only a `VideoConfig`, you can mix and match them
freely.
