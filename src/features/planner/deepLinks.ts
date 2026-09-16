import { MoodBoardEntry } from '@/features/planner';
import { Treatment } from '@/features/planner';

/**
 * Generate a deep link for a moodboard entry
 * Format: yasante://moodboard/{entryId}?name={name}&location={location}&appointmentTime={time}&stylistPrice={price}&hairPrice={price}
 */
export function generateMoodBoardDeepLink(entry: MoodBoardEntry): string {
  const baseUrl = 'yasante://moodboard';
  const params = new URLSearchParams();

  // Add metadata (no photos)
  params.append('name', entry.name);
  params.append('location', entry.stylistLocation);
  params.append('appointmentTime', entry.appointmentTime);
  params.append('stylistPrice', entry.stylistPrice.toString());
  params.append('hairPrice', entry.hairPrice.toString());

  if (entry.monthColor) {
    params.append('monthColor', entry.monthColor);
  }

  if (entry.notes) {
    params.append('notes', entry.notes);
  }

  return `${baseUrl}/${entry.id}?${params.toString()}`;
}

/**
 * Generate a deep link for a treatment
 * Format: yasante://treatment/{treatmentId}?name={name}&frequency={frequency}&timeOfDay={timeOfDay}&duration={duration}&notes={notes}
 */
export function generateTreatmentDeepLink(treatment: Treatment): string {
  const baseUrl = 'yasante://treatment';
  const params = new URLSearchParams();

  // Add metadata
  params.append('name', treatment.name);
  params.append('frequency', treatment.frequency);
  params.append('timeOfDay', treatment.timeOfDay);

  if (treatment.duration) {
    params.append('duration', treatment.duration.toString());
  }

  if (treatment.startDate) {
    params.append('startDate', treatment.startDate);
  }

  if (treatment.endDate) {
    params.append('endDate', treatment.endDate);
  }

  if (treatment.notes) {
    params.append('notes', treatment.notes);
  }

  return `${baseUrl}/${treatment.id}?${params.toString()}`;
}

/**
 * Parse a moodboard deep link URL
 */
export function parseMoodBoardDeepLink(
  url: string
): { entryId: string; params: Record<string, string> } | null {
  try {
    const match = url.match(/yasante:\/\/moodboard\/([^?]+)(?:\?(.+))?/);
    if (!match) return null;

    const entryId = match[1];
    const queryString = match[2] || '';
    const params: Record<string, string> = {};

    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return { entryId, params };
  } catch (error) {
    console.error('Error parsing moodboard deep link:', error);
    return null;
  }
}

/**
 * Parse a treatment deep link URL
 */
export function parseTreatmentDeepLink(
  url: string
): { treatmentId: string; params: Record<string, string> } | null {
  try {
    const match = url.match(/yasante:\/\/treatment\/([^?]+)(?:\?(.+))?/);
    if (!match) return null;

    const treatmentId = match[1];
    const queryString = match[2] || '';
    const params: Record<string, string> = {};

    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return { treatmentId, params };
  } catch (error) {
    console.error('Error parsing treatment deep link:', error);
    return null;
  }
}
