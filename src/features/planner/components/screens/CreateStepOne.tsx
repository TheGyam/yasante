import React from 'react';
import { View, TouchableOpacity, TextInput, Switch, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
} from 'lucide-react-native';
import { Text } from '@/shared/legacy/ui/Text';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { BrutalistInput } from '../ui/BrutalistInput';

interface CreateStepOneProps {
  name: string;
  setName: (v: string) => void;
  isSecret: boolean;
  setIsSecret: (v: boolean) => void;
  showAppointment: boolean;
  setShowAppointment: (v: boolean) => void;
  location: string;
  setLocation: (v: string) => void;
  stylistName: string;
  setStylistName: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  formattedDate: string;
  formattedTime: string;
}

export function CreateStepOne({
  name,
  setName,
  isSecret,
  setIsSecret,
  showAppointment,
  setShowAppointment,
  location,
  setLocation,
  stylistName,
  setStylistName,
  notes,
  setNotes,
  onOpenDatePicker,
  onOpenTimePicker,
  formattedDate,
  formattedTime,
}: CreateStepOneProps) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Board Name */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={{ position: 'relative', marginBottom: 32 }}>
            <View
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                right: -4,
                bottom: -4,
                backgroundColor: theme.colors.primary,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: theme.colors.text.high,
              }}
            />
            <View
              style={{
                borderWidth: 2,
                borderColor: theme.colors.text.high,
                borderRadius: 20,
                padding: 20,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text
                variant="caption"
                weight="bold"
                color={theme.colors.text.high}
                style={{
                  marginBottom: 8,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                BOARD NAME
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name your board"
                placeholderTextColor={theme.colors.primary}
                style={{
                  fontSize: 18,
                  color: theme.colors.text.high,
                  fontWeight: '700',
                  fontStyle: 'italic',
                  padding: 0,
                }}
                autoFocus
                testID="board-name-input"
              />
            </View>
          </View>
        </Animated.View>

        {/* Secret Toggle */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsSecret(!isSecret)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 20,
              borderBottomWidth: 2,
              borderBottomColor: theme.colors.text.high,
            }}
          >
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text
                variant="body"
                weight="bold"
                color={theme.colors.text.high}
                style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}
              >
                Make this board secret
              </Text>
              <Text
                variant="caption"
                weight="bold"
                color={theme.colors.primary}
                style={{ marginTop: 4, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}
              >
                ONLY YOU AND COLLABORATORS SEE IT
              </Text>
            </View>
            <Switch
              value={isSecret}
              onValueChange={setIsSecret}
              trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              ios_backgroundColor={theme.colors.background}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Appointment Toggle */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowAppointment(!showAppointment)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 20,
              borderBottomWidth: showAppointment ? 0 : 2,
              borderBottomColor: theme.colors.text.high,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                variant="body"
                weight="bold"
                color={theme.colors.text.high}
                style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}
              >
                Salon Appointment
              </Text>
              <Text
                variant="caption"
                weight="bold"
                color={theme.colors.primary}
                style={{ marginTop: 4, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}
              >
                LINK A DATE TO THIS BOARD
              </Text>
            </View>
            {showAppointment ? (
              <ChevronUp size={20} color={theme.colors.text.high} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={20} color={theme.colors.text.high} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Appointment Editor */}
        {showAppointment && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View
              style={{
                paddingVertical: 16,
                borderBottomWidth: 2,
                borderBottomColor: theme.colors.text.high,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={onOpenDatePicker}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: theme.colors.surface,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: theme.colors.text.high,
                  }}
                >
                  <CalendarIcon size={18} color={theme.colors.primary} strokeWidth={2} />
                  <Text
                    variant="body"
                    weight="bold"
                    color={theme.colors.text.high}
                    style={{ fontSize: 14 }}
                  >
                    {formattedDate}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onOpenTimePicker}
                  style={{
                    flex: 0.8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: theme.colors.surface,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: theme.colors.text.high,
                  }}
                >
                  <Clock size={18} color={theme.colors.primary} strokeWidth={2} />
                  <Text
                    variant="body"
                    weight="bold"
                    color={theme.colors.text.high}
                    style={{ fontSize: 14 }}
                  >
                    {formattedTime}
                  </Text>
                </TouchableOpacity>
              </View>

              <BrutalistInput
                icon={<MapPin size={18} color={theme.colors.primary} />}
                placeholder="Salon Location (Optional)"
                value={location}
                onChangeText={setLocation}
              />
              <BrutalistInput
                icon={<User size={18} color={theme.colors.primary} />}
                placeholder="Stylist Name (Optional)"
                value={stylistName}
                onChangeText={setStylistName}
              />
              <BrutalistInput
                icon={<Clock size={18} color={theme.colors.primary} />}
                placeholder="Notes for stylist (Optional)"
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </Animated.View>
        )}

        {/* Collaborators (placeholder) */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                variant="body"
                weight="bold"
                color={theme.colors.text.high}
                style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}
              >
                Group Board
              </Text>
              <Text
                variant="caption"
                weight="bold"
                color={theme.colors.primary}
                style={{ marginTop: 4, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}
              >
                INVITE COLLABORATORS
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: theme.colors.surface,
                borderWidth: 2,
                borderColor: theme.colors.text.high,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={18} color={theme.colors.primary} strokeWidth={2} />
              <View
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: theme.colors.accent,
                  borderWidth: 2,
                  borderColor: theme.colors.text.high,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={10} color={theme.colors.surface} strokeWidth={3} />
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 250 }} />
      </ScrollView>
    </Animated.View>
  );
}
