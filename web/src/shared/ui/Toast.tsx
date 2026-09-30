import { useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import * as s from './Toast.css';

interface Notice {
  id: number;
  message: string;
  tone: 'neutral' | 'danger';
  action?: { label: string; run: () => unknown };
}

let notices: Notice[] = [];
let next = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const remove = (id: number) => {
  notices = notices.filter(item => item.id !== id);
  emit();
};

/**
 * A short message at the bottom of the screen, gone after 8 seconds. With an action
 * (Undo), the action runs once and the message goes.
 */
export function toast(
  message: string,
  options: { action?: Notice['action']; tone?: Notice['tone'] } = {}
) {
  const id = ++next;
  notices = [
    ...notices.slice(-2),
    { id, message, tone: options.tone ?? 'neutral', action: options.action },
  ];
  emit();
  setTimeout(() => remove(id), 8000);
}

/** Where toasts appear. Render once, at the root. */
export function Toaster() {
  const values = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => notices
  );
  return (
    <div className={s.region} aria-live="polite">
      {values.map(item => (
        <div className={`${s.notice} ${item.tone === 'danger' ? s.danger : ''}`} key={item.id}>
          <span className={s.message}>{item.message}</span>
          {item.action && (
            <button
              type="button"
              className={s.action}
              onClick={() => {
                remove(item.id);
                void Promise.resolve()
                  .then(item.action!.run)
                  .catch(() => toast('That didn’t finish. Refresh to check.', { tone: 'danger' }));
              }}
            >
              {item.action.label}
            </button>
          )}
          <button
            type="button"
            className={s.dismiss}
            aria-label="Dismiss"
            onClick={() => remove(item.id)}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
