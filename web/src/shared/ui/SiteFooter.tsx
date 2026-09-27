import { Link } from './Link';
import { Text } from './Text';
import * as styles from './SiteFooter.css';

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
        {/* Where to reach a person: the stores ask for it, and so do people. */}
        <a href="mailto:admin@yasante.com">Contact us</a>
        <Link to="/delete-account">Delete your account</Link>
      </nav>
    </footer>
  );
}
