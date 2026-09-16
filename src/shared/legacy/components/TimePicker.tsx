import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Button } from '@/shared/legacy/ui/Button';
import { Text } from '@/shared/legacy/ui/Text';
import { Card } from '@/shared/legacy/ui/Card';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';
import Svg, { Circle, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CLOCK_SIZE = Math.min(SCREEN_WIDTH - 80, 280);
const CLOCK_RADIUS = CLOCK_SIZE / 2;
const CENTER_X = CLOCK_RADIUS;
const CENTER_Y = CLOCK_RADIUS;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled(Card)`
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  max-height: 70%;
`;

const ClockContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px 0;
`;

const ClockFace = styled.View`
  width: ${CLOCK_SIZE}px;
  height: ${CLOCK_SIZE}px;
  border-radius: ${CLOCK_RADIUS}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  position: relative;
  align-items: center;
  justify-content: center;
`;

// Helper function to get mark coordinates
const getMarkCoordinates = (angle: number, radius: number, length: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x1 = CENTER_X + radius * Math.cos(rad);
  const y1 = CENTER_Y + radius * Math.sin(rad);
  const x2 = CENTER_X + (radius - length) * Math.cos(rad);
  const y2 = CENTER_Y + (radius - length) * Math.sin(rad);
  return { x1, y1, x2, y2 };
};

const TimeDisplay = styled.View`
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const PeriodSelector = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const PeriodButton = styled(TouchableOpacity)<{ selected: boolean }>`
  flex: 1;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ selected, theme }: { selected: boolean; theme: Theme }) =>
    selected ? theme.colors.primary : theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  align-items: center;
`;

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
}

function getAngleFromTime(hour: number, minute: number, is24Hour: boolean = false): number {
  if (is24Hour) {
    return (hour * 30 + minute * 0.5) % 360;
  }
  // 12-hour format
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return (hour12 * 30 + minute * 0.5) % 360;
}

function getTimeFromAngle(angle: number, isAM: boolean, currentMinute: number): number {
  let hour = Math.round(angle / 30);
  if (hour === 0) hour = 12;
  if (!isAM && hour !== 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  return hour;
}

export function TimePicker({ visible, onClose, value, onChange }: TimePickerProps) {
  const { theme } = useTheme();
  const hour24 = value.getHours();
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const [selectedHour, setSelectedHour] = useState(hour12);
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());
  const [isAM, setIsAM] = useState(hour24 < 12);
  const [isSelectingHour, setIsSelectingHour] = useState(true);

  // Update state when modal opens or value changes
  useEffect(() => {
    if (visible) {
      const hour24 = value.getHours();
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      setSelectedHour(hour12);
      setSelectedMinute(value.getMinutes());
      setIsAM(hour24 < 12);
      setIsSelectingHour(true);
    }
  }, [visible, value]);

  const handleClockPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const x = locationX - CLOCK_RADIUS;
    const y = locationY - CLOCK_RADIUS;
    const distance = Math.sqrt(x * x + y * y);

    // Only process if touch is within clock radius
    if (distance > CLOCK_RADIUS) return;

    const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    const normalizedAngle = angle < 0 ? angle + 360 : angle;

    if (isSelectingHour) {
      let hour = Math.round(normalizedAngle / 30);
      if (hour === 0) hour = 12;
      if (hour > 12) hour = hour - 12;
      setSelectedHour(hour);
    } else {
      let minute = Math.round(normalizedAngle / 6);
      if (minute === 60) minute = 0;
      setSelectedMinute(minute);
    }
  };

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (!isAM && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (isAM && selectedHour === 12) {
      hour24 = 0;
    }

    const newDate = new Date(value);
    newDate.setHours(hour24);
    newDate.setMinutes(selectedMinute);
    onChange(newDate);
    onClose();
  };

  const hourAngle = getAngleFromTime(selectedHour, 0, false);
  const minuteAngle = getAngleFromTime(12, selectedMinute, false);

  // Generate hour marks
  const hourMarks = Array.from({ length: 12 }, (_, i) => ({
    angle: i * 30,
    isMajor: true,
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <ModalContent>
          <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[4] }}>
            Select Time
          </Text>

          <View
            style={{ flexDirection: 'row', gap: theme.spacing[3], marginBottom: theme.spacing[3] }}
          >
            <TouchableOpacity
              onPress={() => setIsSelectingHour(true)}
              style={{
                flex: 1,
                padding: theme.spacing[2],
                backgroundColor: isSelectingHour
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant,
                borderRadius: theme.radii.medium,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                variant="body"
                weight="medium"
                color={isSelectingHour ? '#fff' : theme.colors.text.high}
              >
                Hour
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSelectingHour(false)}
              style={{
                flex: 1,
                padding: theme.spacing[2],
                backgroundColor: !isSelectingHour
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant,
                borderRadius: theme.radii.medium,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                variant="body"
                weight="medium"
                color={!isSelectingHour ? '#fff' : theme.colors.text.high}
              >
                Minute
              </Text>
            </TouchableOpacity>
          </View>

          <ClockContainer>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={handleClockPress}
                activeOpacity={1}
                style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}
              >
                <ClockFace>
                  <Svg width={CLOCK_SIZE} height={CLOCK_SIZE} style={{ position: 'absolute' }}>
                    {/* Hour marks */}
                    {hourMarks.map((mark, i) => {
                      const coords = getMarkCoordinates(
                        mark.angle,
                        CLOCK_RADIUS - 8,
                        mark.isMajor ? 12 : 6
                      );
                      return (
                        <Line
                          key={`hour-${i}`}
                          x1={coords.x1}
                          y1={coords.y1}
                          x2={coords.x2}
                          y2={coords.y2}
                          stroke={theme.colors.text.medium}
                          strokeWidth={mark.isMajor ? 2 : 1}
                          strokeLinecap="round"
                        />
                      );
                    })}
                    {/* Hour hand */}
                    {isSelectingHour && (
                      <Line
                        x1={CENTER_X}
                        y1={CENTER_Y}
                        x2={CENTER_X}
                        y2={CENTER_Y - CLOCK_RADIUS + 40}
                        stroke={theme.colors.primary}
                        strokeWidth={4}
                        strokeLinecap="round"
                        transform={`rotate(${hourAngle} ${CENTER_X} ${CENTER_Y})`}
                      />
                    )}
                    {/* Minute hand */}
                    {!isSelectingHour && (
                      <Line
                        x1={CENTER_X}
                        y1={CENTER_Y}
                        x2={CENTER_X}
                        y2={CENTER_Y - CLOCK_RADIUS + 20}
                        stroke={theme.colors.primary}
                        strokeWidth={3}
                        strokeLinecap="round"
                        transform={`rotate(${minuteAngle} ${CENTER_X} ${CENTER_Y})`}
                      />
                    )}
                    {/* Center dot */}
                    <Circle cx={CENTER_X} cy={CENTER_Y} r={6} fill={theme.colors.primary} />
                  </Svg>
                </ClockFace>
              </TouchableOpacity>
            </View>
          </ClockContainer>

          <TimeDisplay>
            <Text variant="h1" weight="bold" color={theme.colors.text.high}>
              {selectedHour.toString().padStart(2, '0')}:
              {selectedMinute.toString().padStart(2, '0')}
            </Text>
          </TimeDisplay>

          <PeriodSelector>
            <PeriodButton selected={isAM} onPress={() => setIsAM(true)} activeOpacity={0.7}>
              <Text variant="body" weight="medium" color={isAM ? '#fff' : theme.colors.text.high}>
                AM
              </Text>
            </PeriodButton>
            <PeriodButton selected={!isAM} onPress={() => setIsAM(false)} activeOpacity={0.7}>
              <Text variant="body" weight="medium" color={!isAM ? '#fff' : theme.colors.text.high}>
                PM
              </Text>
            </PeriodButton>
          </PeriodSelector>

          <View
            style={{ flexDirection: 'row', gap: theme.spacing[2], marginTop: theme.spacing[4] }}
          >
            <Button variant="secondary" onPress={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button variant="primary" onPress={handleConfirm} style={{ flex: 1 }}>
              Confirm
            </Button>
          </View>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}
