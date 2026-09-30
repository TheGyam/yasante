import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { useRecordForm } from '../../hooks';
import { rememberRecord } from '../../recent';
import { RecordForm } from '../RecordForm';
import { RecordHistory } from '../RecordHistory';
import * as ui from '../ui.css';
import { RelatedList } from './RelatedList';
import * as s from './RecordPage.css';

/** A record on its own page: the form, with what's related and its history alongside. */
export function RecordPage({
  app,
  model,
  id,
  csrf,
}: {
  app: string;
  model: string;
  id?: string;
  csrf: string;
}) {
  const base = `/records/${app}/${model}`;
  const { query } = useRecordForm(app, model, id, useLocation().search);
  const schema = query.data;

  useEffect(() => {
    if (schema && id)
      rememberRecord({
        name: schema.title,
        url: `${base}/${encodeURIComponent(id)}`,
        group: schema.name,
      });
  }, [schema, base, id]);

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className={ui.heading}>
          <Link to={base} className={s.back}>
            <ArrowLeft size={14} aria-hidden /> {schema?.name ?? 'Back'}
          </Link>
          <Text variant="title1">{schema?.title ?? ' '}</Text>
        </div>
        {schema?.password && id && (
          <Button
            label="Change password"
            icon={KeyRound}
            variant="secondary"
            size="sm"
            to={`${base}/${encodeURIComponent(id)}/password`}
          />
        )}
      </header>
      <div className={id ? s.layout : undefined}>
        <div className={s.main}>
          <RecordForm app={app} model={model} id={id} csrf={csrf} />
        </div>
        {id && (
          <aside className={s.aside}>
            <section className={ui.card}>
              <Text variant="title3">Related</Text>
              <RelatedList app={app} model={model} id={id} />
            </section>
            <section className={ui.card}>
              <Text variant="title3">History</Text>
              <RecordHistory app={app} model={model} id={id} />
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
