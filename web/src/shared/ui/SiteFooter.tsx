import { Link } from './Link';
import { Text } from './Text';
import * as styles from './SiteFooter.css';

export interface SiteFooterProps {
  links: { label: string; to: string }[];
}

export function SiteFooter({ links }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <div>
        <Text variant="footnote" tone="tertiary">
          © {new Date().getFullYear()} Yasante
        </Text>
        <nav className={styles.socials} aria-label="Yasante on social media">
          <a
            className={styles.socialLink}
            href="https://www.instagram.com/yasantebeauty/"
            aria-label="Yasante on Instagram"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            className={styles.socialLink}
            href="https://www.tiktok.com/@yasante_beauty"
            aria-label="Yasante on TikTok"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.895 2.895 0 0 1-5.2 1.743 2.895 2.895 0 0 1 2.31-4.64c.298 0 .595.046.88.137v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.849-4.432V8.686a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
            </svg>
          </a>
        </nav>
      </div>
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
