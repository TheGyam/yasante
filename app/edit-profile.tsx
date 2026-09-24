import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { AtSign, Camera } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useUpdateUser, useUser, useUsernameCheck, type User } from '@/features/profile';
import { errorMessage } from '@/features/auth';
import { makeStyles, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { PhotoSourceSheet } from '@/shared/ui/PhotoSourceSheet';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isRequired, isValidEmail } from '@/shared/utils/validation';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  avatar: { alignSelf: 'center' },
  camera: { position: 'absolute', right: -4, bottom: -4 },
  fields: { gap: space.lg },
}));

export default function EditProfileScreen() {
  const { user: authUser } = useAuth();
  const { data: user } = useUser(authUser?.id);

  return (
    <Screen title="Edit profile" modal keyboard testID="edit-profile-screen">
      {/* The form mounts once the profile is here, so its fields start filled in. */}
      {user ? <ProfileForm user={user} /> : <Skeleton height={96} width={96} radius={48} />}
    </Screen>
  );
}

function ProfileForm({ user }: { user: User }) {
  const styles = useStyles();
  const router = useRouter();
  const update = useUpdateUser(user.id);
  const [name, setName] = useState(user.name ?? '');
  const [username, setUsername] = useState(user.username ?? '');
  const check = useUsernameCheck(username, user.username);
  const wanted = username.trim().replace(/^@/, '').toLowerCase();
  const usernameChanged = !!wanted && wanted !== user.username;
  // Said as she types: free, or why not. Nothing until there's enough to check.
  const usernameHint = !usernameChanged
    ? 'It’s what your looks and comments show.'
    : check.data?.username === wanted
      ? check.data.available
        ? 'That one’s yours if you want it'
        : (check.data.reason ?? 'Someone already has that')
      : wanted.length < 3
        ? 'At least 3 characters'
        : check.isError
          ? 'We’ll check it when you save'
          : 'Checking…';
  const usernameTaken = usernameChanged && check.data?.username === wanted && !check.data.available;
  const [email, setEmail] = useState(user.email ?? '');
  const [avatarUri, setAvatarUri] = useState(user.avatarUri ?? '');
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const save = () => {
    const found = {
      name: isRequired(name) ? undefined : 'Add your name',
      email: !email || isValidEmail(email) ? undefined : 'That email doesn’t look right',
    };
    setErrors(found);
    if (found.name || found.email || usernameTaken) return;
    update.mutate(
      {
        name: name.trim(),
        username: usernameChanged ? wanted : undefined,
        email: email.trim() || undefined,
        avatarUri: avatarUri || undefined,
      },
      {
        onSuccess: () => router.back(),
        onError: error =>
          notify({
            title: 'Couldn’t save',
            message: errorMessage(error, 'Check your connection and try again.'),
          }),
      }
    );
  };

  return (
    <View style={styles.body}>
      <View style={styles.avatar}>
        <Avatar uri={avatarUri} name={name} size={96} />
        <IconButton
          icon={Camera}
          variant="accent"
          size={36}
          accessibilityLabel="Change photo"
          style={styles.camera}
          onPress={() => setPicking(true)}
        />
      </View>

      <View style={styles.fields}>
        <Input
          label="Name"
          value={name}
          onChangeText={text => {
            setName(text);
            if (errors.name) setErrors(e => ({ ...e, name: undefined }));
          }}
          error={errors.name}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
        />
        <Input
          label="Username"
          value={username}
          onChangeText={text => setUsername(text.replace(/\s/g, ''))}
          icon={AtSign}
          hint={usernameTaken ? undefined : usernameHint}
          error={usernameTaken ? usernameHint : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={31}
          testID="edit-username"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={text => {
            setEmail(text);
            if (errors.email) setErrors(e => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
        />
      </View>

      <Button
        label="Save changes"
        onPress={save}
        loading={update.isPending}
        haptic="success"
        fullWidth
      />

      <PhotoSourceSheet
        title="Profile photo"
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={uri => {
          setAvatarUri(uri);
          setPicking(false);
        }}
      />
    </View>
  );
}
