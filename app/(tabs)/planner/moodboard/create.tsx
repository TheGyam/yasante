import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { X, Image as ImageIcon, Calendar as CalendarIcon, Clock, Palette, Plus, DollarSign } from 'lucide-react-native';
import { DatePickerModal } from '@/components/composed/DatePickerModal';
import { TimePicker } from '@/components/composed/TimePicker';
import { useTheme } from '@/hooks/useTheme';
import { useCreateMoodBoardEntry } from '@/api/hooks/useMoodBoard';
import { TopBar } from '@/components/composed/TopBar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { MediaPicker } from '@/components/composed/MediaPicker';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { isRequired } from '@/utils/validation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import type { Theme } from '@/theme/ThemeProvider';
import { format } from 'date-fns';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ bottomInset, theme }: { bottomInset: number; theme: Theme }) => bottomInset + theme.spacing[4] + 80}px;
`;

const SectionWrapper = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
`;

const Section = styled(Card)`
  overflow: visible;
`;

const SectionTitle = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const PhotoSection = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const PhotoGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const PhotoItem = styled.View`
  width: ${(SCREEN_WIDTH - 32 - 16 - 24) / 3}px;
  aspect-ratio: 1;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const PhotoPreview = styled(ImageWithPlaceholder)`
  width: 100%;
  height: 100%;
`;

const AddPhotoButton = styled(TouchableOpacity)`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-width: 2px;
  border-style: dashed;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  min-height: 120px;
`;

const LargePhotoArea = styled.TouchableOpacity`
  width: 100%;
  min-height: 200px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-width: 2px;
  border-style: dashed;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const TextLink = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const RemovePhotoButton = styled(TouchableOpacity)`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background-color: rgba(0, 0, 0, 0.7);
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const PickerButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const PriceRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const PriceInputContainer = styled.View`
  flex: 1;
`;

const CurrencySelector = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  align-self: flex-start;
`;

const ColorGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ColorOption = styled(TouchableOpacity)<{ color: string; selected: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ color }: { color: string }) => color};
  border-width: ${({ selected }: { selected: boolean }) => (selected ? 3 : 2)}px;
  border-color: ${({ selected, theme }: { selected: boolean; theme: Theme }) => (selected ? theme.colors.primary : theme.colors.border)};
`;

const colorOptions = [
  '#5e1d31', '#8B4513', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export default function MoodBoardCreateScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  const userId = user?.id;
  const createEntry = useCreateMoodBoardEntry(userId || '');

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
    }
  }, [isAuthenticated]);

  const [name, setName] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [stylistPrice, setStylistPrice] = useState('');
  const [hairPrice, setHairPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [location, setLocation] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [monthColor, setMonthColor] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleImageSelected = (uri: string) => {
    if (currentPhotoIndex !== null && currentPhotoIndex < photos.length) {
      const newPhotos = [...photos];
      newPhotos[currentPhotoIndex] = uri;
      setPhotos(newPhotos);
    } else if (photos.length < 3) {
      setPhotos([...photos, uri]);
    }
    setCurrentPhotoIndex(null);
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const handleAddPhoto = (index: number) => {
    setCurrentPhotoIndex(index);
    setIsMediaPickerVisible(true);
  };

  const handleDateChange = (date: Date) => {
    setAppointmentDate(date);
  };

  const handleTimeChange = (date: Date) => {
    setAppointmentTime(date);
  };

  const combineDateTime = (date: Date, time: Date): Date => {
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    return combined;
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !userId) {
      setShowAuthPrompt(true);
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!isRequired(name)) newErrors.name = 'Hairstyle name is required';
    if (photos.length === 0) newErrors.photos = 'At least one photo is required';
    if (!isRequired(stylistPrice)) newErrors.stylistPrice = 'Stylist price is required';
    if (!isRequired(hairPrice)) newErrors.hairPrice = 'Hair price is required';
    if (!isRequired(location)) newErrors.location = 'Location is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const appointmentDateTime = combineDateTime(appointmentDate, appointmentTime);
      const month = format(appointmentDateTime, 'yyyy-MM');

      await createEntry.mutateAsync({
        userId,
        month,
        name,
        mainPhotoUri: photos[0],
        photos: photos.slice(0, 3),
        stylistPrice: parseFloat(stylistPrice),
        hairPrice: parseFloat(hairPrice),
        stylistLocation: location,
        appointmentTime: appointmentDateTime.toISOString(),
        monthColor,
        notes: notes || undefined,
      });

      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create mood board entry');
    }
  };

  return (
    <Container testID="moodboard-create-screen">
      <TopBar title="New Slay" />
      <ScrollContent>
        <Content bottomInset={insets.bottom}>
          <SectionWrapper>
            <Section>
              <SectionTitle variant="h3" weight="semibold" color={theme.colors.text.high}>
                Style Details
              </SectionTitle>
            <Input
              label="Hairstyle Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Curly Bob with Highlights"
              error={errors.name}
              testID="name-input"
              style={{ marginBottom: theme.spacing[3] }}
            />

            <Text variant="body" weight="medium" color={theme.colors.text.high} style={{ marginBottom: theme.spacing[2] }}>
              Photos (up to 3)
            </Text>
            {photos.length === 0 ? (
              <LargePhotoArea onPress={() => handleAddPhoto(0)} activeOpacity={0.7}>
                <ImageIcon size={48} color={theme.colors.text.medium} strokeWidth={2} />
                <Text variant="body" weight="medium" color={theme.colors.text.medium} style={{ marginTop: theme.spacing[2] }}>
                  Tap to add photos
                </Text>
              </LargePhotoArea>
            ) : (
              <PhotoGrid>
                {[0, 1, 2].map((index) => (
                  <PhotoItem key={index}>
                    {photos[index] ? (
                      <View style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <PhotoPreview
                          source={{ uri: photos[index] }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <RemovePhotoButton onPress={() => handleRemovePhoto(index)} activeOpacity={0.7}>
                          <X size={16} color="#fff" strokeWidth={2.5} />
                        </RemovePhotoButton>
                      </View>
                    ) : photos.length < 3 ? (
                      <AddPhotoButton onPress={() => handleAddPhoto(index)} activeOpacity={0.7}>
                        <Plus size={32} color={theme.colors.text.medium} strokeWidth={2} />
                      </AddPhotoButton>
                    ) : null}
                  </PhotoItem>
                ))}
              </PhotoGrid>
            )}
            {errors.photos && (
              <Text variant="caption" color={theme.colors.error} style={{ marginTop: -theme.spacing[1] }}>
                {errors.photos}
              </Text>
            )}
            </Section>
          </SectionWrapper>

          <SectionWrapper>
            <Section>
              <SectionTitle variant="h3" weight="semibold" color={theme.colors.text.high}>
                Pricing
              </SectionTitle>
            <CurrencySelector onPress={() => setShowCurrencyPicker(!showCurrencyPicker)} activeOpacity={0.7}>
              <DollarSign size={18} color={theme.colors.text.high} strokeWidth={2} />
              <Text variant="body" weight="medium" color={theme.colors.text.high}>
                {currency}
              </Text>
            </CurrencySelector>
            {showCurrencyPicker && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
                {currencies.map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    onPress={() => {
                      setCurrency(curr);
                      setShowCurrencyPicker(false);
                    }}
                    style={{
                      paddingHorizontal: theme.spacing[3],
                      paddingVertical: theme.spacing[2],
                      backgroundColor: currency === curr ? theme.colors.primary : theme.colors.surfaceVariant,
                      borderRadius: theme.radii.small,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text variant="caption" weight="medium" color={currency === curr ? '#fff' : theme.colors.text.high}>
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <PriceRow>
              <PriceInputContainer>
                <Input
                  label={`Stylist Price (${currency})`}
                  value={stylistPrice}
                  onChangeText={setStylistPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={errors.stylistPrice}
                  testID="stylist-price-input"
                />
              </PriceInputContainer>
              <PriceInputContainer>
                <Input
                  label={`Hair Price (${currency})`}
                  value={hairPrice}
                  onChangeText={setHairPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  error={errors.hairPrice}
                  testID="hair-price-input"
                />
              </PriceInputContainer>
            </PriceRow>
            </Section>
          </SectionWrapper>

          <SectionWrapper>
            <Section>
              <SectionTitle variant="h3" weight="semibold" color={theme.colors.text.high}>
                Appointment
              </SectionTitle>
            <Input
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Downtown Salon, NYC"
              error={errors.location}
              testID="location-input"
              style={{ marginBottom: theme.spacing[3] }}
            />

            <Text variant="body" weight="medium" color={theme.colors.text.high} style={{ marginBottom: theme.spacing[2] }}>
              Date
            </Text>
            <PickerButton onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                <CalendarIcon size={20} color={theme.colors.text.high} strokeWidth={2} />
                <Text variant="body" color={theme.colors.text.high}>
                  {format(appointmentDate, 'MMMM d, yyyy')}
                </Text>
              </View>
            </PickerButton>

            <DatePickerModal
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              value={appointmentDate}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />

            <Text variant="body" weight="medium" color={theme.colors.text.high} style={{ marginBottom: theme.spacing[2], marginTop: theme.spacing[3] }}>
              Time
            </Text>
            <PickerButton onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                <Clock size={20} color={theme.colors.text.high} strokeWidth={2} />
                <Text variant="body" color={theme.colors.text.high}>
                  {format(appointmentTime, 'h:mm a')}
                </Text>
              </View>
            </PickerButton>

            <TimePicker
              visible={showTimePicker}
              onClose={() => setShowTimePicker(false)}
              value={appointmentTime}
              onChange={handleTimeChange}
            />
            </Section>
          </SectionWrapper>

          <SectionWrapper>
            <Section>
              <SectionTitle variant="h3" weight="semibold" color={theme.colors.text.high}>
                Customization
              </SectionTitle>
            <Text variant="body" weight="medium" color={theme.colors.text.high} style={{ marginBottom: theme.spacing[2] }}>
              Theme Color (Optional)
            </Text>
            <PickerButton onPress={() => setIsColorPickerVisible(true)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                {monthColor ? (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: monthColor }} />
                ) : (
                  <Palette size={20} color={theme.colors.text.medium} strokeWidth={2} />
                )}
                <Text variant="body" color={monthColor ? theme.colors.text.high : theme.colors.text.medium}>
                  {monthColor ? 'Color Selected' : 'Select Color'}
                </Text>
              </View>
            </PickerButton>

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add your notes here..."
              multiline
              numberOfLines={4}
              testID="notes-input"
              style={{ marginTop: theme.spacing[3] }}
            />
            </Section>
          </SectionWrapper>

          <TextLink
            onPress={handleSubmit}
            activeOpacity={0.6}
            disabled={createEntry.isPending}
            testID="save-button"
          >
            <Text variant="body" weight="medium" color={theme.colors.primary}>
              {createEntry.isPending ? 'Creating...' : 'Create Slay'}
            </Text>
          </TextLink>
        </Content>
      </ScrollContent>

      <MediaPicker
        visible={isMediaPickerVisible}
        onClose={() => {
          setIsMediaPickerVisible(false);
          setCurrentPhotoIndex(null);
        }}
        onImageSelected={handleImageSelected}
        testID="photo-media-picker"
      />

      {/* Color Picker Modal */}
      {isColorPickerVisible && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radii.large,
            borderTopRightRadius: theme.radii.large,
            padding: theme.spacing[4],
          }}>
            <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[4] }}>
              Select Theme Color
            </Text>
            <ColorGrid>
              {colorOptions.map((color) => (
                <ColorOption
                  key={color}
                  color={color}
                  selected={monthColor === color}
                  onPress={() => {
                    setMonthColor(color);
                    setIsColorPickerVisible(false);
                  }}
                  activeOpacity={0.7}
                />
              ))}
            </ColorGrid>
            <TouchableOpacity
              onPress={() => setIsColorPickerVisible(false)}
              style={{ marginTop: theme.spacing[3], padding: theme.spacing[3], alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text variant="body" weight="medium" color={theme.colors.text.medium}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => {
          setShowAuthPrompt(false);
        }}
        feature="moodboard"
      />
    </Container>
  );
}
