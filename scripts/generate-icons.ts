/**
 * Renders the favicon from the same SVG the app bar shows, so the browser tab
 * and the in-app logo can never drift. The installed-app icons, the Apple
 * touch icon and the iOS splash screens are rendered at build time by routes
 * instead (see docs/pwa.md).
 *
 * Run with: bun run generate:icons
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/icons/logo-app.svg";
const source = await readFile(SOURCE);

/** Renders the mark at `size`, keeping its transparent background. */
async function transparent(size: number) {
  return sharp(source, { density: 512 })
    .resize(size, size, { fit: "contain", background: "#00000000" })
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

const favicon = ico(
  await Promise.all(
    [16, 32, 48].map(async (size) => ({ size, png: await transparent(size) })),
  ),
);
await writeFile("src/app/favicon.ico", favicon);
console.log("Created src/app/favicon.ico");
