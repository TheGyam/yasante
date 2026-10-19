import { useState, type FormEvent } from 'react';
import { ExternalLink, MapPin, Store } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { DEFAULT_CURRENCY, fromMiles, toMiles } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, TextArea } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Rise } from '@/shared/ui/Rise';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { toHandle } from '../handle';
import {
  useCountries,
  useGoLive,
  usePlaceSuggestions,
  useHandleAvailability,
  useMyProfile,
} from '../hooks';
import { draftFromProfile, useSetupDraft, type SetupDraft } from '../setupDraft';
import type { StylistProfile } from '../types';
import {
  CountryField,
  HandleField,
  PolicyFields,
  ProofPhotoField,
  ServiceModelField,
} from './SetupFields';
import * as styles from './StylistSetupScreen.css';

/** The app's steps, in the app's words (app/stylist-setup.tsx). */
const STEPS = [
  {
    title: 'Your name and page',
    help: 'This is what clients see, and the link you’ll put in your bio.',
  },
  {
    title: 'Where you work',
    help: 'Clients only ever see your district until a booking is confirmed.',
  },
  { title: 'Your rules', help: 'The questions you answer in DMs every week, answered once.' },
  {
    title: 'Proof of your work',
    help: 'One photo you took of your own work, and your Instagram if you have one.',
  },
  { title: 'Ready to go live', help: '' },
] as const;

export interface StylistSetupScreenProps {
  accountId: string;
  /** Her name from sign-up, to start the page from. */
  name: string;
}

/**
 * Setting up her page on the web: the same five steps as the app, saved in the browser
 * as she goes. A page she already has fills the form, so setting up and editing are one.
 */
export function StylistSetupScreen({ accountId, name }: StylistSetupScreenProps) {
  const mine = useMyProfile(accountId);

  if (mine.isPending) {
    return (
      <Page title="Your page">
        <div className={styles.column} aria-busy>
          <Skeleton style={{ height: 40, width: '60%' }} />
          <Skeleton style={{ height: 280 }} />
        </div>
      </Page>
    );
  }
  if (mine.isError) {
    return (
      <Page title="Your page">
        <EmptyState
          as="h1"
          title="Couldn’t load your page"
          body={errorMessage(mine.error, 'Please try again in a moment.')}
          action={
            <Button
              label="Try again"
              variant="secondary"
              size="md"
              onClick={() => mine.refetch()}
            />
          }
        />
      </Page>
    );
  }
  return <Setup accountId={accountId} name={name} existing={mine.data} />;
}

function Setup({
  accountId,
  name,
  existing,
}: StylistSetupScreenProps & { existing: StylistProfile | null }) {
  const { draft, update, reset } = useSetupDraft(
    accountId,
    existing ? draftFromProfile(existing) : { displayName: name, handle: toHandle(name) }
  );
  const [proof, setProof] = useState<File>();
  // What went live, and whether it was already live before: decided when she submits,
  // since the page reads as live the moment it's saved.
  const [live, setLive] = useState<{ profile: StylistProfile; edited: boolean }>();
  const availability = useHandleAvailability(draft.handle);
  const goLive = useGoLive(accountId);

  const index = Math.min(draft.step, STEPS.length - 1);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const set = (changes: Partial<SetupDraft>) => update(changes);
  const { data: countries = [] } = useCountries();
  const places = usePlaceSuggestions(draft.baseArea, draft.country ?? 'GB');
  const country = countries.find(c => c.code === (draft.country ?? 'GB'));
  // Her distances in her country's units: miles in the UK and the US, km elsewhere.
  const inMiles = (country?.units ?? 'mi') === 'mi';
  const editingLive = !!existing?.published;

  const ready = [
    !!draft.displayName.trim() && availability.available === true,
    draft.serviceModels.length > 0 && !!draft.baseArea.trim(),
    draft.policies?.depositType === 'none' || !!draft.policies?.depositAmount,
    // The proof photo is for her checked badge, not for going live.
    true,
    true,
  ][index];

  const go = (by: 1 | -1) => {
    update({ step: index + by });
    window.scrollTo({ top: 0 });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    if (!isLast) return go(1);
    const { step: _step, ...profile } = draft;
    goLive.mutate(
      {
        draft: {
          ...profile,
          displayName: profile.displayName.trim(),
          baseArea: profile.baseArea.trim(),
        },
        proof,
        existing,
      },
      {
        onSuccess: page => {
          reset();
          setLive({ profile: page, edited: editingLive });
        },
      }
    );
  };

  if (live) return <Live profile={live.profile} edited={live.edited} />;

  const pageUrl = `yasante.com/${draft.handle}`;

  return (
    <Page title={editingLive ? 'Edit your page' : 'Set up your page'}>
      <form className={styles.column} onSubmit={submit} noValidate>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={`Step ${index + 1} of ${STEPS.length}`}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={index + 1}
        >
          <div
            className={styles.progressFill}
            style={{ transform: `scaleX(${(index + 1) / STEPS.length})` }}
          />
        </div>

        <Rise key={index} className={styles.step}>
          <div className={styles.heading}>
            <Text variant="title1">{step.title}</Text>
            {step.help && (
              <Text variant="subhead" tone="secondary">
                {step.help}
              </Text>
            )}
          </div>

          <Glass padded radius="xl" className={styles.step}>
            {index === 0 && (
              <>
                <Input
                  label="Name clients know you by"
                  value={draft.displayName}
                  placeholder="Braids by Ama"
                  onChange={event =>
                    set({
                      displayName: event.target.value,
                      // Suggest a handle from the name until she edits one herself: while
                      // it's still the suggestion for the name so far, it follows the name.
                      handle:
                        !draft.handle || draft.handle === toHandle(draft.displayName)
                          ? toHandle(event.target.value)
                          : draft.handle,
                    })
                  }
                />
                <HandleField
                  value={draft.handle}
                  onChange={handle => set({ handle })}
                  availability={availability}
                />
                <TextArea
                  label="A line about your work"
                  value={draft.bio ?? ''}
                  placeholder="Knotless, boho and feed-in braids. Gentle on edges."
                  maxLength={1000}
                  onChange={event => set({ bio: event.target.value })}
                />
              </>
            )}

            {index === 1 && (
              <>
                <ServiceModelField
                  value={draft.serviceModels}
                  onChange={serviceModels => set({ serviceModels })}
                />
                <CountryField
                  value={draft.country ?? 'GB'}
                  onChange={country => set({ country: country.code })}
                />
                <Input
                  label="Your area"
                  value={draft.baseArea}
                  placeholder="Peckham"
                  hint="District only — never your address"
                  autoComplete="off"
                  list="area-suggestions"
                  onChange={event => set({ baseArea: event.target.value })}
                />
                <datalist id="area-suggestions">
                  {places.map(place => (
                    <option key={place} value={place} />
                  ))}
                </datalist>
                {places.length > 0 && (
                  <Text variant="caption" tone="tertiary">
                    Suggestions © OpenStreetMap contributors
                  </Text>
                )}
                {draft.serviceModels.includes('mobile') && (
                  <Input
                    label="How far you travel"
                    value={
                      draft.travelRadiusMiles
                        ? String(fromMiles(draft.travelRadiusMiles, inMiles))
                        : ''
                    }
                    placeholder={inMiles ? '5' : '8'}
                    inputMode="numeric"
                    hint={inMiles ? 'Miles from your area' : 'Kilometres from your area'}
                    onChange={event =>
                      set({
                        travelRadiusMiles: toMiles(
                          Number(event.target.value.replace(/\D/g, '')) || 0,
                          inMiles
                        ),
                      })
                    }
                  />
                )}
              </>
            )}

            {index === 2 && draft.policies && (
              <PolicyFields
                value={draft.policies}
                onChange={policies => set({ policies })}
                currency={country?.currency ?? DEFAULT_CURRENCY}
              />
            )}

            {index === 3 && (
              <>
                <ProofPhotoField file={proof} saved={!!draft.proofPhotoUri} onChange={setProof} />
                <Input
                  label="Instagram"
                  value={draft.instagramHandle ?? ''}
                  placeholder="braidsbyama"
                  autoCapitalize="none"
                  hint="Optional. Shown on your page so clients recognise you"
                  onChange={event =>
                    set({ instagramHandle: event.target.value.replace(/[^\w.]/g, '') })
                  }
                />
                <Input
                  label="TikTok"
                  value={draft.tiktokHandle ?? ''}
                  placeholder="braidsbyama"
                  autoCapitalize="none"
                  hint="Optional. Shown on your page too"
                  onChange={event =>
                    set({ tiktokHandle: event.target.value.replace(/[^\w.]/g, '') })
                  }
                />
              </>
            )}

            {isLast && (
              <>
                <Section title="Your page">
                  <ListRow icon={Store} title={draft.displayName} subtitle={pageUrl} />
                  <ListRow
                    icon={MapPin}
                    iconTone="neutral"
                    title={draft.baseArea}
                    subtitle={draft.serviceModels.join(' · ')}
                  />
                </Section>
                <Text variant="body" tone="secondary">
                  Your page goes live at {pageUrl}. Add your styles and prices next — clients can
                  find you either way.
                </Text>
                {!draft.proofPhotoUri && !proof && (
                  <Text variant="footnote" tone="tertiary">
                    Add a photo of your work whenever you like, and we’ll check your page for the
                    badge that tells clients the work is yours.
                  </Text>
                )}
              </>
            )}
          </Glass>
        </Rise>

        {goLive.isError && (
          <InlineAlert
            message={errorMessage(goLive.error, 'We couldn’t put your page live just yet.')}
          />
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            label={isLast ? (editingLive ? 'Save changes' : 'Put my page live') : 'Continue'}
            disabled={!ready}
            loading={goLive.isPending}
            fullWidth
          />
          {index > 0 && <Button label="Back" variant="ghost" onClick={() => go(-1)} fullWidth />}
        </div>
      </form>
    </Page>
  );
}

/** Live: her link, and on to her studio to get ready for clients. */
function Live({ profile, edited }: { profile: StylistProfile; edited: boolean }) {
  return (
    <Page title={edited ? 'Saved' : 'Your page is live'}>
      <Rise className={styles.column}>
        <div className={styles.done}>
          <Text variant="title1">{edited ? 'Saved' : 'Your page is live'}</Text>
          <Text variant="body" tone="secondary">
            It’s at <strong>yasante.com/{profile.handle}</strong>. Put it in your bio: it’s the link
            clients book you from.
          </Text>
          {!edited && (
            <Text variant="body" tone="secondary">
              Next: add your services and prices, set your hours, and post your work — your looks
              are how clients find you in the feed.
            </Text>
          )}
          <div className={styles.actions}>
            <Button label="Go to your studio" to="/today" />
            <Button
              label="See your page"
              icon={ExternalLink}
              variant="secondary"
              to={`/${profile.handle}`}
            />
          </div>
        </div>
      </Rise>
    </Page>
  );
}
