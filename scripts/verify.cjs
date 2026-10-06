#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const config = require('../brand.config.json');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function walk(folder) {
  const results = [];
  for (const entry of await fs.readdir(path.join(root, folder), { withFileTypes: true })) {
    const name = `${folder}/${entry.name}`;
    results.push(...(entry.isDirectory() ? await walk(name) : [name]));
  }
  return results;
}

async function main() {
  const inventory = JSON.parse(await fs.readFile(path.join(root, 'assets/manifest.json'), 'utf8'));
  assert.equal(inventory.rightsHolder, 'RAW Technologies LLC', 'Brand rights holder must be preserved');
  assert.equal(hash(await fs.readFile(path.join(root, config.source))), inventory.sourceSha256, 'Source changed: rebuild exports');
  assert.equal(hash(await fs.readFile(path.join(root, 'brand.config.json'))), inventory.configSha256, 'Configuration changed: rebuild exports');
  assert.equal(hash(await fs.readFile(path.join(root, 'scripts/build.cjs'))), inventory.generatorSha256, 'Generator changed: rebuild exports');
  const names = inventory.assets.map(a => a.path);
  assert.equal(new Set(names).size, names.length, 'Duplicate asset paths');
  const actual = [...await walk('assets'), ...await walk('docs/previews')].filter(p => p !== 'assets/manifest.json').sort();
  assert.deepEqual(actual, [...names].sort(), 'Generated file set differs from manifest');
  const originalPaths = (await fs.readFile(path.join(root, config.source), 'utf8')).match(/\bd="([^"]+)"/g);
  for (const asset of inventory.assets) {
    const file = path.join(root, asset.path);
    const bytes = await fs.readFile(file);
    assert.equal(hash(bytes), asset.sha256, `Hash mismatch: ${asset.path}`);
    assert.equal(bytes.length, asset.bytes, `Byte count: ${asset.path}`);
    if (asset.format === 'svg') {
      const text = bytes.toString();
      assert.ok(text.includes('<title>') && text.includes('<path'), `Missing artwork or accessible title: ${asset.path}`);
      assert.ok(text.includes('Copyright (c) 2026 RAW Technologies LLC. All rights reserved. See LICENSE.'), `Missing company rights notice: ${asset.path}`);
      assert.ok(!/<script|<image|<foreignObject|(?:href|onload)=/i.test(text), `SVG external content: ${asset.path}`);
      assert.equal(text.match(/viewBox="([^"]+)"/)[1], asset.viewBox.join(' '));
      assert.deepEqual(text.match(/\bd="([^"]+)"/g), originalPaths, `Full original logo required: ${asset.path}`);
    }
    if (asset.format !== 'png') continue;
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, asset.width, `Width: ${asset.path}`);
    assert.equal(meta.height, asset.height, `Height: ${asset.path}`);
    assert.equal(meta.space, 'srgb', `Color space: ${asset.path}`);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let visible = 0, transparent = 0, foreground = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = data.subarray(i, i + 4);
      if (a > 0) visible++;
      if (a === 0) transparent++;
      if (asset.background !== 'transparent') assert.equal(a, 255, `Nonopaque background: ${asset.path}`);
      if (asset.background === 'transparent' && ['white', 'black'].includes(asset.variant) && a > 220) {
        const expected = asset.variant === 'white' ? 255 : 0;
        for (const c of [r, g, b]) assert.ok(Math.abs(c - expected) <= 2, `Nonmonochrome pixel: ${asset.path}`);
      }
      if (asset.purpose?.split(' ').includes('maskable') && Math.max(r, g, b) > 8) {
        foreground++;
        const pixel = i / 4;
        const x = pixel % info.width + 0.5 - info.width / 2;
        const y = Math.floor(pixel / info.width) + 0.5 - info.height / 2;
        assert.ok(Math.hypot(x, y) <= info.width * 0.4, `Logo outside maskable safe circle: ${asset.path}`);
      }
    }
    assert.ok(visible > 0, `Empty asset: ${asset.path}`);
    if (asset.background === 'transparent') assert.ok(transparent > 0, `Missing transparency: ${asset.path}`);
    if (asset.purpose?.split(' ').includes('maskable')) assert.ok(foreground > 0, `Empty maskable artwork: ${asset.path}`);
    if (asset.category === 'avatar') {
      const background = asset.background.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16));
      let foreground = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        if (background.some((c, j) => Math.abs(data[i + j] - c) > 8)) {
          foreground++;
          assert.ok(Math.hypot(x + 0.5 - info.width / 2, y + 0.5 - info.height / 2) < info.width * 0.5, `Avatar clips in a circular crop: ${asset.path}`);
        }
      }
      assert.ok(foreground > 0, `Empty avatar: ${asset.path}`);
    }
  }

  const ico = await fs.readFile(path.join(root, 'assets/favicon/favicon.ico'));
  assert.equal(ico.readUInt16LE(0), 0); assert.equal(ico.readUInt16LE(2), 1); assert.equal(ico.readUInt16LE(4), 3);
  let end = 54;
  for (const [i, size] of [16, 32, 48].entries()) {
    const p = 6 + i * 16, offset = ico.readUInt32LE(p + 12), length = ico.readUInt32LE(p + 8);
    assert.equal(ico[p], size); assert.equal(ico[p + 1], size); assert.equal(offset, end);
    assert.equal(ico.readUInt32LE(offset), 40); assert.equal(ico.readInt32LE(offset + 4), size);
    assert.equal(ico.readInt32LE(offset + 8), size * 2); assert.equal(ico.readUInt16LE(offset + 14), 32);
    assert.equal(length, 40 + size * size * 4 + Math.ceil(size / 32) * 4 * size);
    end = offset + length;
  }
  assert.equal(end, ico.length);
  const webmanifest = JSON.parse(await fs.readFile(path.join(root, 'assets/favicon/site.webmanifest'), 'utf8'));
  for (const icon of webmanifest.icons) {
    const asset = inventory.assets.find(a => a.path === `assets/favicon/${icon.src}`);
    assert.ok(asset, `Missing manifest icon: ${icon.src}`);
    assert.equal(icon.sizes, `${asset.width}x${asset.height}`); assert.equal(icon.purpose, asset.purpose);
  }
  const catalog = await fs.readFile(path.join(root, 'docs/ASSET-CATALOG.md'), 'utf8');
  for (const name of names) assert.ok(catalog.includes(`](../${name})`), `Missing catalog link: ${name}`);
  console.log(`Verified ${names.length} assets: hashes, dimensions, transparency, monochrome colors, circular crops, maskable safe areas, ICO frames, and manifest references.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
