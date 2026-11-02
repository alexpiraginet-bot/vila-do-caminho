/* Optional local sprite kit. Loading never changes world state or collision. */
(() => {
  'use strict';
  const root = window;
  const scriptURL = new URL(document.currentScript?.src || document.baseURI, document.baseURI);
  const baseURL = new URL('.', scriptURL);
  const manifestURL = new URL('assets/shore-kit.json', baseURL);
  let bitmap = null;
  let sprites = new Map();
  let status = 'loading';
  let failure = null;
  const rasterCache = new Map();
  const MAX_RASTERS = 32;

  function localURL(relative) {
    if (typeof relative !== 'string' || !relative || /^[a-z][a-z\d+.-]*:/i.test(relative) || relative.startsWith('/')) {
      throw new TypeError('Sprite image must use a local relative path.');
    }
    const url = new URL(relative, baseURL);
    if (url.origin !== baseURL.origin || !url.pathname.startsWith(baseURL.pathname)) {
      throw new TypeError('Sprite image must stay inside this application.');
    }
    return url;
  }

  function rectangles(manifest) {
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
        !manifest.sprites || typeof manifest.sprites !== 'object' || Array.isArray(manifest.sprites)) {
      throw new TypeError('Sprite manifest needs a sprites object.');
    }
    const result = new Map();
    for (const [name, sprite] of Object.entries(manifest.sprites)) {
      const source = sprite?.source;
      if (!/^[a-z][a-z\d_-]{0,63}$/i.test(name) || !Array.isArray(source) || source.length !== 4 ||
          !source.every(Number.isSafeInteger) || source[0] < 0 || source[1] < 0 || source[2] <= 0 || source[3] <= 0) {
        throw new TypeError('Invalid sprite source rectangle.');
      }
      result.set(name, Object.freeze([...source]));
    }
    if (!result.size) throw new TypeError('Sprite manifest cannot be empty.');
    return result;
  }

  async function read(url) {
    const response = await root.fetch(url.href, { credentials: 'omit', redirect: 'error', cache: 'no-cache' });
    if (!response.ok) throw new Error(`Local sprite asset returned HTTP ${response.status}.`);
    return response;
  }

  async function load() {
    let candidate = null;
    try {
      if (!['http:', 'https:'].includes(baseURL.protocol) || typeof root.createImageBitmap !== 'function') {
        throw new Error('Local sprite loading requires HTTP and createImageBitmap support.');
      }
      const manifest = await (await read(manifestURL)).json();
      const nextSprites = rectangles(manifest);
      const imageURL = localURL(manifest.image);
      candidate = await root.createImageBitmap(await (await read(imageURL)).blob());
      if (!Number.isFinite(candidate.width) || !Number.isFinite(candidate.height) || candidate.width <= 0 || candidate.height <= 0 ||
          [...nextSprites.values()].some(([x, y, width, height]) => x + width > candidate.width || y + height > candidate.height)) {
        throw new RangeError('Sprite source rectangle exceeds the decoded image.');
      }
      bitmap = candidate;
      sprites = nextSprites;
      status = 'ready';
      return true;
    } catch (error) {
      candidate?.close?.();
      failure = error instanceof Error ? error.message : 'Local sprite loading failed.';
      status = 'failed';
      return false;
    }
  }

  function rasterFor(name, width, height) {
    const key = `${name}:${width}x${height}`;
    if (rasterCache.has(key)) {
      const cached = rasterCache.get(key);
      rasterCache.delete(key);
      rasterCache.set(key, cached);
      return cached;
    }
    const canvas = typeof root.OffscreenCanvas === 'function' ? new root.OffscreenCanvas(width, height) : document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Sprite raster canvas is unavailable.');
    context.imageSmoothingEnabled = false;
    context.drawImage(bitmap, ...sprites.get(name), 0, 0, width, height);
    rasterCache.set(key, canvas);
    if (rasterCache.size > MAX_RASTERS) rasterCache.delete(rasterCache.keys().next().value);
    return canvas;
  }

  function drawSprite(context, name, x, y, width, height) {
    if (status !== 'ready' || !context || typeof context.drawImage !== 'function' || !sprites.has(name) ||
        ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return false;
    // Destination dimensions are a bounding box. Keep the source aspect ratio,
    // center horizontally and anchor the sprite's feet to the box's bottom edge.
    const source = sprites.get(name);
    const scale = Math.min(width / source[2], height / source[3]);
    const drawWidth = Math.min(Math.floor(width), Math.round(source[2] * scale));
    const drawHeight = Math.min(Math.floor(height), Math.round(source[3] * scale));
    if (drawWidth <= 0 || drawHeight <= 0) return false;
    const drawX = Math.round(x + (width - drawWidth) / 2);
    const drawY = Math.round(y + height - drawHeight);
    const previousSmoothing = context.imageSmoothingEnabled;
    try {
      // Downsample the sheet to world pixels before the caller's camera/DPR transform.
      const raster = rasterFor(name, drawWidth, drawHeight);
      context.imageSmoothingEnabled = false;
      context.drawImage(raster, drawX, drawY);
      return true;
    } catch {
      return false;
    } finally {
      context.imageSmoothingEnabled = previousSmoothing;
    }
  }

  const readyPromise = load();
  root.VilaVisualAssets = Object.freeze({
    readyPromise,
    isReady: () => status === 'ready',
    getStatus: () => ({ state: status, error: failure }),
    drawSprite
  });
})();
