import { Link } from './Link';
import { Text } from './Text';
import styles from './SiteFooter.module.css';

export interface SiteFooterProps {
  links: { label: string; to: string }[];
}

export function SiteFooter({ links }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <Text variant="footnote" tone="tertiary">
        © {new Date().getFullYear()} Yasante
      </Text>
      <nav className={styles.links} aria-label="Policies">
        {links.map(link => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
