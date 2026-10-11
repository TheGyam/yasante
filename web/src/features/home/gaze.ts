/**
 * Where the hero is looking. Follows the pointer (on a phone, a finger dragged across her;
 * until then she looks around on her own) and turns it into a pose for ./turn.ts: her head
 * glides there on a critically damped spring. No framework: it runs outside React's renders
 * and sleeps whenever she's settled or off screen.
 */

/** What the readout calls the furthest turn. */
export const MAX_ANGLE = 60;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Pointer x across an element -> where she should look: the far edges are 60°. */
export function angleFromPointer(x: number, left: number, width: number) {
  return clamp(((x - left) / width) * 2 - 1, -1, 1) * MAX_ANGLE;
}

/** "24° left", "ahead", "60° right" */
export function describeAngle(angle: number) {
  const deg = Math.round(Math.abs(angle));
  return deg < 2 ? 'ahead' : `${deg}° ${angle < 0 ? 'left' : 'right'}`;
}

/** One step of a critically damped spring, solved exactly: glides in, never overshoots. */
export function settle(x: number, v: number, target: number, w: number, dt: number) {
  const y = x - target;
  const decay = Math.exp(-w * dt);
  const k = (v + w * y) * dt;
  return [target + (y + k) * decay, (v - w * k) * decay] as const;
}

/** -1 (her head turned fully to the left) … 1 (right); nod -1 (up) … 1 (down). */
export interface Pose {
  turn: number;
  nod: number;
}

export interface GazeOptions {
  /** Where the pointer is measured from, and where --gaze (-1..1) is written. */
  root: HTMLElement;
  /** Her figure: a finger only steers her on it. */
  figure: HTMLElement;
  pose: (pose: Pose) => void;
  /** Called when the turn changes by a whole degree. */
  onAngle?: (angle: number) => void;
  reducedMotion: boolean;
}

export function startGaze({ root, figure, pose, onAngle, reducedMotion }: GazeOptions) {
  let stopped = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  let lastPointer = 0;
  let target = 0; // degrees, -60 … 60
  let targetY = 0; // -1 … 1
  let angle = 0;
  let speed = 0;
  let nod = 0;
  let nodV = 0;
  let lastDegree = Number.NaN;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const wander = coarse && !reducedMotion;

  const tick = (now: number) => {
    raf = 0;
    if (stopped || !visible) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    // Touch screens have no pointer to follow: she looks around on her own until touched.
    if (wander && now - lastPointer > 2500) {
      target = Math.sin(now / 2400) * 38;
      targetY = Math.sin(now / 3100) * 0.3;
    }

    [angle, speed] = settle(angle, speed, target, reducedMotion ? 30 : 6, dt);
    [nod, nodV] = settle(nod, nodV, targetY, reducedMotion ? 30 : 6, dt);
    pose({ turn: angle / MAX_ANGLE, nod: clamp(nod, -1, 1) });
    root.style.setProperty('--gaze', (angle / MAX_ANGLE).toFixed(3));
    const degree = Math.round(angle);
    if (degree !== lastDegree) {
      lastDegree = degree;
      onAngle?.(angle);
    }

    const moving =
      Math.abs(target - angle) > 0.02 ||
      Math.abs(speed) > 0.05 ||
      Math.abs(targetY - nod) > 0.002 ||
      Math.abs(nodV) > 0.005;
    // Settled: sleep until the pointer moves.
    if (moving || wander) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  const wake = () => {
    if (!raf && !stopped && visible) raf = requestAnimationFrame(tick);
  };

  let rect = root.getBoundingClientRect();
  let face = figure.getBoundingClientRect();
  let stale = false;
  const measure = () => {
    rect = root.getBoundingClientRect();
    face = figure.getBoundingClientRect();
    stale = false;
  };
  // A new size redraws her too (a resized canvas starts blank).
  const resize =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          measure();
          wake();
        })
      : null;
  resize?.observe(root);
  // Scrolling moves her; measure again only when the pointer next needs it.
  const onScroll = () => (stale = true);
  const onPointer = (event: PointerEvent) => {
    // A finger only steers her while it's down on her (the figure lets sideways drags through).
    if (event.pointerType === 'touch' && !figure.contains(event.target as Node)) return;
    if (stale) measure();
    lastPointer = performance.now();
    target = angleFromPointer(event.clientX, rect.left, rect.width);
    const eyes = face.top + face.height * 0.45;
    targetY = clamp((event.clientY - eyes) / (rect.height * 0.5), -1, 1);
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
  wake();

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    resize?.disconnect();
    seen?.disconnect();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('scroll', onScroll);
  };
}
