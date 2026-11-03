/* Optional local sprite kit. Loading never changes world state or collision. */
(() => {
  'use strict';
  const root = window;
  const scriptURL = new URL(document.currentScript?.src || document.baseURI, document.baseURI);
  const baseURL = new URL('.', scriptURL);
  const manifestURL = new URL('assets/shore-kit.json', baseURL);
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
      result.set(name, { source: Object.freeze([...source]), image: sprite.image === undefined ? manifest.image : sprite.image });
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
    const images = new Map();
    try {
      if (!['http:', 'https:'].includes(baseURL.protocol) || typeof root.createImageBitmap !== 'function') {
        throw new Error('Local sprite loading requires HTTP and createImageBitmap support.');
      }
      const manifest = await (await read(manifestURL)).json();
      const nextSprites = rectangles(manifest);
      localURL(manifest.image);
      // Validate all paths before fetching any sheet; shared URLs decode only once.
      for (const sprite of nextSprites.values()) sprite.imageURL = localURL(sprite.image);
      for (const sprite of nextSprites.values()) {
        const url = sprite.imageURL;
        if (!images.has(url.href)) {
          images.set(url.href, await root.createImageBitmap(await (await read(url)).blob()));
        }
        const image = images.get(url.href);
        const [x, y, width, height] = sprite.source;
        if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0 ||
            x + width > image.width || y + height > image.height) {
          throw new RangeError('Sprite source rectangle exceeds its decoded image.');
        }
        sprite.bitmap = image;
      }
      sprites = nextSprites;
      status = 'ready';
      return true;
    } catch (error) {
      for (const image of images.values()) image?.close?.();
      failure = error instanceof Error ? error.message : 'Local sprite loading failed.';
      status = 'failed';
      return false;
    }
  }

  function rasterFor(name, width, height, shadowColor) {
    const key = `${name}:${width}x${height}:${shadowColor || ''}`;
    if (rasterCache.has(key)) {
      const cached = rasterCache.get(key);
      rasterCache.delete(key);
      rasterCache.set(key, cached);
      return cached;
    }
    const canvasHeight = height + (shadowColor ? 3 : 0);
    const canvas = typeof root.OffscreenCanvas === 'function' ? new root.OffscreenCanvas(width, canvasHeight) : document.createElement('canvas');
    canvas.width = width;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Sprite raster canvas is unavailable.');
    context.imageSmoothingEnabled = false;
    if (shadowColor) {
      // Compose contact shadow and sprite offscreen, leaving transparent padding below.
      context.globalAlpha = .18;
      context.fillStyle = shadowColor;
      context.fillRect(Math.round(width * .2), height - 4, Math.round(width * .6), 5);
      context.fillRect(Math.round(width * .32), height + 1, Math.round(width * .36), 2);
      context.globalAlpha = 1;
    }
    const sprite = sprites.get(name);
    context.drawImage(sprite.bitmap, ...sprite.source, 0, 0, width, height);
    rasterCache.set(key, canvas);
    if (rasterCache.size > MAX_RASTERS) rasterCache.delete(rasterCache.keys().next().value);
    return canvas;
  }

  function drawSprite(context, name, x, y, width, height, options = {}) {
    if (status !== 'ready' || !context || typeof context.drawImage !== 'function' || !sprites.has(name) ||
        ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return false;
    // Destination dimensions are a bounding box. Keep the source aspect ratio,
    // center horizontally and anchor the sprite's feet to the box's bottom edge.
    const shadowColor = options?.shadowColor;
    if (shadowColor !== undefined && (typeof shadowColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(shadowColor))) return false;
    const source = sprites.get(name).source;
    const scale = Math.min(width / source[2], height / source[3]);
    const drawWidth = Math.min(Math.floor(width), Math.round(source[2] * scale));
    const drawHeight = Math.min(Math.floor(height), Math.round(source[3] * scale));
    if (drawWidth <= 0 || drawHeight <= 0) return false;
    const drawX = Math.round(x + (width - drawWidth) / 2);
    const drawY = Math.round(y + height - drawHeight);
    const previousSmoothing = context.imageSmoothingEnabled;
    try {
      // Downsample the sheet to world pixels before the caller's camera/DPR transform.
      const raster = rasterFor(name, drawWidth, drawHeight, shadowColor);
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
