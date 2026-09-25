import { useEffect, type ReactNode } from 'react';
import styles from './Page.module.css';

export interface PageProps {
  /** The tab's title, before " · Yasante". Leave out for the home page. */
  title?: string;
  /** What search engines and link previews say about the page. */
  description?: string;
  /** A narrow column for long text. */
  width?: 'content' | 'reading';
  children: ReactNode;
}

const SITE = 'Yasante';
const DEFAULT_DESCRIPTION =
  'Find a braider whose work you’ve seen on hair like yours, and book them.';

/**
 * Every page is a <Page>. It owns the width, the gutters and the title. The server
 * sends the right title and description with the first load (for search and link
 * previews); this keeps them right as people move around the site.
 */
export function Page({ title, description, width = 'content', children }: PageProps) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description ?? DEFAULT_DESCRIPTION);
  }, [title, description]);

  return (
    <div className={`${styles.page} ${width === 'reading' ? styles.reading : ''}`}>{children}</div>
  );
}
