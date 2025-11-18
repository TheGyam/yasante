export type GoalStatus = 'active' | 'completed' | 'archived';
export type ActivityType = 'trim' | 'color' | 'treatment' | 'wash' | 'style' | 'other';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetDate: string;
  successMetric?: string;
  status: GoalStatus;
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface ProgressPhoto {
  id: string;
  goalId: string;
  uri: string;
  thumbnailUri?: string;
  date: string;
  caption?: string;
  location?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  goalId: string;
  type: ActivityType;
  date: string;
  notes?: string;
  createdAt: string;
}

export type RoutineFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface RoutineStep {
  id: string;
  name: string;
  duration: number; // in minutes
  order: number;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: RoutineFrequency;
  steps: RoutineStep[];
  scheduledTime?: string; // HH:mm format
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  reminderEnabled: boolean;
  reminderTime?: number; // minutes before scheduled time
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledRoutine {
  id: string;
  routineId: string;
  scheduledDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface MonthlyHairstyle {
  id: string;
  month: string; // Format: "YYYY-MM" (e.g., "2024-01")
  userId: string;
  photoUri: string;
  thumbnailUri?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyCalendar {
  month: string; // Format: "YYYY-MM"
  year: number;
  monthName: string; // e.g., "January"
  hairstyles: MonthlyHairstyle[];
  goals: Goal[]; // Goals that target this month
}

