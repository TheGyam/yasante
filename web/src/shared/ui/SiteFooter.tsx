import { Link } from './Link';
import { SocialIcon } from './SocialIcon';
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
            target="_blank"
            rel="noopener noreferrer"
          >
            <SocialIcon platform="instagram" />
          </a>
          <a
            className={styles.socialLink}
            href="https://www.tiktok.com/@yasante_beauty"
            aria-label="Yasante on TikTok"
            target="_blank"
            rel="noopener noreferrer"
          >
            <SocialIcon platform="tiktok" />
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
        <a href="mailto:support@yasante.com">Contact us</a>
        <Link to="/delete-account">Delete your account</Link>
      </nav>
    </footer>
  );
}
