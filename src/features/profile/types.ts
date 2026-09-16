export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily' | 'kinky';
export type HairDensity = 'fine' | 'medium' | 'thick';
export type HairPorosity = 'low' | 'medium' | 'high';
export type HairGoal = 'growth' | 'health' | 'moisture' | 'strength' | 'color' | 'style';

export interface HairProfile {
  texture?: HairTexture;
  density?: HairDensity;
  porosity?: HairPorosity;
  goals?: HairGoal[];
  photoUri?: string;
  completedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUri?: string;
  hairProfile?: HairProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    routineReminders: boolean;
    goalReminders: boolean;
  };
  language: string;
  accessibility: {
    reduceMotion: boolean;
    fontSize: 'default' | 'large' | 'extraLarge';
  };
}

