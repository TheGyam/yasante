import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { Button } from './Button';
import { Glass } from './Glass';
import { Link, NavLink } from './Link';
import * as styles from './SiteHeader.css';

export interface SiteHeaderProps {
  links: { label: string; to: string; preload?: () => void }[];
  /** Where "Get the app" goes. */
  appTo: string;
  /** Float over the page's first screen (the home page's hero) instead of above it. */
  overlay?: boolean;
  /** Beside "Get the app": a way to sign out, when someone is signed in. */
  account?: ReactNode;
}

export function SiteHeader({ links, appTo, overlay = false, account }: SiteHeaderProps) {
  return (
    <header className={overlay ? styles.overlay : styles.header}>
      <Glass variant="chrome" radius="none" className={styles.glass} />
      <div className={styles.row}>
        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/" end className={`${styles.pill} ${styles.wide}`}>
            Home
          </NavLink>
          {links.map(link => (
            <NavLink key={link.to} to={link.to} className={styles.pill} preload={link.preload}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" aria-label="Yasante, home" className={styles.brand}>
          <BrandMark />
        </Link>
        <span className={`${styles.end} ${styles.wide}`}>
          {account}
          <Button label="Get the app" size="sm" to={appTo} />
        </span>
      </div>
    </header>
  );
}
