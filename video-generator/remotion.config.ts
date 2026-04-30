import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(null);
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');

// Public dir lives next to the source so users can drop assets there
// and reference them with /assets/foo.png from their JSON config.
Config.setPublicDir('public');

// Higher-quality encode for cinematic look
Config.setCrf(18);
