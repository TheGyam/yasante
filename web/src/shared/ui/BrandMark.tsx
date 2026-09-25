import styles from './BrandMark.module.css';

/** The app's mark: a Y on an accent tile, and the name. */
export function BrandMark() {
  return (
    <span className={styles.mark}>
      <span className={styles.tile} aria-hidden>
        Y
      </span>
      <span className={styles.word}>yasante</span>
    </span>
  );
}
