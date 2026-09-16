import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Image as ImageIcon,
  Link2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react-native';
import { DatePickerModal } from '@/shared/components/DatePickerModal';
import { TimePicker } from '@/shared/components/TimePicker';
import { useTheme } from '@/shared/hooks/useTheme';
import { useCreateMoodBoardEntry } from '@/features/planner';
import { Text } from '@/shared/ui/Text';
import { ImageWithPlaceholder } from '@/shared/ui/ImageWithPlaceholder';
import { MediaPicker } from '@/shared/components/MediaPicker';
import { useAuth } from '@/features/auth';
import { AuthPromptModal } from '@/features/auth';
import { format } from 'date-fns';
import { ScrollView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { CreateStepOne } from '@/features/planner';
import { CreateStepTwo } from '@/features/planner';
import { BottomActionBar } from '@/features/planner';

export default function MoodBoardCreateScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; mainPhotoUri?: string }>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const userId = user?.id;
  const createEntry = useCreateMoodBoardEntry(userId || '');

  useEffect(() => {
    if (!isAuthenticated) setShowAuthPrompt(true);
  }, [isAuthenticated]);

  const [step, setStep] = useState(1);
  const navigation = useNavigation();
  const isDiscarding = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      // If manually discarding or finishing, let it go through
      if (isDiscarding.current) return;

      if (step === 2) {
        // Prevent default behavior of leaving the screen
        e.preventDefault();
        // Go back to step 1 instead
        setStep(1);
      }
    });

    return unsubscribe;
  }, [navigation, step]);

  // Step 1
  const [name, setName] = useState(params.name || '');
  const [isSecret, setIsSecret] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [stylistName, setStylistName] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2
  const [photos, setPhotos] = useState<string[]>(params.mainPhotoUri ? [params.mainPhotoUri] : []);
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  const handleImageSelected = (uri: string) => {
    setPhotos(prev => [...prev, uri]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    const trimmed = linkInput.trim();
    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      setPhotos(prev => [...prev, trimmed]);
      setLinkInput('');
    } else if (trimmed) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
    }
  };

  const combineDateTime = (date: Date, time: Date): Date => {
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    return combined;
  };

  const handleNext = () => {
    if (!name.trim()) {
      Alert.alert('Board Name Required', 'Give your board a name first.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !userId) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      const now = new Date();
      const appointmentDateTime = showAppointment
        ? combineDateTime(appointmentDate, appointmentTime)
        : now;
      const month = format(showAppointment ? appointmentDateTime : now, 'yyyy-MM');

      isDiscarding.current = true;

      await createEntry.mutateAsync({
        userId,
        month,
        name: name.trim(),
        mainPhotoUri: photos[0] || '',
        photos,
        stylistPrice: 0,
        hairPrice: 0,
        stylistLocation: location || '',
        appointmentTime: appointmentDateTime.toISOString(),
        notes: notes || undefined,
      } as any);

      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create mood board');
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="moodboard-create-screen"
    >
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.background,
          borderBottomWidth: 4,
          borderBottomColor: theme.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={step === 1 ? () => router.back() : () => setStep(1)}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step === 1 ? (
            <X size={18} color={theme.colors.text.high} strokeWidth={2.5} />
          ) : (
            <ArrowLeft size={18} color={theme.colors.text.high} strokeWidth={2.5} />
          )}
        </TouchableOpacity>

        <Text
          variant="body"
          weight="bold"
          color={theme.colors.text.high}
          style={{ fontSize: 17, textTransform: 'uppercase', fontStyle: 'italic' }}
        >
          {step === 1 ? 'Create Board' : 'Add Media'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: theme.colors.accent,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          />
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: step === 2 ? theme.colors.accent : theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {step === 1 ? (
          <CreateStepOne
            name={name}
            setName={setName}
            isSecret={isSecret}
            setIsSecret={setIsSecret}
            showAppointment={showAppointment}
            setShowAppointment={setShowAppointment}
            location={location}
            setLocation={setLocation}
            stylistName={stylistName}
            setStylistName={setStylistName}
            notes={notes}
            setNotes={setNotes}
            onOpenDatePicker={() => setShowDatePicker(true)}
            onOpenTimePicker={() => setShowTimePicker(true)}
            formattedDate={format(appointmentDate, 'EEEE, MMM d, yyyy')}
            formattedTime={format(appointmentTime, 'h:mm a')}
          />
        ) : (
          <CreateStepTwo
            linkInput={linkInput}
            setLinkInput={setLinkInput}
            onAddLink={handleAddLink}
            onOpenMediaPicker={() => setIsMediaPickerVisible(true)}
            photos={photos}
            onRemovePhoto={handleRemovePhoto}
          />
        )}
      </KeyboardAvoidingView>

      <BottomActionBar
        step={step}
        onNext={handleNext}
        onSubmit={handleSubmit}
        isPending={createEntry.isPending}
        onDiscard={() => {
          isDiscarding.current = true;
        }}
      />

      <MediaPicker
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onImageSelected={handleImageSelected}
        testID="photo-media-picker"
      />
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        feature="moodboard"
      />
    </View>
  );
}
