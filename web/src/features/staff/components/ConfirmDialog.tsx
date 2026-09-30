import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { useEffect, useRef, type DialogHTMLAttributes, type ReactNode, type Ref } from 'react';
import * as s from './ConfirmDialog.css';

export function ConfirmDialog({
  open,
  title,
  onConfirm,
  onClose,
  children,
  className,
  ref,
  ...props
}: Omit<DialogHTMLAttributes<HTMLDialogElement>, 'onClose' | 'title'> & {
  title?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  children?: ReactNode;
  ref?: Ref<HTMLDialogElement>;
}) {
  const local = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !local.current?.open) local.current?.showModal();
    if (open === false && local.current?.open) local.current?.close();
  }, [open]);
  return (
    <dialog
      {...props}
      className={`${s.dialog} ${className ?? ''}`}
      ref={node => {
        local.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      onCancel={event => {
        event.preventDefault();
        if (onClose) onClose();
        else local.current?.close();
      }}
      onClose={onClose}
      aria-label={title}
    >
      {title && <Text variant="title2">{title}</Text>}
      {children}
      {onConfirm && (
        <div className={s.row}>
          <Button label="Discard changes" onClick={onConfirm} />
          <Button label="Keep editing" variant="secondary" onClick={onClose} />
        </div>
      )}
    </dialog>
  );
}
