import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { useEffect, useRef, useState } from 'react';
import type { Resource } from '../types';
import * as s from './CommandPalette.css';
import { ConfirmDialog } from './ConfirmDialog';

export function CommandPalette({ models }: { models: Resource[] }) {
  const dialog = useRef<HTMLDialogElement>(null),
    [term, setTerm] = useState('');
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        dialog.current?.showModal();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  return (
    <>
      <Button
        label="Find anything · Ctrl/Cmd+K"
        variant="ghost"
        size="sm"
        onClick={() => dialog.current?.showModal()}
      />
      <ConfirmDialog ref={dialog} title="Find a tool">
        <Input label="Search tools" value={term} onChange={event => setTerm(event.target.value)} />
        <div className={s.choiceList}>
          {models
            .filter(item => `${item.name} ${item.group}`.toLowerCase().includes(term.toLowerCase()))
            .map(item => (
              <Link
                className={s.navLink}
                key={item.key}
                to={item.url}
                onClick={() => dialog.current?.close()}
              >
                {item.name} · {item.group}
              </Link>
            ))}
        </div>
        <Button label="Close" onClick={() => dialog.current?.close()} />
      </ConfirmDialog>
    </>
  );
}
