import { useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpLeft, Check, Play } from 'lucide-react';
import { useReducedMotion } from '@/shared/theme/useReducedMotion';
import { Link } from '@/shared/ui/Link';
import { describeAngle, startGaze } from '../gaze';
import { AVATARS, FRAMES_LARGE, FRAMES_SMALL, PROPS } from '../media';
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

const CENTRE = Math.floor((FRAMES_LARGE.length - 1) / 2);

/**
 * The landing page's first screen. Bobbi, the bust in the bob, turns to look wherever the
 * pointer goes (on a phone she looks around by herself until touched); see ../gaze.ts.
 */
export function Hero({ onWatch }: { onWatch: () => void }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const stage = root.current;
    const surface = canvas.current;
    if (!stage || !surface) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const big = surface.getBoundingClientRect().width * dpr > 720;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    return startGaze({
      canvas: surface,
      root: stage,
      frames: big ? FRAMES_LARGE : FRAMES_SMALL,
      reducedMotion: reduced,
      light: !!connection?.saveData,
      onAngle: angle => {
        if (readout.current) readout.current.textContent = describeAngle(angle);
      },
    });
  }, [reduced]);

  return (
    <section ref={root} className={styles.stage} aria-labelledby="hero-title">
      <div className={styles.figure}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden />
        <img
          className={styles.poster}
          src={FRAMES_SMALL[CENTRE]}
          srcSet={`${FRAMES_SMALL[CENTRE]} 640w, ${FRAMES_LARGE[CENTRE]} 1200w`}
          sizes="(min-width: 960px) 62vw, 100vw"
          width={1200}
          height={1200}
          alt="A mannequin in a sleek black bob with a blunt fringe, wearing a berry turtleneck"
          fetchPriority="high"
        />
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
          Meet Bobbi, a silk-press bob with somewhere to be.{' '}
          <span className={styles.hoverOnly}>Move your cursor: she’s looking too.</span>
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
