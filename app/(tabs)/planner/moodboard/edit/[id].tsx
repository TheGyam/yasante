import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert, Switch, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronDown, ChevronUp, Plus, Image as ImageIcon, Link2, Calendar as CalendarIcon, Clock, MapPin, User, ArrowLeft, Trash2 } from 'lucide-react-native';
import { DatePickerModal } from '@/components/composed/DatePickerModal';
import { TimePicker } from '@/components/composed/TimePicker';
import { useTheme } from '@/hooks/useTheme';
import { useMoodBoardEntry, useUpdateMoodBoardEntry, useDeleteMoodBoardEntry } from '@/api/hooks/useMoodBoard';
import { Text } from '@/components/ui/Text';
import { MediaPicker } from '@/components/composed/MediaPicker';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { BrutalistInput } from '@/components/moodboard/ui/BrutalistInput';
import { CreatePhotoGrid } from '@/components/moodboard/ui/CreatePhotoGrid';

export default function MoodBoardEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id || '';
  const { data: entry, isLoading } = useMoodBoardEntry(id || '');
  const updateEntry = useUpdateMoodBoardEntry(id || '', userId);
  const deleteEntry = useDeleteMoodBoardEntry(id || '', userId);

  const [name, setName] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [stylistName, setStylistName] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    if (entry) {
      setName(entry.name);
      setPhotos(entry.photos || []);
      setLocation(entry.stylistLocation || '');
      setStylistName((entry as any).stylistName || '');
      setNotes(entry.notes || '');
      setIsSecret(entry.isSecret || false);
      if (entry.appointmentTime) {
        const dt = new Date(entry.appointmentTime);
        if (!isNaN(dt.getTime())) {
          setAppointmentDate(dt);
          setAppointmentTime(dt);
          setShowAppointment(true);
        }
      }
    }
  }, [entry]);

  const handleImageSelected = (uri: string) => setPhotos(prev => [...prev, uri]);
  const handleRemovePhoto = (index: number) => setPhotos(prev => prev.filter((_, i) => i !== index));

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Board Name Required', 'Give your board a name first.');
      return;
    }
    try {
      const now = new Date();
      const appointmentDateTime = showAppointment ? combineDateTime(appointmentDate, appointmentTime) : now;
      const month = format(showAppointment ? appointmentDateTime : now, 'yyyy-MM');
      await updateEntry.mutateAsync({
        name: name.trim(), month,
        mainPhotoUri: photos[0] || '', photos,
        stylistPrice: entry?.stylistPrice || 0, hairPrice: entry?.hairPrice || 0,
        stylistLocation: location || '',
        appointmentTime: appointmentDateTime.toISOString(),
        notes: notes || undefined,
        isSecret: isSecret,
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update mood board');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Board', 'Are you sure? This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteEntry.mutateAsync(); router.back(); router.back(); } catch { Alert.alert('Error', 'Failed to delete board'); }
      }},
    ]);
  };

  if (isLoading || !entry) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{
          width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surface,
          borderWidth: 2, borderColor: theme.colors.text.high, alignItems: 'center', justifyContent: 'center',
        }}>
          <ArrowLeft size={18} color={theme.colors.text.high} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text variant="body" weight="bold" color={theme.colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 2 }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="moodboard-edit-screen">
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
        borderBottomWidth: 4, borderBottomColor: theme.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color={theme.colors.text.high} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 17, textTransform: 'uppercase', fontStyle: 'italic' }}>
          Edit Board
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 240 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        >
          {/* Board Name */}
          <View style={{ position: 'relative', marginBottom: 32 }}>
            <View style={{
              position: 'absolute', top: 4, left: 4, right: -4, bottom: -4,
              backgroundColor: theme.colors.primary, borderRadius: 20, borderWidth: 2, borderColor: theme.colors.text.high,
            }} />
            <View style={{
              borderWidth: 2, borderColor: theme.colors.text.high, borderRadius: 20,
              padding: 20, backgroundColor: theme.colors.surface,
            }}>
              <Text variant="caption" weight="bold" color={theme.colors.text.high} style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                BOARD NAME
              </Text>
              <TextInput value={name} onChangeText={setName} placeholder="Name your board"
                placeholderTextColor={theme.colors.primary}
                style={{ fontSize: 18, color: theme.colors.text.high, fontWeight: '700', fontStyle: 'italic', padding: 0 }}
                testID="board-name-input" />
            </View>
          </View>

          {/* Secret Toggle */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => setIsSecret(!isSecret)}
            style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: 20, borderBottomWidth: 2, borderBottomColor: theme.colors.text.high,
            }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}>
                Make this board secret
              </Text>
              <Text variant="caption" weight="bold" color={theme.colors.primary} style={{ marginTop: 4, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                ONLY YOU AND COLLABORATORS SEE IT
              </Text>
            </View>
            <Switch value={isSecret} onValueChange={setIsSecret}
              trackColor={{ false: theme.colors.background, true: theme.colors.primary }} thumbColor={theme.colors.surface} ios_backgroundColor={theme.colors.background} />
          </TouchableOpacity>

          {/* Salon Appointment */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowAppointment(!showAppointment)}
            style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: 20, borderBottomWidth: showAppointment ? 0 : 2, borderBottomColor: theme.colors.text.high,
            }}>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}>
                Salon Appointment
              </Text>
              <Text variant="caption" weight="bold" color={theme.colors.primary} style={{ marginTop: 4, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                LINK A DATE TO THIS BOARD
              </Text>
            </View>
            {showAppointment ? <ChevronUp size={20} color={theme.colors.text.high} strokeWidth={2.5} /> : <ChevronDown size={20} color={theme.colors.text.high} strokeWidth={2.5} />}
          </TouchableOpacity>

          {showAppointment && (
            <Animated.View entering={FadeInDown.duration(300)} style={{ paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: theme.colors.text.high }}>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.text.high, marginBottom: 10 }}>
                <CalendarIcon size={18} color={theme.colors.primary} strokeWidth={2} />
                <Text variant="body" weight="semibold" color={theme.colors.text.high}>{format(appointmentDate, 'MMMM d, yyyy')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.text.high, marginBottom: 10 }}>
                <Clock size={18} color={theme.colors.primary} strokeWidth={2} />
                <Text variant="body" weight="semibold" color={theme.colors.text.high}>{format(appointmentTime, 'h:mm a')}</Text>
              </TouchableOpacity>

              <BrutalistInput icon={<MapPin size={18} color={theme.colors.primary} strokeWidth={2} />} value={location} onChangeText={setLocation} placeholder="Salon location" />
              <BrutalistInput icon={<User size={18} color={theme.colors.primary} strokeWidth={2} />} value={stylistName} onChangeText={setStylistName} placeholder="Name of stylist" />

              <DatePickerModal visible={showDatePicker} onClose={() => setShowDatePicker(false)} value={appointmentDate} onChange={setAppointmentDate} minimumDate={new Date()} />
              <TimePicker visible={showTimePicker} onClose={() => setShowTimePicker(false)} value={appointmentTime} onChange={setAppointmentTime} />
            </Animated.View>
          )}

          {/* Notes */}
          <View style={{ paddingVertical: 20, borderBottomWidth: 2, borderBottomColor: theme.colors.text.high }}>
            <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 16, marginBottom: 10, textTransform: 'uppercase', fontStyle: 'italic' }}>
              Notes
            </Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Add a short note..." placeholderTextColor={theme.colors.primary}
              multiline numberOfLines={3}
              style={{
                fontSize: 15, color: theme.colors.text.high, fontWeight: '600',
                padding: 14, backgroundColor: theme.colors.surface,
                borderRadius: 14, borderWidth: 2, borderColor: theme.colors.text.high,
                minHeight: 80, textAlignVertical: 'top',
              }} />
          </View>

          {/* Media Section */}
          <View style={{ paddingVertical: 20, borderBottomWidth: 2, borderBottomColor: theme.colors.text.high }}>
            <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 16, marginBottom: 10, textTransform: 'uppercase', fontStyle: 'italic' }}>
              Media
            </Text>

            {/* Link Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 12, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.text.high,
              }}>
                <Link2 size={18} color={theme.colors.primary} strokeWidth={2} />
                <TextInput value={linkInput} onChangeText={setLinkInput}
                  placeholder="Paste Pinterest, Instagram URL..." placeholderTextColor={theme.colors.primary}
                  style={{ flex: 1, fontSize: 14, color: theme.colors.text.high, fontWeight: '600', padding: 0 }}
                  autoCapitalize="none" keyboardType="url" returnKeyType="done" onSubmitEditing={handleAddLink} />
              </View>
              <TouchableOpacity onPress={handleAddLink} activeOpacity={0.7}
                style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.text.high, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color={theme.colors.surface} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Upload */}
            <TouchableOpacity onPress={() => setIsMediaPickerVisible(true)} activeOpacity={0.8}
              style={{
                borderWidth: 3, borderStyle: 'dashed', borderColor: theme.colors.text.high,
                borderRadius: 20, padding: 24,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: theme.colors.surface,
              }}>
              <ImageIcon size={32} color={theme.colors.primary} strokeWidth={1.5} />
              <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ marginTop: 8, textTransform: 'uppercase', fontStyle: 'italic' }}>
                Upload from Device
              </Text>
            </TouchableOpacity>

            <CreatePhotoGrid photos={photos} onRemovePhoto={handleRemovePhoto} />
          </View>

          <TouchableOpacity onPress={handleDelete} activeOpacity={0.7} disabled={deleteEntry.isPending}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingVertical: 20, marginTop: 8,
            }}>
            <Trash2 size={18} color={theme.colors.accentSecondary} strokeWidth={2.5} />
            <Text variant="body" weight="bold" color={theme.colors.accentSecondary} style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>
              {deleteEntry.isPending ? 'Deleting...' : 'Delete Board'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', bottom: insets.bottom + 90, right: 20, zIndex: 10 }}>
        <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85} disabled={updateEntry.isPending}
          style={{
            backgroundColor: theme.colors.accent, borderWidth: 4, borderColor: theme.colors.text.high,
            borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center',
            opacity: updateEntry.isPending ? 0.6 : 1,
            shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8,
          }}>
          <Text variant="body" weight="bold" color={theme.colors.surface} style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}>
            {updateEntry.isPending ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      <MediaPicker visible={isMediaPickerVisible} onClose={() => setIsMediaPickerVisible(false)} onImageSelected={handleImageSelected} testID="photo-media-picker" />
    </View>
  );
}
