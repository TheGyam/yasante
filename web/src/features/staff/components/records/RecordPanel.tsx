import { useEffect, useState } from 'react';
import { Expand, KeyRound, MoreHorizontal, ShieldOff } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Menu } from '@/shared/ui/Menu';
import { Sheet } from '@/shared/ui/Sheet';
import { Tabs } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { staffMessage, useRecordForm, useStaffMutation } from '../../hooks';
import { rememberRecord } from '../../recent';
import { ConfirmDialog } from '../ConfirmDialog';
import { RecordForm } from '../RecordForm';
import { RecordHistory } from '../RecordHistory';
import { RelatedList } from './RelatedList';
import * as s from './RecordPanel.css';

/**
 * A record over its list, so the list keeps its place: details, what's related, and
 * its history. Esc or a click outside closes it; ⌘/Ctrl-click a row for a full page.
 */
export function RecordPanel({
  app,
  model,
  id,
  csrf,
  onClose,
  onFullPage,
}: {
  app: string;
  model: string;
  id: string;
  csrf: string;
  onClose: () => void;
  onFullPage: () => void;
}) {
  const [tab, setTab] = useState('details');
  const [resetting, setResetting] = useState(false);
  const { query } = useRecordForm(app, model, id);
  const mutate = useStaffMutation();
  const schema = query.data;
  const base = `/records/${app}/${model}`;

  useEffect(() => {
    if (schema)
      rememberRecord({
        name: schema.title,
        url: `${base}?open=${encodeURIComponent(id)}`,
        group: schema.name,
      });
  }, [schema, base, id]);

  const extra = [
    ...(schema?.password
      ? [
          {
            label: 'Change password',
            icon: KeyRound,
            to: `${base}/${encodeURIComponent(id)}/password`,
          },
        ]
      : []),
    ...(schema?.canResetTwoFactor
      ? [
          {
            label: 'Reset two-factor',
            icon: ShieldOff,
            danger: true,
            onSelect: () => setResetting(true),
          },
        ]
      : []),
  ];

  return (
    <Sheet open onClose={onClose} title={schema?.title ?? 'Record'}>
      <div className={s.panel}>
        <header className={s.head}>
          <div className={s.titles}>
            <Text variant="caption" tone="tertiary">
              {schema?.name ?? ' '}
            </Text>
            <Text variant="title2" className={s.title}>
              {schema?.title ?? 'Loading…'}
            </Text>
          </div>
          <div className={s.actions}>
            <Button
              label=""
              aria-label="Open on its own page"
              title="Open on its own page"
              icon={Expand}
              variant="quiet"
              size="sm"
              onClick={onFullPage}
            />
            {extra.length > 0 && (
              <Menu label="More" iconOnly icon={MoreHorizontal} align="end" items={extra} />
            )}
          </div>
        </header>
        <Tabs
          label="Record"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details' },
            { value: 'related', label: 'Related' },
            { value: 'history', label: 'History' },
          ]}
        />
        <ConfirmDialog
          open={resetting}
          title="Reset their two-factor?"
          onClose={() => setResetting(false)}
        >
          <Text tone="secondary">
            Their current sign-ins stop working, and they set up an authenticator again next time.
            They’ll get an email about it.
          </Text>
          <div className={s.actions}>
            <Button
              label="Reset two-factor"
              onClick={async () => {
                setResetting(false);
                try {
                  await mutate(`two-factor/reset/${id}/`, new FormData(), csrf);
                  toast('Two-factor reset. They’ve been emailed.');
                } catch (error) {
                  toast(staffMessage(error), { tone: 'danger' });
                }
              }}
            />
            <Button label="Cancel" variant="secondary" onClick={() => setResetting(false)} />
          </div>
        </ConfirmDialog>
        <div className={s.body}>
          {tab === 'details' && (
            <RecordForm app={app} model={model} id={id} csrf={csrf} inPanel onDeleted={onClose} />
          )}
          {tab === 'related' && <RelatedList app={app} model={model} id={id} />}
          {tab === 'history' && <RecordHistory app={app} model={model} id={id} />}
        </div>
      </div>
    </Sheet>
  );
}
