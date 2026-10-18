import { useEffect, type ReactNode } from 'react';
import * as styles from './Page.css';

export interface PageProps {
  /** The tab's title, before " · Yasante". Leave out for the home page. */
  title?: string;
  /** What search engines and link previews say about the page. */
  description?: string;
  /** A narrow column for long text. */
  width?: 'content' | 'reading';
  /** Keep search engines from indexing private or draft pages. */
  noIndex?: boolean;
  children: ReactNode;
}

const SITE = 'Yasante';
const DEFAULT_DESCRIPTION =
  'Discover styles on real textured hair, get to know your own, keep track of what works, and book stylists by their work.';

/**
 * Every page is a <Page>. It owns the width, the gutters and the title. The server
 * sends the right title and description with the first load (for search and link
 * previews); this keeps them right as people move around the site.
 */
export function Page({ title, description, width = 'content', noIndex, children }: PageProps) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description ?? DEFAULT_DESCRIPTION);
  }, [title, description]);

  // The server picks each page's robots tag. A page that mustn't be indexed (a draft,
  // a private link) says so here too, and puts the server's tag back when it goes.
  useEffect(() => {
    if (!noIndex) return;
    const added = !document.querySelector('meta[name="robots"]');
    const robots = document.querySelector('meta[name="robots"]') ?? document.createElement('meta');
    const before = robots.getAttribute('content');
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex');
    if (added) document.head.appendChild(robots);
    return () => {
      if (added) robots.remove();
      else if (before !== null) robots.setAttribute('content', before);
    };
  }, [noIndex]);

  return (
    <div className={`${styles.page} ${width === 'reading' ? styles.reading : ''}`}>{children}</div>
  );
}
