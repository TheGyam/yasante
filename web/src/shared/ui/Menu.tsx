import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from './Link';
import { Popover, type PopoverProps } from './Popover';
import * as s from './Menu.css';

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  /** A page in this app. */
  to?: string;
  /** A file to download. */
  href?: string;
  disabled?: boolean;
  danger?: boolean;
  hint?: ReactNode;
}

/** A button that opens a list of actions, navigable with the arrow keys. */
export function Menu({
  items,
  ...trigger
}: Omit<PopoverProps, 'children' | 'role'> & { items: (MenuItem | 'separator')[] }) {
  return (
    <Popover {...trigger} role="menu">
      <div className={s.items}>
        {items.map((item, index) => {
          if (item === 'separator') return <hr key={index} className={s.separator} />;
          const Icon = item.icon;
          const content = (
            <>
              {Icon && <Icon size={16} aria-hidden />}
              <span className={s.label}>{item.label}</span>
              {item.hint && <span className={s.hint}>{item.hint}</span>}
            </>
          );
          const className = `${s.item} ${item.danger ? s.danger : ''}`;
          if (item.to)
            return (
              <Link key={index} to={item.to} className={className} role="menuitem">
                {content}
              </Link>
            );
          if (item.href)
            return (
              <a key={index} href={item.href} className={className} role="menuitem" download>
                {content}
              </a>
            );
          return (
            <button
              key={index}
              type="button"
              className={className}
              role="menuitem"
              disabled={item.disabled}
              onClick={item.onSelect}
            >
              {content}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
