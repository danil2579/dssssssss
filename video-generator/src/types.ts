export type Caption = {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Text to display. Use \n for line breaks. */
  text: string;
};

export type VideoConfig = {
  /** Total duration of the video in seconds */
  duration: number;
  /** Frames per second (typically 30) */
  fps: number;
  /** Path to the main cut-out image (e.g. /assets/main.png served from public/) */
  image: string;
  /** Optional background audio track */
  audio?: string;
  /** Optional handle/watermark, e.g. "@mybrand" */
  creatorHandle?: string;
  /** Caption phrases with their timing */
  captions: Caption[];
};

export const defaultConfig: VideoConfig = {
  duration: 29,
  fps: 30,
  image: '/assets/main.png',
  audio: '/assets/audio.mp3',
  creatorHandle: '@mybrand',
  captions: [
    {start: 8.7, end: 11.2, text: 'the morning\nis'},
    {start: 11.3, end: 14.4, text: 'the feeling\nis bizarre'},
    {start: 14.5, end: 18.5, text: "i still don't\nknow where\nyou are"},
    {start: 18.6, end: 23.2, text: 'they keep me\npretty like\na movie star'},
  ],
};
