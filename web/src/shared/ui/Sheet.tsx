import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import * as s from './Sheet.css';
export function Sheet({
  open,
  onClose,
  title,
  children,
  centered = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  centered?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const start = useRef<number | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`${s.sheet} ${centered ? s.centered : ''}`}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={s.inner}>
        <div
          className={s.handle}
          onPointerDown={event => {
            start.current = event.clientY;
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerUp={event => {
            if (start.current !== null && event.clientY - start.current > 70) onClose();
            start.current = null;
          }}
        />
        <div className={s.close}>
          <Button
            label={<X size={18} />}
            aria-label="Close panel"
            title="Close panel (Esc)"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>
        {children}
      </div>
    </dialog>
  );
}
