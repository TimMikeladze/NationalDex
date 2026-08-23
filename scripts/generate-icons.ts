/**
 * Renders every favicon / PWA icon from the same SVG the app bar shows, so the
 * browser tab, the installed app icon, and the in-app logo can never drift.
 *
 * Run with: bun run generate:icons
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/icons/logo-app.svg";
/** Manifest `background_color` — the plate behind masked/opaque icons. */
const BACKDROP = "#09090b";

const source = await readFile(SOURCE);

/** Renders the mark at `size`, keeping its transparent background. */
async function transparent(size: number) {
  return sharp(source, { density: 512 })
    .resize(size, size, { fit: "contain", background: "#00000000" })
    .png()
    .toBuffer();
}

/**
 * Renders the mark centered on an opaque plate, inset so it survives the
 * circle/squircle crops Android and iOS apply to installed icons. Android's
 * maskable spec only guarantees the middle 80%, so the mark gets more padding
 * there than on the Apple touch icon, which is only rounded at the corners.
 */
async function plated(size: number, markRatio: number) {
  const mark = await transparent(Math.round(size * markRatio));
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKDROP,
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

/** Packs PNG frames into an .ico container (all evergreen browsers read these). */
function ico(frames: { size: number; png: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  let offset = 6 + frames.length * 16;
  const entries: Buffer[] = [];

  for (const { size, png } of frames) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

await mkdir("public/icons", { recursive: true });

const outputs: [string, Buffer][] = [
  ["public/icons/icon-192x192.png", await transparent(192)],
  ["public/icons/icon-512x512.png", await transparent(512)],
  ["public/icons/icon-maskable-192x192.png", await plated(192, 0.6)],
  ["public/icons/icon-maskable-512x512.png", await plated(512, 0.6)],
  ["public/icons/apple-touch-icon.png", await plated(180, 0.82)],
];

for (const [path, data] of outputs) {
  await writeFile(path, data);
  console.log(`Created ${path}`);
}

const favicon = ico(
  await Promise.all(
    [16, 32, 48].map(async (size) => ({ size, png: await transparent(size) })),
  ),
);
await writeFile("src/app/favicon.ico", favicon);
console.log("Created src/app/favicon.ico");
