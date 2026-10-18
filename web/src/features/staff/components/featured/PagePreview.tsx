import type { FeaturedDetail } from '../../types';
import * as s from './Featured.css';

/**
 * Her page as a client sees it on a phone, from what staff have added so far, so
 * every change shows where it lands. Drawn here rather than framed from the site: the
 * staff site never loads the public one.
 */
export function PagePreview({ page }: { page: FeaturedDetail }) {
  const covers = page.looks
    .map(look => look.photos[0])
    .filter(Boolean)
    .slice(0, 9);
  return (
    <figure className={s.phone} aria-label="Their page, as clients see it">
      <div className={s.phoneHead}>
        <span className={s.phoneAvatar} aria-hidden>
          {page.avatar_uri ? (
            <img className={s.phoneImage} src={page.avatar_uri} alt="" />
          ) : (
            page.display_name.trim().charAt(0).toUpperCase()
          )}
        </span>
        <span className={s.phoneName}>
          {page.display_name}
          {!page.claimed_at && <span className={s.phoneBadge}>Featured</span>}
        </span>
        <span className={s.phoneMuted}>@{page.handle}</span>
        {!page.claimed_at && (
          <span className={s.phoneMuted}>Not taking bookings on Yasante yet</span>
        )}
      </div>
      <span className={s.phoneButton}>Book on Instagram</span>
      <span className={`${s.phoneButton} ${s.phoneButtonQuiet}`}>Join the waitlist</span>
      <div className={s.phoneGrid}>
        {covers.length
          ? covers.map(photo => (
              <span key={photo.uri} className={s.phoneTile}>
                <img className={s.phoneImage} src={photo.thumb_uri || photo.uri} alt="" />
              </span>
            ))
          : [0, 1, 2].map(i => <span key={i} className={s.phoneTile} />)}
      </div>
    </figure>
  );
}
