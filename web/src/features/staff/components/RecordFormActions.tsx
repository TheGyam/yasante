import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { Save, Trash2 } from 'lucide-react';
import type { FormSchema } from '../types';
import * as s from './RecordFormActions.css';

export function RecordFormActions({
  schema,
  id,
  busy,
  onClose,
  onDelete,
}: {
  schema: FormSchema;
  id?: string;
  busy: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className={s.editorActions}>
      {schema.editable ? (
        <Button label="Save changes" icon={Save} type="submit" loading={busy} />
      ) : (
        <Text variant="callout">View-only access</Text>
      )}
      <details className={s.actionsMenu}>
        <summary className={s.button}>More actions</summary>
        <div className={s.actionOptions}>
          {schema.editable && (
            <>
              <Button
                label="Save and continue"
                type="submit"
                name="_continue"
                disabled={busy}
                variant="ghost"
                size="sm"
              />
              {!id && (
                <Button
                  label="Save and add another"
                  type="submit"
                  name="_addanother"
                  disabled={busy}
                  variant="ghost"
                  size="sm"
                />
              )}
              {schema.canSaveAs && (
                <Button
                  label="Save as new"
                  type="submit"
                  name="_saveasnew"
                  disabled={busy}
                  variant="ghost"
                  size="sm"
                />
              )}
            </>
          )}
          <Button label="Close" disabled={busy} onClick={onClose} variant="ghost" size="sm" />
          {schema.canDelete && (
            <Button
              label="Delete record"
              icon={Trash2}
              disabled={busy}
              onClick={() => void onDelete()}
              variant="ghost"
              size="sm"
            />
          )}
        </div>
      </details>
    </div>
  );
}
