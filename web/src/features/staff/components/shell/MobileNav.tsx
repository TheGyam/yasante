import { Inbox, LayoutDashboard, Menu as MenuIcon, Search } from 'lucide-react';
import { Link } from '@/shared/ui/Link';
import * as ui from '../ui.css';
import * as s from './MobileNav.css';

/** On phones: the four places people go, always under their thumb. */
export function MobileNav({
  pathname,
  reviewUrl,
  waiting,
  onSearch,
  onMore,
}: {
  pathname: string;
  reviewUrl: string;
  waiting: number;
  onSearch: () => void;
  onMore: () => void;
}) {
  return (
    <nav className={s.bar} aria-label="Main">
      <Link to="/" className={s.tab} aria-current={pathname === '/' ? 'page' : undefined}>
        <LayoutDashboard size={22} aria-hidden />
        Today
      </Link>
      <Link
        to={reviewUrl}
        className={s.tab}
        aria-current={pathname.startsWith('/review') ? 'page' : undefined}
      >
        <span className={s.iconWrap}>
          <Inbox size={22} aria-hidden />
          {waiting > 0 && (
            <span className={`${ui.count} ${ui.urgent} ${s.badge}`}>
              {waiting > 99 ? '99+' : waiting}
            </span>
          )}
        </span>
        Review
      </Link>
      <button type="button" className={s.tab} onClick={onSearch}>
        <Search size={22} aria-hidden />
        Search
      </button>
      <button type="button" className={s.tab} onClick={onMore}>
        <MenuIcon size={22} aria-hidden />
        More
      </button>
    </nav>
  );
}
