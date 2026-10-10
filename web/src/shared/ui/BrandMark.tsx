import icon from './app-icon.png';
import * as styles from './BrandMark.css';

/** The app's mark: its icon, and the name. */
export function BrandMark() {
  return (
    <span className={styles.mark}>
      <img className={styles.tile} src={icon} alt="" width={34} height={34} />
      <span className={styles.word}>yasante</span>
    </span>
  );
}
