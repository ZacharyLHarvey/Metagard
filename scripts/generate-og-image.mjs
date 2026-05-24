/**
 * Composites public/images/logo2.png onto a 1200x630 canvas for Open Graph / Discord previews.
 * Usage: node scripts/generate-og-image.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOGO = join(ROOT, "public", "images", "logo2.png");
const OUT = join(ROOT, "public", "og-image.png");

const WIDTH = 1200;
const HEIGHT = 630;
const BG = { r: 10, g: 10, b: 10, alpha: 1 };

const logo = sharp(LOGO);
const meta = await logo.metadata();
const maxLogoWidth = Math.round(WIDTH * 0.72);
const maxLogoHeight = Math.round(HEIGHT * 0.72);
const scale = Math.min(maxLogoWidth / meta.width, maxLogoHeight / meta.height);
const logoWidth = Math.round(meta.width * scale);
const logoHeight = Math.round(meta.height * scale);
const left = Math.round((WIDTH - logoWidth) / 2);
const top = Math.round((HEIGHT - logoHeight) / 2);

const resizedLogo = await logo.resize(logoWidth, logoHeight).png().toBuffer();

await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 4,
    background: BG,
  },
})
  .composite([{ input: resizedLogo, left, top }])
  .png()
  .toFile(OUT);

console.log(`Wrote ${OUT} (${WIDTH}x${HEIGHT})`);
