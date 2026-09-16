import { Share, Alert } from 'react-native';
import { generateMoodBoardDeepLink, generateTreatmentDeepLink } from './deepLinks';
import { MoodBoardEntry } from '@/features/planner';
import { Treatment } from '@/features/planner';
import { format } from 'date-fns';

/**
 * Share a moodboard entry with deep link and metadata
 */
export async function shareMoodBoardEntry(entry: MoodBoardEntry): Promise<void> {
  try {
    const deepLink = generateMoodBoardDeepLink(entry);
    const appointmentDate = format(new Date(entry.appointmentTime), 'MMM d, yyyy h:mm a');
    
    // Create share message with metadata (no photos)
    const shareMessage = `Check out my mood board entry: ${entry.name}\n\n` +
      `📍 Location: ${entry.stylistLocation}\n` +
      `📅 Appointment: ${appointmentDate}\n` +
      `💰 Stylist: $${entry.stylistPrice}\n` +
      `💇 Hair: $${entry.hairPrice}\n\n` +
      `View in Yasante: ${deepLink}`;
    
    const result = await Share.share({
      message: shareMessage,
      url: deepLink, // Some platforms may use this
    });
    
    if (result.action === Share.sharedAction) {
      // Successfully shared
      console.log('Moodboard entry shared successfully');
    } else if (result.action === Share.dismissedAction) {
      // User dismissed share sheet
      console.log('Share dismissed');
    }
  } catch (error) {
    console.error('Error sharing moodboard entry:', error);
    Alert.alert('Error', 'Failed to share moodboard entry. Please try again.');
  }
}

/**
 * Share a treatment with deep link and metadata
 */
export async function shareTreatment(treatment: Treatment): Promise<void> {
  try {
    const deepLink = generateTreatmentDeepLink(treatment);
    
    // Format frequency for display
    const frequencyMap: Record<string, string> = {
      'daily': 'Daily',
      'every-2-days': 'Every 2 Days',
      'weekly': 'Weekly',
      'specific-days': 'Specific Days',
      'custom': treatment.customFrequency || 'Custom',
    };
    
    const timeOfDayMap: Record<string, string> = {
      'morning': 'Morning',
      'afternoon': 'Afternoon',
      'evening': 'Evening',
      'night': 'Night',
    };
    
    const frequencyText = frequencyMap[treatment.frequency] || treatment.frequency;
    const timeOfDayText = timeOfDayMap[treatment.timeOfDay] || treatment.timeOfDay;
    const durationText = treatment.duration ? `${treatment.duration} minutes` : 'Not specified';
    
    // Create share message with metadata
    let shareMessage = `Check out my hair treatment: ${treatment.name}\n\n` +
      `⏰ Frequency: ${frequencyText}\n` +
      `🕐 Time: ${timeOfDayText}\n` +
      `⏱️ Duration: ${durationText}\n`;
    
    if (treatment.startDate) {
      const startDate = format(new Date(treatment.startDate), 'MMM d, yyyy');
      shareMessage += `📅 Start Date: ${startDate}\n`;
    }
    
    if (treatment.notes) {
      shareMessage += `\n📝 Notes: ${treatment.notes}\n`;
    }
    
    shareMessage += `\nView in Yasante: ${deepLink}`;
    
    const result = await Share.share({
      message: shareMessage,
      url: deepLink, // Some platforms may use this
    });
    
    if (result.action === Share.sharedAction) {
      // Successfully shared
      console.log('Treatment shared successfully');
    } else if (result.action === Share.dismissedAction) {
      // User dismissed share sheet
      console.log('Share dismissed');
    }
  } catch (error) {
    console.error('Error sharing treatment:', error);
    Alert.alert('Error', 'Failed to share treatment. Please try again.');
  }
}

