/**
 * The hero's head turns to look where the pointer is. It's a turntable rendered offline
 * (web/scripts/hero/scene.py): one frame every 2° from 60° left to 60° right. This
 * scrubs those frames on a canvas, blending the two nearest, so it turns smoothly and
 * costs the visitor's device almost nothing. No framework: it runs outside React's
 * renders, writes only to the canvas and a few CSS variables, and sleeps when settled.
 */
export const MAX_ANGLE = 60;
export const STEP = 2;
export const FRAME_COUNT = (2 * MAX_ANGLE) / STEP + 1;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Pointer x across an element -> where the head should look: the far edges are 60°. */
export function angleFromPointer(x: number, left: number, width: number) {
  return clamp(((x - left) / width) * 2 - 1, -1, 1) * MAX_ANGLE;
}

/** "24° left", "ahead", "60° right" */
export function describeAngle(angle: number) {
  const deg = Math.round(Math.abs(angle));
  return deg < 2 ? 'ahead' : `${deg}° ${angle < 0 ? 'left' : 'right'}`;
}

/** The order frames load in: the centre first, then ever finer steps across the turn. */
export function loadOrder(count = FRAME_COUNT) {
  const order: number[] = [];
  const seen = new Set<number>();
  const add = (i: number) => {
    if (i >= 0 && i < count && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  add(Math.floor((count - 1) / 2));
  for (const stride of [10, 5, 2, 1]) for (let i = 0; i < count; i += stride) add(i);
  return order;
}

export interface GazeOptions {
  canvas: HTMLCanvasElement;
  /** Where the pointer is measured from, and where --gaze (-1..1) is written. */
  root: HTMLElement;
  frames: string[];
  /** Called when the shown angle changes by a whole degree. */
  onAngle?: (angle: number) => void;
  reducedMotion: boolean;
  /** Fewer frames, for Save-Data. */
  light?: boolean;
}

export function startGaze({ canvas, root, frames, onAngle, reducedMotion, light }: GazeOptions) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const images: (HTMLImageElement | null)[] = frames.map(() => null);
  let stopped = false;
  let target = 0;
  let angle = 0;
  let shown = Number.NaN;
  let lastDegree = Number.NaN;
  let raf = 0;
  let last = 0;
  let lastPointer = 0;
  let visible = true;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  /** The loaded frame closest to i: while the rest arrive, she turns in coarser steps. */
  const nearest = (i: number) => {
    for (let d = 0; i - d >= 0 || i + d < images.length; d++) {
      if (images[i - d]) return images[i - d];
      if (images[i + d]) return images[i + d];
    }
    return null;
  };

  const draw = () => {
    const f = (angle + MAX_ANGLE) / STEP;
    const i0 = Math.floor(f);
    const t = f - i0;
    const a = nearest(i0);
    const b = t > 0.01 ? nearest(Math.min(i0 + 1, images.length - 1)) : null;
    if (!a) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (b && b !== a) {
      // Premultiplied frames added together: an exact blend, with no halo where one is clear.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(a, 0, 0, width, height);
      ctx.globalAlpha = t;
      ctx.drawImage(b, 0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.drawImage(a, 0, 0, width, height);
    }
    shown = angle;
    canvas.dataset.ready = 'true';
    root.style.setProperty('--gaze', (angle / MAX_ANGLE).toFixed(3));
    const degree = Math.round(angle);
    if (degree !== lastDegree) {
      lastDegree = degree;
      onAngle?.(angle);
    }
  };

  const tick = (now: number) => {
    raf = 0;
    if (stopped || !visible) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    // Touch screens have no pointer to follow: she looks around on her own until touched.
    if (coarse && !reducedMotion && now - lastPointer > 2500) target = Math.sin(now / 2200) * 34;
    // Ease toward the target and settle, never overshoot: the app's ease-out, as a spring with no bounce.
    angle += (target - angle) * (1 - Math.exp(-dt / (reducedMotion ? 0.04 : 0.14)));
    if (Math.abs(target - angle) < 0.02) angle = target;
    if (angle !== shown) draw();
    if (angle !== target || (coarse && !reducedMotion)) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  const wake = () => {
    if (!raf && !stopped && visible) raf = requestAnimationFrame(tick);
  };

  let rect = root.getBoundingClientRect();
  const measure = () => {
    rect = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    const size = Math.round(Math.min(box.width * dpr, 1200));
    if (size && canvas.width !== size) {
      canvas.width = canvas.height = size;
      shown = Number.NaN;
      wake();
    }
  };
  measure();
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
  resize?.observe(canvas);
  // Scrolling moves her; measure again only when the pointer next needs it.
  let stale = false;
  const onScroll = () => (stale = true);
  const onPointer = (event: PointerEvent) => {
    // A finger only steers her while it's down on her (the figure lets sideways drags through).
    if (event.pointerType === 'touch' && !canvas.parentElement?.contains(event.target as Node))
      return;
    lastPointer = performance.now();
    if (stale) {
      rect = root.getBoundingClientRect();
      stale = false;
    }
    target = angleFromPointer(event.clientX, rect.left, rect.width);
    wake();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  const seen =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) wake();
        })
      : null;
  seen?.observe(root);

  // Load the frames after the page has painted: the centre one first, then the rest.
  const order = loadOrder(frames.length).filter((i, n) => !light || n === 0 || i % 4 === 0);
  let next = 0;
  const loadNext = () => {
    if (stopped || next >= order.length) return;
    const i = order[next++];
    const img = new Image();
    img.decoding = 'async';
    img.src = frames[i];
    img
      .decode()
      .then(() => {
        if (stopped) return;
        images[i] = img;
        shown = Number.NaN;
        wake();
      })
      .catch(() => {})
      .finally(loadNext);
  };
  const begin = () => {
    for (let k = 0; k < 4; k++) loadNext(); // four at a time
  };
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    resize?.disconnect();
    seen?.disconnect();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('load', begin);
  };
}
