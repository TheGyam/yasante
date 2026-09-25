import { BrandMark } from './BrandMark';
import { Button } from './Button';
import { Glass } from './Glass';
import { Link, NavLink } from './Link';
import styles from './SiteHeader.module.css';

export interface SiteHeaderProps {
  links: { label: string; to: string; preload?: () => void }[];
  /** Where "Get the app" goes. */
  appTo: string;
}

export function SiteHeader({ links, appTo }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Glass variant="chrome" radius="none" className={styles.glass} />
      <div className={styles.row}>
        <Link to="/" aria-label="Yasante, home">
          <BrandMark />
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {links.map(link => (
            <NavLink key={link.to} to={link.to} className={styles.link} preload={link.preload}>
              {link.label}
            </NavLink>
          ))}
          <span className={styles.wide}>
            <Button label="Get the app" size="sm" to={appTo} />
          </span>
        </nav>
      </div>
    </header>
  );
}
