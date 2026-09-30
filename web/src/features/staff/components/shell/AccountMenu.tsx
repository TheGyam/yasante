import { Check, Keyboard, KeyRound, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { Menu } from '@/shared/ui/Menu';
import type { Overview } from '../../types';
import * as s from './AccountMenu.css';

export type ThemeChoice = 'system' | 'light' | 'dark';

/** Who's signed in, and everything about their own account, in one menu. */
export function AccountMenu({
  user,
  rail,
  theme,
  onTheme,
  onShortcuts,
  onSignOut,
}: {
  user: Overview['user'];
  rail?: boolean;
  theme: ThemeChoice;
  onTheme: (theme: ThemeChoice) => void;
  onShortcuts: () => void;
  onSignOut: () => void;
}) {
  const initials = user.name
    .split(/\s+/)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const mark = (value: ThemeChoice) =>
    theme === value ? <Check size={14} aria-label="Current" /> : undefined;
  return (
    <div className={s.account} data-rail={rail}>
      <span className={s.avatar} aria-hidden>
        {user.avatar ? <img src={user.avatar} alt="" className={s.photo} /> : initials}
      </span>
      {!rail && (
        <span className={s.who}>
          <span className={s.name}>{user.name}</span>
          <span className={s.role}>{user.superuser ? 'Administrator' : 'Staff'}</span>
        </span>
      )}
      <Menu
        label="Account and settings"
        iconOnly
        icon={Settings}
        align="end"
        items={[
          { label: 'Password and two-factor', icon: KeyRound, to: '/account' },
          'separator',
          {
            label: 'Match my device',
            icon: Monitor,
            onSelect: () => onTheme('system'),
            hint: mark('system'),
          },
          { label: 'Light', icon: Sun, onSelect: () => onTheme('light'), hint: mark('light') },
          { label: 'Dark', icon: Moon, onSelect: () => onTheme('dark'), hint: mark('dark') },
          'separator',
          { label: 'Keyboard shortcuts', icon: Keyboard, onSelect: onShortcuts, hint: '?' },
          { label: 'Sign out', icon: LogOut, onSelect: onSignOut, danger: true },
        ]}
      />
    </div>
  );
}
