export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
  completedAt?: string;
}

export interface ProgressEntry {
  id: string;
  goalId: string;
  userId: string;
  date: string;
  photoUri?: string;
  notes?: string;
  activities: string[];
  createdAt: string;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule: RoutineSchedule[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineSchedule {
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  time: string; // HH:mm format
  activity: string;
  reminderEnabled: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  date: string;
  activityType: string;
  description?: string;
  createdAt: string;
}










