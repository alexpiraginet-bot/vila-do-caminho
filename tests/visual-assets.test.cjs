const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/visual-assets.js'), 'utf8');

function loadAdapter({ manifest, fetchError, decode, httpStatus = 200, offscreen = true, rasterAvailable = true, rasterThrow = null } = {}) {
  const requests = [];
  const rasters = [];
  function canvas(width, height) {
    const raster = { width, height, draws: [], fills: [] };
    const context = { imageSmoothingEnabled: true, drawImage(...args) {
      assert.equal(this.imageSmoothingEnabled, false);
      if (rasterThrow === 'draw') throw new Error('raster draw failed');
      raster.draws.push(args);
    }, fillRect(...args) {
      if (rasterThrow === 'fill') throw new Error('raster fill failed');
      raster.fills.push({ args, alpha: this.globalAlpha, color: this.fillStyle });
    } };
    raster.getContext = () => rasterAvailable ? context : null;
    rasters.push(raster);
    return raster;
  }
  const window = {
    fetch: async (url, options) => {
      requests.push({ url, options });
      const error = typeof fetchError === 'function' ? fetchError(url) : fetchError;
      if (error) throw error;
      return { ok: httpStatus === 200, status: httpStatus,
        json: async () => manifest ?? { image: 'assets/shore-kit.png', sprites: { shelter: { source: [10, 20, 30, 40] } } },
        blob: async () => ({ localImageBytes: true, url }) };
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

function runtimeSprite(api) {
  const world = fs.readFileSync(path.join(__dirname, '../public/world.js'), 'utf8');
  const start = world.indexOf('function sprite(');
  const end = world.indexOf('\nfunction pathWidth', start);
  assert.ok(start >= 0 && end > start);
  const context = { VilaVisualAssets: api, CELLS: { shelter: [0, 0, 30, 40] }, P: { ink: '#4a3825' } };
  vm.runInNewContext(world.slice(start, end) + '\nglobalThis.drawRuntimeSprite = sprite;', context);
  return context.drawRuntimeSprite;
}

test('contact shadow and sprite are composed offscreen and touch the destination only once', async () => {
  const { api, rasters } = loadAdapter();
  await api.readyPromise;
  const draws = [];
  const context = { imageSmoothingEnabled: true, globalAlpha: .7, fillStyle: 'untouched',
    drawImage(...args) { draws.push(args); }, fillRect() { assert.fail('destination must not receive a shadow fill'); } };
  runtimeSprite(api)(context, {}, 'shelter', 5, 6);
  assert.equal(draws.length, 1);
  assert.deepEqual(draws[0], [rasters[0], 5, 6]);
  assert.deepEqual([rasters[0].width, rasters[0].height], [30, 43]);
  assert.equal(rasters[0].fills.length, 2);
  assert.ok(rasters[0].fills.every(fill => fill.alpha === .18 && fill.color === '#4a3825'));
  assert.equal(rasters[0].draws.length, 1);
  assert.equal(context.imageSmoothingEnabled, true);
  assert.equal(context.globalAlpha, .7);
  assert.equal(context.fillStyle, 'untouched');
  runtimeSprite(api)(context, {}, 'shelter', 15, 16);
  assert.equal(rasters.length, 1, 'same shadow and dimensions reuse the complete composition');
});

test('raster or final draw failure reaches atlas fallback without any destination fill', async () => {
  for (const failure of ['fill', 'draw', 'destination']) {
    const { api, rasters } = loadAdapter({ rasterThrow: failure === 'destination' ? null : failure });
    await api.readyPromise;
    const atlas = { proceduralAtlas: true };
    const destinationWrites = [];
    const context = { imageSmoothingEnabled: true,
      fillRect(...args) { destinationWrites.push({ kind: 'fill', args }); },
      drawImage(image, ...args) {
        if (failure === 'destination' && image !== atlas) throw new Error('destination draw failed');
        destinationWrites.push({ kind: image === atlas ? 'fallback' : 'kit', args });
      }
    };
    runtimeSprite(api)(context, atlas, 'shelter', 5, 6);
    assert.deepEqual(destinationWrites, [{ kind: 'fallback', args: [0, 0, 30, 40, 5, 6, 30, 40] }], failure);
    assert.equal(context.imageSmoothingEnabled, true, failure);
    if (failure === 'draw') assert.equal(rasters[0].fills.length, 2, 'offscreen shadow may exist but never reaches destination');
  }
});

test('sprite image overrides share one decoded sheet per URL and select the correct bitmap', async () => {
  const original = { width: 128, height: 128, label: 'original' };
  const details = { width: 24, height: 24, label: 'details' };
  const decoded = [];
  const manifest = { image: 'assets/shore-kit.png', sprites: {
    shelter: { source: [10, 20, 30, 40] },
    olive: { image: 'assets/shore-details-v2.png', source: [0, 0, 12, 16] },
    basket: { image: 'assets/shore-details-v2.png', source: [12, 0, 12, 12] }
  } };
  const { api, requests, rasters } = loadAdapter({ manifest, decode: async blob => {
    decoded.push(blob.url);
    return blob.url.endsWith('shore-kit.png') ? original : details;
  } });
  assert.equal(await api.readyPromise, true);
  assert.equal(decoded.length, 2);
  assert.equal(requests.length, 3);
  const context = { drawImage() {} };
  api.drawSprite(context, 'shelter', 0, 0, 30, 40);
  api.drawSprite(context, 'olive', 0, 0, 12, 16);
  api.drawSprite(context, 'basket', 0, 0, 12, 12);
  assert.equal(rasters[0].draws[0][0], original);
  assert.equal(rasters[1].draws[0][0], details);
  assert.equal(rasters[2].draws[0][0], details);
});

test('override crop validation uses its own sheet and rejects the whole kit atomically', async () => {
  let closed = 0;
  const manifest = { image: 'assets/shore-kit.png', sprites: {
    shelter: { source: [0, 0, 20, 20] },
    olive: { image: 'assets/shore-details-v2.png', source: [0, 0, 20, 20] }
  } };
  const { api } = loadAdapter({ manifest, decode: async blob => ({
    width: blob.url.endsWith('shore-kit.png') ? 128 : 16,
    height: blob.url.endsWith('shore-kit.png') ? 128 : 16,
    close() { closed++; }
  }) });
  assert.equal(await api.readyPromise, false);
  assert.equal(api.isReady(), false);
  assert.equal(closed, 2);
  assert.equal(api.drawSprite({ drawImage() { assert.fail('partially loaded kit must not draw'); } }, 'shelter', 0, 0, 20, 20), false);
});

test('an external override is rejected before sheet loading, and a missing override keeps fallback', async () => {
  const make = image => ({ image: 'assets/shore-kit.png', sprites: {
    shelter: { source: [0, 0, 20, 20] }, olive: { image, source: [0, 0, 16, 16] }
  } });
  const outside = loadAdapter({ manifest: make('https://outside.example/override.png') });
  assert.equal(await outside.api.readyPromise, false);
  assert.equal(outside.requests.length, 1);
  let closed = 0;
  const missing = loadAdapter({ manifest: make('assets/shore-details-v2.png'),
    fetchError: url => url.endsWith('shore-details-v2.png') ? new Error('missing override') : null,
    decode: async () => ({ width: 128, height: 128, close() { closed++; } })
  });
  assert.equal(await missing.api.readyPromise, false);
  assert.equal(missing.api.isReady(), false);
  assert.equal(closed, 1);
});
