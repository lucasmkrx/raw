#!/usr/bin/env node
'use strict';

// All geometry comes from raw.svg. No fonts or external image services are used.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const config = require('../brand.config.json');
const root = path.resolve(__dirname, '..');
const { green, black, white } = config.colors;
const entries = [];
let paths;

function svg(body, box, title) {
  return `<!-- Copyright (c) 2026 RAW Technologies LLC. All rights reserved. See LICENSE. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="img"><title>${title}</title>${body}</svg>\n`;
}

function geometry(variant) {
  const fills = {
    color: [white, green], white: [white, white], black: [black, black]
  }[variant];
  if (!fills) throw new Error(`Unknown variant: ${variant}`);
  return paths.map((p, i) => p.replace(/fill="[^"]+"/, `fill="${fills[i]}"`)).join('');
}

function square(widthRatio = config.avatarLogoWidth) {
  const box = config.sourceViewBox;
  const scale = widthRatio * 1000 / box[2];
  const x = (1000 - box[2] * scale) / 2 - box[0] * scale;
  const y = (1000 - box[3] * scale) / 2 - box[1] * scale;
  return svg(`<rect width="1000" height="1000" fill="${black}"/><g transform="translate(${x} ${y}) scale(${scale})">${geometry('color')}</g>`, [0, 0, 1000, 1000], `${config.name} logo`);
}

async function save(file, data, details) {
  const dest = path.join(root, file);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, data);
  const bytes = Buffer.from(data);
  entries.push({ path: file, ...details, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}

async function png(file, source, width, height, details) {
  // Render at 4x then downsample, keeping the fine edges of the original paths.
  const raster = await sharp(Buffer.from(source), { density: 288 })
    .resize(width * 4, height * 4, { fit: 'contain', background: '#00000000' }).png().toBuffer();
  const data = await sharp(raster).resize(width, height, { kernel: 'lanczos3' }).toColourspace('srgb').png({ compressionLevel: 9 }).toBuffer();
  await save(file, data, { ...details, format: 'png', width, height });
}

// A classic ICO uses bottom-up BGRA bitmaps and an AND mask. This avoids relying
// on PNG-compressed ICO support in older readers.
async function makeIco(source, sizes) {
  const frames = [];
  for (const size of sizes) {
    const pixels = await sharp(Buffer.from(source), { density: 288 }).resize(size * 4, size * 4)
      .png().toBuffer().then(b => sharp(b).resize(size, size).ensureAlpha().raw().toBuffer());
    const maskStride = Math.ceil(size / 32) * 4;
    const frame = Buffer.alloc(40 + size * size * 4 + maskStride * size);
    frame.writeUInt32LE(40, 0); frame.writeInt32LE(size, 4); frame.writeInt32LE(size * 2, 8);
    frame.writeUInt16LE(1, 12); frame.writeUInt16LE(32, 14); frame.writeUInt32LE(size * size * 4, 20);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = 40 + ((size - 1 - y) * size + x) * 4;
      frame[dst] = pixels[src + 2]; frame[dst + 1] = pixels[src + 1];
      frame[dst + 2] = pixels[src]; frame[dst + 3] = pixels[src + 3];
      if (pixels[src + 3] === 0) frame[40 + size * size * 4 + (size - 1 - y) * maskStride + (x >> 3)] |= 0x80 >> (x % 8);
    }
    frames.push(frame);
  }
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const p = 6 + i * 16;
    header[p] = size; header[p + 1] = size; header.writeUInt16LE(1, p + 4);
    header.writeUInt16LE(32, p + 6); header.writeUInt32LE(frames[i].length, p + 8); header.writeUInt32LE(offset, p + 12);
    offset += frames[i].length;
  });
  return Buffer.concat([header, ...frames]);
}

async function main() {
  const original = await fs.readFile(path.join(root, config.source), 'utf8');
  paths = original.match(/<path\b[^>]*\/>/g);
  const actualBox = original.match(/viewBox="([^"]+)"/)?.[1].trim().split(/\s+/).map(Number);
  if (!paths || paths.length !== 2 || JSON.stringify(actualBox) !== JSON.stringify(config.sourceViewBox)) {
    throw new Error('Source structure changed. Review geometry extraction and view boxes before regenerating.');
  }
  if (paths.some(p => !/fill="[^"]+"/.test(p))) throw new Error('Each source path must have an explicit fill.');
  // Deliberately only remove generated folders. raw.svg and documentation stay intact.
  for (const folder of ['assets', 'docs/previews']) await fs.rm(path.join(root, folder), { recursive: true, force: true });

  for (const variant of ['color', 'white', 'black']) {
    const source = svg(geometry(variant), config.sourceViewBox, `${config.name} logo`);
    await save(`assets/logos/svg/raw-logo-${variant}.svg`, source, { category: 'logo', variant, format: 'svg', background: 'transparent', viewBox: config.sourceViewBox });
    const width = config.logoWidth;
    await png(`assets/logos/png/raw-logo-${variant}-${width}w.png`, source, width, Math.round(width * config.sourceViewBox[3] / config.sourceViewBox[2]), { category: 'logo', variant, background: 'transparent' });
  }

  const profile = square();
  await png(`assets/social/raw-avatar-${config.avatarSize}.png`, profile, config.avatarSize, config.avatarSize, { category: 'avatar', variant: 'color', background: black });

  const icon = square(config.faviconLogoWidth);
  await save('assets/favicon/favicon.svg', icon, { category: 'favicon', format: 'svg', background: black, viewBox: [0, 0, 1000, 1000] });
  await save('assets/favicon/favicon.ico', await makeIco(icon, [16, 32, 48]), { category: 'favicon', format: 'ico', sizes: [16, 32, 48], background: black });
  await png('assets/favicon/apple-touch-icon.png', profile, 180, 180, { category: 'favicon', background: black });
  for (const size of [192, 512]) {
    await png(`assets/favicon/icon-${size}.png`, profile, size, size, { category: 'favicon', purpose: 'any maskable', background: black });
  }
  await save('assets/favicon/site.webmanifest', JSON.stringify({
    name: config.name, short_name: 'RAW', icons: [192, 512].map(s => ({
      src: `icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png', purpose: 'any maskable'
    })), theme_color: black, background_color: black
  }, null, 2) + '\n', { category: 'website-config', format: 'json' });

  const selections = [
    ['Color', `assets/logos/png/raw-logo-color-${config.logoWidth}w.png`, black],
    ['All white', `assets/logos/png/raw-logo-white-${config.logoWidth}w.png`, black],
    ['All black', `assets/logos/png/raw-logo-black-${config.logoWidth}w.png`, white],
    ['Social avatar', `assets/social/raw-avatar-${config.avatarSize}.png`, '#eeeeee'],
    ['Apple touch icon', 'assets/favicon/apple-touch-icon.png', '#eeeeee'],
    ['Website icon', 'assets/favicon/icon-512.png', '#eeeeee']
  ];
  const tiles = [];
  for (let i = 0; i < selections.length; i++) {
    const [label, file, background] = selections[i];
    const thumb = await sharp(path.join(root, file)).resize(440, 240, { fit: 'contain', background }).flatten({ background }).png().toBuffer();
    const caption = Buffer.from(svg(`<rect width="480" height="320" fill="#f4f4f4"/><text x="20" y="295" font-family="sans-serif" font-size="18" fill="#111">${label}</text>`, [0, 0, 480, 320], label));
    const tile = await sharp(caption).composite([{ input: thumb, left: 20, top: 20 }]).png().toBuffer();
    tiles.push({ input: tile, left: (i % 3) * 480, top: Math.floor(i / 3) * 320 });
  }
  const previewHeight = Math.ceil(selections.length / 3) * 320;
  await save('docs/previews/brand-overview.png', await sharp({ create: { width: 1440, height: previewHeight, channels: 3, background: '#f4f4f4' } }).composite(tiles).png().toBuffer(), { category: 'preview', format: 'png', width: 1440, height: previewHeight });

  entries.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const inventory = {
    schemaVersion: 1, source: config.source,
    sourceSha256: crypto.createHash('sha256').update(original).digest('hex'),
    configSha256: crypto.createHash('sha256').update(await fs.readFile(path.join(root, 'brand.config.json'))).digest('hex'),
    generatorSha256: crypto.createHash('sha256').update(await fs.readFile(__filename)).digest('hex'),
    renderer: { sharp: sharp.versions.sharp, vips: sharp.versions.vips },
    rightsHolder: 'RAW Technologies LLC',
    license: 'Brand assets: LICENSE; tooling and prose: LICENSE-CODE', assets: entries
  };
  await fs.writeFile(path.join(root, 'assets/manifest.json'), JSON.stringify(inventory, null, 2) + '\n');
  await fs.writeFile(path.join(root, 'docs/ASSET-CATALOG.md'), `# Asset catalog\n\nGenerated by \`npm run build\`. Sizes are pixels; \`w\` in logo filenames means width.\n\n| File | Size / viewBox | Background |\n| --- | --- | --- |\n${entries.map(e => `| [${e.path}](../${e.path}) | ${e.width ? `${e.width} × ${e.height}` : e.viewBox ? e.viewBox.join(' ') : e.sizes ? e.sizes.join(', ') : '—'} | ${e.background || '—'} |`).join('\n')}\n`);
  console.log(`Generated ${entries.length} files; source raw.svg preserved.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
