import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Camera, Check, Instagram, MapPin, Store } from 'lucide-react-native';
import { errorMessage, useAuth, useAuthStore } from '@/features/auth';
import {
  HandleField,
  PolicyFields,
  LocationField,
  ServiceModelField,
  pageUrl,
  toHandle,
  useCreateStylistProfile,
  useHandleAvailability,
  useMyStylistProfile,
  usePublishPage,
  useModeStore,
  useSetupDraft,
  useUpdateStylistProfile,
  type SetupDraft,
} from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { PhotoSourceSheet } from '@/shared/ui/PhotoSourceSheet';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';

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

const FORWARD = FadeInRight.duration(280).easing(EASE_OUT);
const BACKWARD = FadeInLeft.duration(280).easing(EASE_OUT);

const useStyles = makeStyles(() => ({
  body: { gap: space.sm },
  progress: { marginTop: space.sm, marginBottom: space.xxl },
  heading: { gap: space.sm, marginBottom: space.xl },
  step: { gap: space.lg },
  footer: { gap: space.xs, paddingTop: space.lg },
  review: { gap: space.lg },
}));

/**
 * Stylist setup: five steps, answered on a call or alone, saved on the device as she
 * goes so an interruption never costs the work. Publishing needs a verified phone.
 */
export default function StylistSetupScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { user } = useAuth();
  const { draft, update, reset } = useSetupDraft();
  const { data: existing } = useMyStylistProfile();
  const createProfile = useCreateStylistProfile();
  const updateProfile = useUpdateStylistProfile();
  const publish = usePublishPage();

  const [index, setIndex] = useState(draft.step);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const availability = useHandleAvailability(draft.handle);

  // An existing draft page fills the form, so "edit my page" and "set it up" are one flow.
  useEffect(() => {
    if (existing && !draft.displayName) update({ ...existing, step: 0 });
  }, [existing, draft.displayName, update]);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const set = (changes: Partial<SetupDraft>) => update(changes);

  const ready = [
    !!draft.displayName.trim() && availability.available === true,
    draft.serviceModels.length > 0 && !!draft.baseArea.trim(),
    draft.policies.depositType === 'none' || !!draft.policies.depositAmount,
    // The proof photo is for her verified badge, not for going live: an abandoned
    // setup costs more than a page waiting to be checked.
    true,
    true,
  ][index];

  const go = (by: 1 | -1) => {
    setDirection(by);
    const next = index + by;
    setIndex(next);
    update({ step: next });
  };

  const goLive = async () => {
    const { step: _step, ...profile } = draft;
    try {
      if (existing) {
        await updateProfile.mutateAsync(profile);
      } else {
        await createProfile.mutateAsync(profile);
        // Setting up a page is what makes the account a stylist.
        if (user && !user.roles?.includes('stylist')) {
          useAuthStore.getState().setUser({ ...user, roles: [...(user.roles ?? []), 'stylist'] });
        }
      }
      await publish.mutateAsync();
      haptics.success();
      reset();
      router.back();
      // A client who just became a stylist lands in stylist mode.
      if (!existing) useModeStore.getState().beginSwitch('stylist');
    } catch (error) {
      haptics.error();
      const message = errorMessage(error, 'We couldn’t put your page live just yet.');
      await notify({ title: 'Not live yet', message });
    }
  };

  const saving = createProfile.isPending || updateProfile.isPending || publish.isPending;
  // Changing a page that's already live, rather than setting one up.
  const editingLive = !!existing?.published;

  return (
    <Screen
      modal
      back={index > 0}
      onBack={index > 0 ? () => go(-1) : undefined}
      keyboard
      testID="stylist-setup"
    >
      <View style={styles.body}>
        <View style={styles.progress}>
          <ProgressBar progress={(index + 1) / STEPS.length} height={4} />
        </View>

        <Animated.View
          key={index}
          entering={direction > 0 ? FORWARD : BACKWARD}
          style={styles.step}
        >
          <View style={styles.heading}>
            <Text variant="title1" accessibilityRole="header">
              {step.title}
            </Text>
            {!!step.help && (
              <Text variant="subhead" tone="secondary">
                {step.help}
              </Text>
            )}
          </View>

          {index === 0 && (
            <>
              <Input
                label="Name clients know you by"
                icon={Store}
                value={draft.displayName}
                onChangeText={displayName =>
                  set({
                    displayName,
                    // Suggest a handle from the name until she edits one herself: while
                    // it's still the suggestion for the name so far, it follows the name.
                    handle:
                      !draft.handle || draft.handle === toHandle(draft.displayName)
                        ? toHandle(displayName)
                        : draft.handle,
                  })
                }
                placeholder="Braids by Ama"
                autoCapitalize="words"
              />
              <HandleField
                value={draft.handle}
                onChange={handle => set({ handle })}
                availability={availability}
              />
              <Input
                label="A line about your work"
                value={draft.bio ?? ''}
                onChangeText={bio => set({ bio })}
                placeholder="Knotless, boho and feed-in braids. Gentle on edges."
                multiline
                style={{ minHeight: 88 }}
              />
            </>
          )}

          {index === 1 && (
            <>
              <ServiceModelField
                value={draft.serviceModels}
                onChange={serviceModels => set({ serviceModels })}
              />
              <LocationField
                baseArea={draft.baseArea}
                address={draft.address}
                needsStreet={draft.serviceModels.some(m => m !== 'mobile')}
                onChange={set}
              />
              {draft.serviceModels.includes('mobile') && (
                <Input
                  label="How far you travel"
                  value={draft.travelRadiusMiles ? String(draft.travelRadiusMiles) : ''}
                  onChangeText={text =>
                    set({ travelRadiusMiles: Number(text.replace(/\D/g, '')) || 0 })
                  }
                  placeholder="5"
                  keyboardType="number-pad"
                  hint="Miles from your area"
                />
              )}
            </>
          )}

          {index === 2 && (
            <PolicyFields value={draft.policies} onChange={policies => set({ policies })} />
          )}

          {index === 3 && (
            <>
              <Section footer="Only Yasante sees this photo. It's how we check a page belongs to the person who did the work.">
                <ListRow
                  title={draft.proofPhotoUri ? 'Photo added' : 'Add a photo of your work'}
                  subtitle={draft.proofPhotoUri ? 'Tap to choose a different one' : 'Taken by you'}
                  icon={draft.proofPhotoUri ? Check : Camera}
                  iconTone={draft.proofPhotoUri ? 'success' : 'accent'}
                  onPress={() => setPickingPhoto(true)}
                />
              </Section>
              <Input
                label="Instagram"
                icon={Instagram}
                value={draft.instagramHandle ?? ''}
                onChangeText={instagramHandle =>
                  set({ instagramHandle: instagramHandle.replace(/[^\w.]/g, '') })
                }
                placeholder="braidsbyama"
                autoCapitalize="none"
                hint="Optional. Shown on your page so clients recognise you"
              />
            </>
          )}

          {isLast && (
            <View style={styles.review}>
              <Section title="Your page">
                <ListRow
                  title={draft.displayName}
                  subtitle={pageUrl({ handle: draft.handle })}
                  icon={Store}
                />
                <ListRow
                  title={draft.baseArea}
                  subtitle={draft.serviceModels.join(' · ')}
                  icon={MapPin}
                  iconTone="neutral"
                />
              </Section>
              <Text variant="body" tone="secondary">
                Your page goes live at {pageUrl({ handle: draft.handle })}. Add your styles and
                prices next — clients can find you either way.
              </Text>
              {!draft.proofPhotoUri && (
                <Text variant="footnote" tone="tertiary">
                  Add a photo of your work whenever you like, and we’ll check your page for the
                  badge that tells clients the work is yours.
                </Text>
              )}
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Button
            label={isLast ? (editingLive ? 'Save changes' : 'Put my page live') : 'Continue'}
            onPress={isLast ? goLive : () => go(1)}
            disabled={!ready}
            loading={saving}
            haptic={isLast ? undefined : 'light'}
            fullWidth
            testID="setup-next"
          />
          {!isLast &&
            (editingLive ? (
              // A live page stays as it is: leaving drops the unsaved edits.
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  reset();
                  router.back();
                }}
                fullWidth
              />
            ) : (
              <Button
                label="Finish later"
                variant="ghost"
                onPress={() => router.back()}
                fullWidth
              />
            ))}
        </View>
      </View>

      <PhotoSourceSheet
        title="Photo of your work"
        visible={pickingPhoto}
        onClose={() => setPickingPhoto(false)}
        onPick={uri => {
          set({ proofPhotoUri: uri });
          setPickingPhoto(false);
        }}
      />
    </Screen>
  );
}
