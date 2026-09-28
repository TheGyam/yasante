import * as styles from './BrandMark.css';

/** The app icon's "y", traced from the app's icon (1024 × 1024), so every mark matches it. */
const ICON_Y = 'M310 245H430L512 478L597 245H716L486 776H375L451 607Z';

/** The app's mark: its icon, and the name. */
export function BrandMark() {
  return (
    <span className={styles.mark}>
      <svg className={styles.tile} viewBox="0 0 1024 1024" aria-hidden>
        <rect width="1024" height="1024" rx="230" fill="#0B0709" />
        <path d={ICON_Y} fill="#FF8FB8" />
      </svg>
      <span className={styles.word}>yasante</span>
    </span>
  );
}
