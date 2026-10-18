import { ArrowUpRight, Globe } from 'lucide-react';
import { Glass } from '@/shared/ui/Glass';
import { Page } from '@/shared/ui/Page';
import { SocialIcon } from '@/shared/ui/SocialIcon';
import { Text } from '@/shared/ui/Text';
import icon from '@/shared/ui/app-icon.png';
import * as styles from './LinksScreen.css';

const LINKS = [
  {
    label: 'Visit our website',
    detail: 'yasante.com',
    href: 'https://yasante.com',
    icon: <Globe size={20} aria-hidden />,
  },
  {
    label: 'Instagram',
    detail: '@yasantebeauty',
    href: 'https://www.instagram.com/yasantebeauty/',
    icon: <SocialIcon platform="instagram" />,
    external: true,
  },
  {
    label: 'TikTok',
    detail: '@yasante_beauty',
    href: 'https://www.tiktok.com/@yasante_beauty',
    icon: <SocialIcon platform="tiktok" />,
    external: true,
  },
];

export function LinksScreen() {
  return (
    <main className={styles.screen}>
      <Page
        title="Our links"
        description="Find Yasante on Instagram and TikTok, or explore our website. Everything for your hair, in one place."
      >
        <div className={styles.content}>
          <header className={styles.header}>
            <img src={icon} alt="" width={80} height={80} className={styles.logo} />
            <Text variant="title1" as="h1">
              yasante
            </Text>
            <Text variant="body" tone="secondary" className={styles.tagline}>
              Everything for your hair, in one place.
            </Text>
          </header>
          <nav className={styles.links} aria-label="Find Yasante">
            {LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={styles.link}
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <Glass className={styles.card}>
                  <span className={styles.icon}>{link.icon}</span>
                  <span className={styles.label}>
                    <Text variant="bodyStrong" as="span">
                      {link.label}
                    </Text>
                    <Text variant="footnote" tone="secondary">
                      {link.detail}
                    </Text>
                  </span>
                  <ArrowUpRight size={18} aria-hidden className={styles.arrow} />
                </Glass>
              </a>
            ))}
          </nav>
          <Text variant="footnote" tone="tertiary" as="p" className={styles.copyright}>
            © {new Date().getFullYear()} Yasante
          </Text>
        </div>
      </Page>
    </main>
  );
}
