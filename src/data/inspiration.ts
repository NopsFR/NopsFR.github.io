// Clips shown in the About page's "Inspired by" gallery. None of these are
// Oscar's work — each is another creator's TikTok, hosted locally under
// public/videos/ with the original watermark left intact and credited by
// handle. Dimensions are the files' real pixel sizes (used for aspect ratio
// so the layout never shifts while a clip loads).
//
// `column` places a clip in the left (0) or right (1) desktop column; the two
// stacks are balanced by total height. On narrow screens they collapse into a
// single column in array order.
export interface Clip {
  slug: string; // public/videos/<slug>.mp4 + public/videos/posters/<slug>.jpg
  title: string;
  creator: string; // TikTok handle, without the @
  width: number;
  height: number;
  column: 0 | 1;
}

export const clips: Clip[] = [
  { slug: 'moto-onboard', title: 'Road racing onboard', creator: 'apple.user2887886', width: 1024, height: 576, column: 0 },
  { slug: 'record-shop', title: 'Record shop', creator: '_ydkme_lilpeepfan420', width: 576, height: 1024, column: 0 },
  { slug: 'coraline-edit', title: 'Coraline edit', creator: 'ekybow', width: 1024, height: 576, column: 0 },
  { slug: 'face-paint', title: 'Face paint', creator: 'g3ng4rb0y', width: 576, height: 1024, column: 0 },
  { slug: 'motogp-edit', title: 'MotoGP edit', creator: 'kammler.gonsoulin', width: 576, height: 1024, column: 1 },
  { slug: 'drums', title: 'Drumming', creator: 'bennybellson', width: 654, height: 360, column: 1 },
  { slug: 'street', title: 'Street clips', creator: 'neptuniont', width: 576, height: 1024, column: 1 },
  { slug: 'visual-art', title: 'Visual art', creator: 'meme3_ctrl8', width: 1024, height: 576, column: 1 },
];
