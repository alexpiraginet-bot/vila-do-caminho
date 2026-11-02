const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/visual-assets.js'), 'utf8');

function loadAdapter({ manifest, fetchError, decode, httpStatus = 200, offscreen = true, rasterAvailable = true } = {}) {
  const requests = [];
  const rasters = [];
  function canvas(width, height) {
    const raster = { width, height, draws: [] };
    const context = { imageSmoothingEnabled: true, drawImage(...args) {
      assert.equal(this.imageSmoothingEnabled, false);
      raster.draws.push(args);
    } };
    raster.getContext = () => rasterAvailable ? context : null;
    rasters.push(raster);
    return raster;
  }
  const window = {
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (fetchError) throw fetchError;
      return { ok: httpStatus === 200, status: httpStatus,
        json: async () => manifest ?? { image: 'assets/shore-kit.png', sprites: { shelter: { source: [10, 20, 30, 40] } } },
        blob: async () => ({ localImageBytes: true }) };
    },
    createImageBitmap: decode ?? (async () => ({ width: 128, height: 128 }))
  };
  if (offscreen) window.OffscreenCanvas = class { constructor(width, height) { return canvas(width, height); } };
  const document = { baseURI: 'https://local.example/vila/index.html', currentScript: { src: 'https://local.example/vila/visual-assets.js' },
    createElement(tag) { assert.equal(tag, 'canvas'); return canvas(300, 150); } };
  vm.runInNewContext(source, { window, document, URL });
  return { api: window.VilaVisualAssets, requests, rasters };
}

test('sprite load failure settles false and keeps procedural fallback usable', async () => {
  const { api, requests } = loadAdapter({ fetchError: new Error('offline') });
  assert.equal(await api.readyPromise, false);
  assert.equal(api.isReady(), false);
  assert.equal(api.getStatus().state, 'failed');
  assert.equal(requests.length, 1);
  assert.equal(api.drawSprite({ drawImage() { throw new Error('must not draw'); } }, 'shelter', 0, 0, 30, 40), false);
});

test('readiness waits for decoded pixels and drawing uses the exact crop and destination', async () => {
  let resolveDecode;
  let decodeStarted;
  const started = new Promise(resolve => { decodeStarted = resolve; });
  const pixels = { width: 128, height: 128 };
  const { api, requests, rasters } = loadAdapter({ decode: () => {
    decodeStarted();
    return new Promise(resolve => { resolveDecode = resolve; });
  } });
  await started;
  assert.equal(api.isReady(), false);
  assert.equal(api.drawSprite({ drawImage() {} }, 'shelter', 5, 6, 60, 80), false);
  resolveDecode(pixels);
  assert.equal(await api.readyPromise, true);
  assert.equal(api.isReady(), true);
  const calls = [];
  const context = { drawImage(...args) { calls.push(args); } };
  assert.equal(api.drawSprite(context, 'shelter', 5, 6, 60, 80), true);
  assert.deepEqual([rasters[0].width, rasters[0].height], [60, 80]);
  assert.deepEqual(rasters[0].draws, [[pixels, 10, 20, 30, 40, 0, 0, 60, 80]]);
  assert.deepEqual(calls, [[rasters[0], 5, 6]]);
  assert.equal(api.drawSprite(context, 'unknown', 0, 0, 1, 1), false);
  assert.equal(api.drawSprite(context, 'shelter', NaN, 0, 1, 1), false);
  assert.equal(api.drawSprite(context, 'shelter', 0, 0, 0, 1), false);
  assert.equal(calls.length, 1);
  assert.deepEqual(requests.map(request => request.url), ['https://local.example/vila/assets/shore-kit.json', 'https://local.example/vila/assets/shore-kit.png']);
  assert.ok(requests.every(request => request.options.credentials === 'omit' && request.options.redirect === 'error'));
});

test('external or escaping image paths are rejected before any image request', async () => {
  for (const image of ['https://outside.example/kit.png', '//outside.example/kit.png', '../kit.png', 'data:image/png,bytes']) {
    const { api, requests } = loadAdapter({ manifest: { image, sprites: { shelter: { source: [0, 0, 16, 16] } } } });
    assert.equal(await api.readyPromise, false, image);
    assert.equal(requests.length, 1, image);
  }
});

test('bad image bounds reject the entire kit and release the bitmap', async () => {
  let closed = 0;
  const { api } = loadAdapter({ decode: async () => ({ width: 24, height: 24, close() { closed++; } }) });
  assert.equal(await api.readyPromise, false);
  assert.equal(api.isReady(), false);
  assert.equal(closed, 1);
});

test('a decode failure and a canvas draw failure both leave fallback available', async () => {
  const failed = loadAdapter({ decode: async () => { throw new Error('invalid PNG'); } }).api;
  assert.equal(await failed.readyPromise, false);
  const ready = loadAdapter().api;
  assert.equal(await ready.readyPromise, true);
  const context = { imageSmoothingEnabled: true, drawImage() { throw new Error('canvas unavailable'); } };
  assert.equal(ready.drawSprite(context, 'shelter', 0, 0, 30, 40), false);
  assert.equal(context.imageSmoothingEnabled, true);
});

test('sprite keeps its aspect ratio, centers horizontally and rests on the box baseline', async () => {
  const pixels = { width: 128, height: 128 };
  const { api, rasters } = loadAdapter({
    manifest: { image: 'assets/shore-kit.png', sprites: { boat: { source: [4, 6, 20, 10] } } },
    decode: async () => pixels
  });
  assert.equal(await api.readyPromise, true);
  const calls = [];
  const context = { imageSmoothingEnabled: true, drawImage(...args) {
    assert.equal(this.imageSmoothingEnabled, false);
    calls.push(args);
  } };
  assert.equal(api.drawSprite(context, 'boat', 5, 7, 20, 20), true);
  assert.deepEqual(rasters[0].draws, [[pixels, 4, 6, 20, 10, 0, 0, 20, 10]]);
  assert.deepEqual(calls[0], [rasters[0], 5, 17]);
  assert.equal(context.imageSmoothingEnabled, true);
  assert.equal(api.drawSprite(context, 'boat', 5, 7, 40, 10), true);
  assert.deepEqual(calls[1], [rasters[0], 15, 7]);
  assert.equal(rasters.length, 1);
  assert.equal(context.imageSmoothingEnabled, true);
  assert.equal(api.drawSprite(context, 'boat', 5.25, 7.75, 20, 20), true);
  assert.deepEqual(calls[2], [rasters[0], 5, 18]);
  assert.equal(api.drawSprite(context, 'boat', 5, 7, 0.4, 0.4), false);
  assert.equal(calls.length, 3);
});

test('raster cache reuses dimensions and evicts the least recently used entry after 32 variants', async () => {
  const { api, rasters } = loadAdapter();
  await api.readyPromise;
  const calls = [];
  const context = { drawImage(raster) { calls.push(raster); } };
  for (let size = 1; size <= 32; size++) assert.equal(api.drawSprite(context, 'shelter', 0, 0, size * 3, size * 4), true);
  assert.equal(rasters.length, 32);
  api.drawSprite(context, 'shelter', 10, 20, 3, 4);
  assert.equal(calls.at(-1), rasters[0]);
  api.drawSprite(context, 'shelter', 0, 0, 99, 132);
  assert.equal(rasters.length, 33);
  api.drawSprite(context, 'shelter', 0, 0, 3, 4);
  assert.equal(calls.at(-1), rasters[0]);
  assert.equal(rasters.length, 33);
  api.drawSprite(context, 'shelter', 0, 0, 6, 8);
  assert.equal(rasters.length, 34);
  assert.notEqual(calls.at(-1), rasters[1]);
});

test('DOM canvas supports browsers without OffscreenCanvas and raster failure keeps fallback', async () => {
  const { api, rasters } = loadAdapter({ offscreen: false });
  await api.readyPromise;
  assert.equal(api.drawSprite({ drawImage() {} }, 'shelter', 0, 0, 30, 40), true);
  assert.deepEqual([rasters[0].width, rasters[0].height], [30, 40]);
  const failed = loadAdapter({ rasterAvailable: false }).api;
  await failed.readyPromise;
  const context = { imageSmoothingEnabled: true, drawImage() { throw new Error('must not draw'); } };
  assert.equal(failed.drawSprite(context, 'shelter', 0, 0, 30, 40), false);
  assert.equal(context.imageSmoothingEnabled, true);
});
