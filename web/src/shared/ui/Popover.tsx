import { useId, useRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, type ButtonVariant } from './Button';
import * as s from './Popover.css';

export interface PopoverProps {
  /** The trigger's text; with `iconOnly`, its accessible name. */
  label: string;
  icon?: LucideIcon;
  iconOnly?: boolean;
  variant?: ButtonVariant;
  role?: 'menu' | 'dialog';
  align?: 'start' | 'end';
  /** Extra content inside the trigger, after the label (a count, a chevron). */
  badge?: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
}

const GAP = 6;
const EDGE = 12;

/**
 * A button that opens a panel beside it: the browser's Popover API handles light
 * dismiss, Escape and the top layer; this only places the panel, flipping it when it
 * would leave the screen. Menus get arrow-key navigation.
 */
export function Popover({
  label,
  icon,
  iconOnly,
  variant = 'ghost',
  role = 'dialog',
  align = 'start',
  badge,
  children,
}: PopoverProps) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = () => document.getElementById(id)?.hidePopover();

  const place = () => {
    const trigger = anchor.current?.getBoundingClientRect();
    const box = panel.current;
    if (!trigger || !box) return;
    const { width, height } = box.getBoundingClientRect();
    const below = trigger.bottom + GAP + height <= window.innerHeight - EDGE;
    const top = below ? trigger.bottom + GAP : Math.max(EDGE, trigger.top - GAP - height);
    const preferred = align === 'end' ? trigger.right - width : trigger.left;
    const left = Math.min(Math.max(EDGE, preferred), window.innerWidth - width - EDGE);
    box.style.top = `${top}px`;
    box.style.left = `${left}px`;
  };

  return (
    <span className={s.anchor} ref={anchor}>
      <Button
        label={iconOnly ? '' : label}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        icon={icon}
        size="sm"
        variant={variant}
        popoverTarget={id}
        aria-haspopup={role}
        className={iconOnly ? s.iconOnly : undefined}
        trailing={badge}
        onKeyDown={event => {
          if (event.key !== 'ArrowDown' || role !== 'menu') return;
          event.preventDefault();
          panel.current?.showPopover();
          panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        }}
      />
      <div
        id={id}
        ref={panel}
        popover="auto"
        role={role}
        aria-label={label}
        className={s.panel}
        onToggle={event => {
          if ((event as unknown as ToggleEvent).newState === 'open') {
            place();
            if (role === 'dialog')
              panel.current?.querySelector<HTMLElement>('input, button, a, select')?.focus();
          }
        }}
        onKeyDown={event => {
          if (role !== 'menu' || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
            return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
          );
          if (!items.length) return;
          event.preventDefault();
          const index = items.indexOf(document.activeElement as HTMLElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }}
        onClick={event => {
          if (role === 'menu' && (event.target as HTMLElement).closest('[role="menuitem"]'))
            close();
        }}
      >
        {typeof children === 'function' ? children(close) : children}
      </div>
    </span>
  );
}
