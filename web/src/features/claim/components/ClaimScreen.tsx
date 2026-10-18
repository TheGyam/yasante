import { useState } from 'react';
import { useNavigate } from 'react-router';
import { updateUser, useSession, withNext } from '@/features/auth';
import { ApiError } from '@/shared/lib/api/client';
import { errorMessage } from '@/shared/lib/errors';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Page } from '@/shared/ui/Page';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Rise } from '@/shared/ui/Rise';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useClaimPage, useClaimPreview } from '../hooks';
import * as styles from './ClaimScreen.css';

export function ClaimScreen({ code }: { code: string }) {
  const session = useSession();
  const navigate = useNavigate();
  const { data, isPending, error } = useClaimPreview(code);
  const claim = useClaimPage();
  const [claimError, setClaimError] = useState<string>();
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  if (isPending) {
    return (
      <Page title="Make this page yours" noIndex>
        <div className={styles.container} aria-busy>
          <Glass padded radius="xl" className={styles.card}>
            <Skeleton style={{ width: 96, height: 96, borderRadius: '50%' }} />
            <Skeleton style={{ width: 220, height: 32 }} />
            <Skeleton style={{ width: '100%', height: 72, borderRadius: 12 }} />
            <Skeleton style={{ width: '100%', height: 48, borderRadius: 12 }} />
          </Glass>
        </div>
      </Page>
    );
  }

  const is410 =
    (error instanceof ApiError && error.status === 410) ||
    (error as { status?: number } | null)?.status === 410;

  if (is410) {
    return (
      <Page title="Make this page yours" noIndex>
        <div className={styles.expiredWrap}>
          <Glass padded radius="xl">
            <Text variant="subhead">
              This link has already been used or has run out. Message{' '}
              <a
                href="https://www.instagram.com/yasantebeauty/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.inlineInstagramLink}
              >
                @yasantebeauty
              </a>{' '}
              on Instagram for a new one.
            </Text>
          </Glass>
        </div>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page title="Make this page yours" noIndex>
        <div className={styles.container}>
          <InlineAlert message={errorMessage(error, 'Couldn’t load this page.')} />
        </div>
      </Page>
    );
  }

  const onClaim = () => {
    setClaimError(undefined);
    setNeedsEmailConfirm(false);
    claim.mutate(code, {
      onSuccess: res => {
        if (res) updateUser(res);
        navigate('/finish', {
          state: { message: "It's yours. Next, add your prices." },
        });
      },
      onError: err => {
        const msg = errorMessage(err, 'Couldn’t claim this page.');
        setClaimError(msg);
        if (
          (err instanceof ApiError && err.status === 409) ||
          (err as { status?: number } | null)?.status === 409
        ) {
          if (msg.toLowerCase().includes('email')) {
            setNeedsEmailConfirm(true);
          }
        }
      },
    });
  };

  const waitingLabel =
    data.waiting === 1
      ? '1 person is waiting to book you'
      : `${data.waiting} people are waiting to book you`;

  return (
    <Page title={`This is your page, ${data.displayName}`} noIndex>
      <Rise className={styles.container}>
        <Glass padded radius="xl" className={styles.card}>
          <Avatar name={data.displayName} uri={data.avatarUri} size={96} />
          <div>
            <Text variant="title1">This is your page, {data.displayName}</Text>
            {!data.live && (
              <Text variant="subhead" tone="secondary">
                Your page isn't public yet. This is how it will look.
              </Text>
            )}
          </div>

          {data.waiting > 0 && (
            <Text variant="callout" tone="accent">
              {waitingLabel}
            </Text>
          )}

          {data.photos.length > 0 && (
            <div className={styles.photoStrip}>
              {data.photos.map((photo, index) => (
                <div key={index} className={styles.photoItem}>
                  <RemoteImage src={photo.thumbUri ?? photo.uri} alt="" aspect={1} />
                </div>
              ))}
            </div>
          )}

          {session ? (
            <div className={styles.actions}>
              {claimError && <InlineAlert message={claimError} />}
              {needsEmailConfirm && (
                <Button
                  label="Confirm your email"
                  variant="secondary"
                  to={withNext('/auth/verify-email', `/claim/${code}`)}
                  fullWidth
                />
              )}
              <Button
                label="Make it yours"
                loading={claim.isPending}
                disabled={claim.isPending}
                onClick={onClaim}
                fullWidth
              />
            </div>
          ) : (
            <div className={styles.actions}>
              <Text variant="subhead" tone="secondary">
                Sign up or sign in, then this page is yours.
              </Text>
              <Button label="Sign up" to={withNext('/auth/signup', `/claim/${code}`)} fullWidth />
              <Button
                label="Sign in"
                variant="secondary"
                to={withNext('/auth/login', `/claim/${code}`)}
                fullWidth
              />
            </div>
          )}
        </Glass>
      </Rise>
    </Page>
  );
}
