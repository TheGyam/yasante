export interface MoodBoardEntry {
  id: string;
  userId: string;
  month: string; // Format: "YYYY-MM" (e.g., "2024-01")
  name: string; // Board name
  mainPhotoUri: string; // Thumbnail for card
  photos: string[]; // Array of photo URIs (unlimited)
  stylistPrice: number; // Stylist service fee
  hairPrice: number; // Cost of hair extensions/materials
  stylistName?: string; // Name of the stylist
  stylistLocation: string;
  appointmentTime: string; // ISO datetime or time string
  monthColor?: string; // Hex color code for month customization
  notes?: string; // User's additional notes
  completed?: boolean; // Whether the style has been done
  isSecret?: boolean; // Private/secret board
  createdAt: string;
  updatedAt: string;
}

export type TreatmentFrequency = 'daily' | 'every-2-days' | 'weekly' | 'specific-days' | 'custom';
export type TreatmentTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TreatmentSession {
  id: string;
  treatmentId: string;
  scheduledDate: string; // ISO date
  completed: boolean;
  completedAt?: string;
  notes?: string; // Session-specific notes
  createdAt: string;
  updatedAt: string;
}

export interface Treatment {
  id: string;
  userId: string;
  name: string;
  frequency: TreatmentFrequency;
  timeOfDay: TreatmentTimeOfDay;
  startDate: string; // ISO date
  endDate?: string; // ISO date, optional
  numberOfSessions?: number; // Optional, alternative to endDate
  duration?: number; // Minutes per session
  specificDays?: number[]; // For specific-days frequency, 0-6, Sunday=0
  customFrequency?: string; // For custom frequency
  reminderEnabled: boolean;
  reminderTime?: number; // Minutes before scheduled time
  notes?: string;
  sessions?: TreatmentSession[]; // Track completed sessions
  createdAt: string;
  updatedAt: string;
}
