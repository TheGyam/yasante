import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import type { RefObject } from 'react';
import type { ActionPreview } from '../types';
import * as s from './ActionReview.css';
import { ConfirmDialog } from './ConfirmDialog';
import { DeletionReview } from './DeletionReview';
export function ActionReview({
  confirm,
  preview,
  busy,
  actionError,
  runAction,
}: {
  confirm: RefObject<HTMLDialogElement | null>;
  preview?: ActionPreview;
  busy: boolean;
  actionError: string;
  runAction: (apply?: boolean) => Promise<void>;
}) {
  return (
    <ConfirmDialog ref={confirm} className={s.dialog} aria-labelledby="action-title">
      <div className={s.stack}>
        <Text id="action-title" variant="title2">
          Review your action
        </Text>
        <Text>{preview?.label}</Text>
        <Text tone="secondary">
          This applies to {preview?.count} selected records. Changes take effect when you apply the
          action.
        </Text>
        {preview?.deletion && <DeletionReview deletion={preview.deletion} />}
        {actionError && <InlineAlert message={actionError} />}
        <div className={s.row}>
          <Button
            label="Apply action"
            disabled={busy || (!!preview?.deletion && !preview.deletion.canDelete)}
            loading={busy}
            onClick={() => void runAction(true)}
          />
          <Button label="Cancel" variant="secondary" onClick={() => confirm.current?.close()} />
        </div>
      </div>
    </ConfirmDialog>
  );
}
