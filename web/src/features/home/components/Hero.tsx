import { useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpLeft, Check, Play } from 'lucide-react';
import { useReducedMotion } from '@/shared/theme/useReducedMotion';
import { Link } from '@/shared/ui/Link';
import { describeAngle, startGaze } from '../gaze';
import { AMA, AMA_DEPTH, AVATARS, PROPS } from '../media';
import { turnable } from '../turn';
import * as styles from './Hero.css';

const CARDS = [
  {
    title: 'Find your hair twin',
    body: 'Looks on hair like yours, from 3A to 4C.',
    to: '/looks',
    image: PROPS.coil,
  },
  {
    title: 'Book the stylist who did it',
    body: 'Their prices, their free times, one request.',
    to: '/looks',
    image: PROPS.pick,
  },
  {
    title: 'Keep what works',
    body: 'Your products and routine, in one place.',
    to: '/#waitlist',
    image: PROPS.jar,
  },
];

/** Where her chin and collar are in the painting, and the depth her head turns about (../turn.ts). */
const TURN = { chin: 0.63, collar: 0.77, pivot: 0.5, amount: 0.09 };

/**
 * The landing page's first screen. Ama turns to look wherever the pointer goes (on a phone
 * she looks around by herself until touched); see ../gaze.ts and ../turn.ts. The painting
 * shows at once as a plain image; the turning canvas takes over once it's ready.
 */
export function Hero({ onWatch }: { onWatch: () => void }) {
  const root = useRef<HTMLElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const painting = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const stage = root.current;
    const box = figure.current;
    const art = painting.current;
    const surface = canvas.current;
    if (!stage || !box || !art || !surface) return;
    let stop = () => {};
    let cancelled = false;
    const depth = new Image();
    depth.src = AMA_DEPTH;
    // A lost GPU context leaves the still painting showing.
    const lost = () => delete box.dataset.live;
    surface.addEventListener('webglcontextlost', lost);
    // (inside a then, so a browser without decode() just keeps the still painting)
    Promise.resolve()
      .then(() => Promise.all([art.decode(), depth.decode()]))
      .then(() => {
        if (cancelled) return;
        const draw = turnable(surface, art, depth, TURN);
        if (!draw) return;
        draw({ turn: 0, nod: 0 });
        box.dataset.live = '';
        stop = startGaze({
          root: stage,
          figure: box,
          pose: draw,
          reducedMotion: reduced,
          onAngle: angle => {
            if (readout.current) readout.current.textContent = describeAngle(angle);
          },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stop();
      surface.removeEventListener('webglcontextlost', lost);
    };
  }, [reduced]);

  return (
    <section ref={root} className={styles.stage} aria-labelledby="hero-title">
      <div ref={figure} className={styles.figure}>
        <img
          ref={painting}
          src={AMA}
          alt=""
          width={1400}
          height={1400}
          decoding="async"
          fetchPriority="high"
        />
        <canvas ref={canvas} aria-hidden />
      </div>

      <span className={styles.eye} aria-hidden>
        <span className={styles.pupil} />
      </span>

      <div className={styles.copy}>
        <p className={styles.kicker}>
          <span className={styles.tick}>
            <Check size={12} strokeWidth={3} aria-hidden />
          </span>
          Every look, on hair like yours
        </p>
        <h1 id="hero-title" className={styles.title}>
          Find it.
          <br />
          Book it.
          <br />
          <span className={styles.silk}>Wear it.</span>
        </h1>
        <p className={styles.lede}>
          Meet Ama: two braids, a middle part, and opinions about your edges.{' '}
          <span className={styles.hoverOnly}>Move your cursor: she’s watching.</span>
          <span className={styles.touchOnly}>Drag across her: she’ll follow.</span> Yasante shows
          you styles on hair like yours, the stylist who did them, and what they used.
        </p>

        <div className={styles.foot}>
          <div className={styles.actions}>
            <a className={styles.primary} href="#waitlist">
              Join the waitlist
              <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
            </a>
            <button type="button" className={styles.watch} onClick={onWatch}>
              <span className={styles.play}>
                <Play size={16} strokeWidth={2.6} fill="currentColor" aria-hidden />
              </span>
              <span className={styles.watchLabel}>
                Watch
                <br />
                the film
              </span>
            </button>
          </div>
          <p className={styles.readout} aria-hidden>
            <span className={styles.dot} />
            Gaze
            <span className={styles.track}>
              <span className={styles.knob} />
            </span>
            <span ref={readout} className={styles.value}>
              ahead
            </span>
          </p>
        </div>
      </div>

      <div className={styles.badge} aria-hidden>
        <svg viewBox="0 0 120 120" className={styles.ring}>
          <defs>
            <path id="hero-badge-path" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
          </defs>
          <text className={styles.ringText}>
            <textPath href="#hero-badge-path">Move your cursor · She’s looking too ·</textPath>
          </text>
        </svg>
        <span className={styles.arrow}>
          <ArrowUpLeft size={18} strokeWidth={2} />
        </span>
      </div>

      <div className={styles.crowd}>
        <ul className={styles.avatars} aria-hidden>
          {AVATARS.map(src => (
            <li key={src}>
              <img src={src} alt="" width={44} height={44} loading="lazy" decoding="async" />
            </li>
          ))}
          <li className={styles.you}>+you</li>
        </ul>
        <p className={styles.crowdTitle}>Every texture, every look</p>
        <p className={styles.crowdBody}>3A to 4C, and everything between</p>
      </div>

      <ul className={styles.cards}>
        {CARDS.map(card => (
          <li key={card.title} className={styles.card}>
            <img
              className={styles.prop}
              src={card.image}
              alt=""
              width={240}
              height={240}
              loading="lazy"
              decoding="async"
            />
            <h2 className={styles.cardTitle}>{card.title}</h2>
            <p className={styles.cardBody}>{card.body}</p>
            <Link to={card.to} className={styles.go} aria-label={`${card.title}: go`}>
              Go
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
