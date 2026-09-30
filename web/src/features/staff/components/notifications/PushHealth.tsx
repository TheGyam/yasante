import { CircleAlert, CircleCheck, Smartphone } from 'lucide-react';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import { formatNumber } from '../../format';
import { usePushHealth } from '../../hooks';
import * as ui from '../ui.css';
import * as s from './PushHealth.css';

/**
 * Can a push reach a phone right now? Whether the server sends at all, how many phones
 * are signed in, and what Apple and Google said about the last day's messages.
 */
export function PushHealth() {
  const query = usePushHealth();
  const health = query.data;
  if (!health) return null;
  const day = health.lastDay;
  const delivered = day.delivered ?? 0;
  const failed = day.failed ?? 0;
  const ok = health.sending && !health.problems.length;
  return (
    <section className={ui.card} aria-labelledby="push-health-title">
      <div className={ui.row}>
        {ok ? (
          <CircleCheck size={20} aria-hidden className={s.good} />
        ) : (
          <CircleAlert size={20} aria-hidden className={s.bad} />
        )}
        <Text variant="title3" id="push-health-title">
          {!health.sending
            ? 'Notifications aren’t leaving the server'
            : health.problems.length
              ? 'Some notifications aren’t reaching phones'
              : 'Notifications are working'}
        </Text>
      </div>
      {!health.sending && (
        <InlineAlert message="The server is set to log notifications instead of sending them. On the server, add PUSH_DELIVERY=expo to /srv/yasante/backend/.env and restart the app and the worker (sudo systemctl restart yasante-web yasante-worker)." />
      )}
      {health.problems.map(item => (
        <InlineAlert
          key={item.problem}
          message={`${item.problem} (${formatNumber(item.count)} in the last day)`}
        />
      ))}
      <div className={s.facts}>
        <span className={s.fact}>
          <Smartphone size={14} aria-hidden /> {formatNumber(health.people)} people with a phone
          signed in · {formatNumber(health.phones.ios ?? 0)} iPhone,{' '}
          {formatNumber(health.phones.android ?? 0)} Android
        </span>
        <span className={s.fact}>
          Last day: {formatNumber(delivered)} delivered
          {(day.sent ?? 0) > 0 && `, ${formatNumber(day.sent)} waiting for Apple or Google`}
          {failed > 0 && `, ${formatNumber(failed)} refused`}
          {(day.logged ?? 0) > 0 && `, ${formatNumber(day.logged)} only logged`}
        </span>
        {health.yours === 0 && (
          <span className={s.fact}>
            Your own account has no phone signed in, so a test has nowhere to go. Sign in to the app
            on your phone with this account and allow notifications.
          </span>
        )}
      </div>
    </section>
  );
}
