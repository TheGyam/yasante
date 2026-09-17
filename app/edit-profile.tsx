import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useUpdateUser, useUser, type User } from '@/features/profile';
import { makeStyles, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
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
    if (found.name || found.email) return;
    update.mutate(
      { name: name.trim(), email: email.trim() || undefined, avatarUri: avatarUri || undefined },
      {
        onSuccess: () => router.back(),
        onError: () => Alert.alert('Couldn’t save', 'Check your connection and try again.'),
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
