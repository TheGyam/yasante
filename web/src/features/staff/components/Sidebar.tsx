import { BrandMark } from '@/shared/ui/BrandMark';
import { Button } from '@/shared/ui/Button';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import {
  BookOpen,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { useRef } from 'react';
import { useLocation } from 'react-router';
import type { Overview } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import * as s from './Sidebar.css';

export function Sidebar({ data }: { data: Overview }) {
  const sheet = useRef<HTMLDialogElement>(null),
    location = useLocation();
  const quick = [
    { key: 'accounts.user', label: 'People', icon: Users },
    { key: 'stylists.stylistprofile', label: 'Stylists', icon: Sparkles },
    { key: 'bookings.booking', label: 'Bookings', icon: BookOpen },
    { key: 'looks.report', label: 'Community reports', icon: ShieldCheck },
  ];
  const groups = [...new Set(data.models.map(item => item.group))];
  const links = (
    <div className={s.stack}>
      <span className={s.eyebrow}>Master workspace</span>
      <nav className={s.nav} aria-label="Staff workspace">
        {[
          { url: '/', name: 'Overview', key: 'overview' },
          { url: '/tools', name: 'All tools', key: 'tools' },
          ...quick.flatMap(item => {
            const resource = data.models.find(model => model.key === item.key);
            return resource ? [{ ...resource, name: item.label }] : [];
          }),
          ...(data.user.superuser
            ? [{ url: '/metrics', name: 'Business metrics', key: 'metrics' }]
            : []),
          { url: '/password', name: 'Password settings', key: 'password' },
        ].map(item => (
          <Link
            key={item.key}
            to={item.url}
            className={s.navLink}
            aria-current={location.pathname === item.url ? 'page' : undefined}
            onClick={() => sheet.current?.close()}
          >
            {item.key === 'overview' && <LayoutDashboard size={18} aria-hidden />}
            {item.key === 'tools' && <SlidersHorizontal size={18} aria-hidden />}
            {quick.map(
              ({ key, icon: Icon }) => key === item.key && <Icon key={key} size={18} aria-hidden />
            )}
            {item.name}
          </Link>
        ))}
      </nav>
      <details className={s.resourceMenu}>
        <summary>Browse by area</summary>
        {groups.map(group => (
          <div key={group}>
            <Text variant="overline" tone="secondary">
              {group}
            </Text>
            {data.models
              .filter(item => item.group === group)
              .map(item => (
                <Link
                  key={item.key}
                  to={item.url}
                  className={s.navLink}
                  onClick={() => sheet.current?.close()}
                >
                  {item.name}
                </Link>
              ))}
          </div>
        ))}
      </details>
      <div className={`${s.card} ${s.stack}`}>
        <ShieldCheck size={20} aria-hidden />
        <Text variant="callout">{data.user.superuser ? 'Full administrator' : 'Staff access'}</Text>
        <Text variant="caption" tone="secondary">
          Tools follow your account permissions.
        </Text>
      </div>
    </div>
  );
  return (
    <aside className={s.sidebar}>
      <Link to="/">
        <BrandMark />
      </Link>
      <Button
        label="Menu"
        variant="ghost"
        className={s.menuToggle}
        onClick={() => sheet.current?.showModal()}
      />
      <div className={s.sidebarBody}>{links}</div>
      <ConfirmDialog ref={sheet} title="Workspace navigation" className={s.sheet}>
        {links}
        <Button label="Close menu" onClick={() => sheet.current?.close()} />
      </ConfirmDialog>
    </aside>
  );
}
