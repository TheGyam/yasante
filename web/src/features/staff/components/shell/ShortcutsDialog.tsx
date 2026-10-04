import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Kbd } from '@/shared/ui/Kbd';
import { Text } from '@/shared/ui/Text';
import * as s from './ShortcutsDialog.css';

const GROUPS: { name: string; keys: [string[], string][] }[] = [
  {
    name: 'Anywhere',
    keys: [
      [['⌘', 'K'], 'Search everything'],
      [['/'], 'Search everything'],
      [['g', 'o'], 'Go to Today'],
      [['g', 'r'], 'Go to Review'],
      [['g', 'p'], 'Go to People'],
      [['g', 'b'], 'Go to Bookings'],
      [['g', 'i'], 'Go to Insights'],
      [['['], 'Collapse or expand the sidebar'],
      [['?'], 'Show these shortcuts'],
    ],
  },
  {
    name: 'Lists and queues',
    keys: [
      [['j'], 'Next'],
      [['k'], 'Previous'],
      [['Enter'], 'Open'],
      [['x'], 'Select'],
      [['←', '→'], 'Previous or next page'],
    ],
  },
  {
    name: 'A record',
    keys: [
      [['e'], 'Edit'],
      [['⌘', 'S'], 'Save'],
      [['Esc'], 'Close the panel'],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={event => event.target === event.currentTarget && onClose()}
    >
      <div className={s.head}>
        <Text variant="title3" id="shortcuts-title">
          Keyboard shortcuts
        </Text>
        <button type="button" className={s.close} aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className={s.groups}>
        {GROUPS.map(group => (
          <section key={group.name} className={s.group}>
            <Text variant="overline" tone="tertiary">
              {group.name}
            </Text>
            {group.keys.map(([keys, what]) => (
              <div key={what + keys.join()} className={s.line}>
                <span>{what}</span>
                <span className={s.keys}>
                  {keys.map(key => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </dialog>
  );
}
