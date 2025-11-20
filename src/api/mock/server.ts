import {
  mockUser,
  mockGoals,
  mockProgressPhotos,
  mockActivities,
  mockRoutines,
  mockScheduledRoutines,
  mockContent,
  mockProducts,
  mockFavorites,
  mockMonthlyHairstyles,
  mockMoodBoardEntries,
  mockTreatments,
} from './data';
import { User, HairProfile } from '@/types/user';
import { Goal, ProgressPhoto, Activity, Routine, ScheduledRoutine, MonthlyHairstyle, MoodBoardEntry, Treatment } from '@/types/planner';
import { Content, ProductRecommendation, Favorite } from '@/types/education';
import { ApiResponse, PaginatedResponse } from '@/types/api';

// Simple in-memory storage (simulates database)
let users: User[] = [mockUser];
let goals: Goal[] = [...mockGoals];
let photos: ProgressPhoto[] = [...mockProgressPhotos];
let activities: Activity[] = [...mockActivities];
let routines: Routine[] = [...mockRoutines];
let scheduledRoutines: ScheduledRoutine[] = [...mockScheduledRoutines];
// Force fresh copy of mockContent to ensure latest data
let content: Content[] = JSON.parse(JSON.stringify(mockContent));
let products: ProductRecommendation[] = [...mockProducts];
let favorites: Favorite[] = [...mockFavorites];
let monthlyHairstyles: MonthlyHairstyle[] = [...mockMonthlyHairstyles];
let moodBoardEntries: MoodBoardEntry[] = [...mockMoodBoardEntries];
let treatments: Treatment[] = [...mockTreatments];

// Simulate network delay
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// User API
export const userApi = {
  getProfile: async (userId: string): Promise<ApiResponse<User>> => {
    await delay();
    const user = users.find((u) => u.id === userId) || mockUser;
    return { data: user };
  },

  updateProfile: async (userId: string, updates: Partial<User>): Promise<ApiResponse<User>> => {
    await delay();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() };
      return { data: users[userIndex] };
    }
    return { data: mockUser };
  },

  updateHairProfile: async (
    userId: string,
    hairProfile: HairProfile
  ): Promise<ApiResponse<User>> => {
    await delay();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex >= 0) {
      users[userIndex] = {
        ...users[userIndex],
        hairProfile: { ...users[userIndex].hairProfile, ...hairProfile },
        updatedAt: new Date().toISOString(),
      };
      return { data: users[userIndex] };
    }
    return { data: mockUser };
  },
};

// Goals API
export const goalsApi = {
  getAll: async (userId: string): Promise<ApiResponse<Goal[]>> => {
    await delay();
    const userGoals = goals.filter((g) => g.userId === userId);
    return { data: userGoals };
  },

  getById: async (goalId: string): Promise<ApiResponse<Goal>> => {
    await delay();
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) throw new Error('Goal not found');
    return { data: goal };
  },

  create: async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Goal>> => {
    await delay();
    const newGoal: Goal = {
      ...goal,
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    goals.push(newGoal);
    return { data: newGoal };
  },

  update: async (goalId: string, updates: Partial<Goal>): Promise<ApiResponse<Goal>> => {
    await delay();
    const goalIndex = goals.findIndex((g) => g.id === goalId);
    if (goalIndex >= 0) {
      goals[goalIndex] = { ...goals[goalIndex], ...updates, updatedAt: new Date().toISOString() };
      return { data: goals[goalIndex] };
    }
    throw new Error('Goal not found');
  },

  delete: async (goalId: string): Promise<ApiResponse<void>> => {
    await delay();
    goals = goals.filter((g) => g.id !== goalId);
    return { data: undefined };
  },
};

// Photos API
export const photosApi = {
  getByGoal: async (goalId: string): Promise<ApiResponse<ProgressPhoto[]>> => {
    await delay();
    const goalPhotos = photos.filter((p) => p.goalId === goalId);
    return { data: goalPhotos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
  },

  upload: async (photo: Omit<ProgressPhoto, 'id' | 'createdAt'>): Promise<ApiResponse<ProgressPhoto>> => {
    await delay();
    const newPhoto: ProgressPhoto = {
      ...photo,
      id: `photo-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    photos.push(newPhoto);
    return { data: newPhoto };
  },

  delete: async (photoId: string): Promise<ApiResponse<void>> => {
    await delay();
    photos = photos.filter((p) => p.id !== photoId);
    return { data: undefined };
  },
};

// Activities API
export const activitiesApi = {
  getByGoal: async (goalId: string): Promise<ApiResponse<Activity[]>> => {
    await delay();
    const goalActivities = activities.filter((a) => a.goalId === goalId);
    return { data: goalActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
  },

  create: async (activity: Omit<Activity, 'id' | 'createdAt'>): Promise<ApiResponse<Activity>> => {
    await delay();
    const newActivity: Activity = {
      ...activity,
      id: `activity-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    activities.push(newActivity);
    return { data: newActivity };
  },
};

// Routines API
export const routinesApi = {
  getAll: async (userId: string): Promise<ApiResponse<Routine[]>> => {
    await delay();
    const userRoutines = routines.filter((r) => r.userId === userId);
    return { data: userRoutines };
  },

  getById: async (routineId: string): Promise<ApiResponse<Routine>> => {
    await delay();
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) throw new Error('Routine not found');
    return { data: routine };
  },

  create: async (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Routine>> => {
    await delay();
    const newRoutine: Routine = {
      ...routine,
      id: `routine-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    routines.push(newRoutine);
    return { data: newRoutine };
  },

  update: async (routineId: string, updates: Partial<Routine>): Promise<ApiResponse<Routine>> => {
    await delay();
    const routineIndex = routines.findIndex((r) => r.id === routineId);
    if (routineIndex >= 0) {
      routines[routineIndex] = {
        ...routines[routineIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { data: routines[routineIndex] };
    }
    throw new Error('Routine not found');
  },

  delete: async (routineId: string): Promise<ApiResponse<void>> => {
    await delay();
    routines = routines.filter((r) => r.id !== routineId);
    return { data: undefined };
  },
};

// Content API
export const contentApi = {
  getAll: async (filters?: {
    hairType?: string;
    topic?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Content>> => {
    await delay();
    let filtered = [...content];

    if (filters?.hairType) {
      filtered = filtered.filter((c) => c.hairTypes.includes(filters.hairType!));
    }
    if (filters?.topic) {
      filtered = filtered.filter((c) => c.topic === filters.topic);
    }
    if (filters?.type) {
      filtered = filtered.filter((c) => c.type === filters.type);
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filtered.slice(start, end),
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  },

  getById: async (contentId: string): Promise<ApiResponse<Content>> => {
    await delay();
    const item = content.find((c) => c.id === contentId);
    if (!item) throw new Error('Content not found');
    return { data: item };
  },

  search: async (query: string): Promise<ApiResponse<Content[]>> => {
    await delay();
    const lowerQuery = query.toLowerCase();
    const results = content.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery)
    );
    return { data: results };
  },
};

// Favorites API
export const favoritesApi = {
  getAll: async (userId: string): Promise<ApiResponse<Favorite[]>> => {
    await delay();
    const userFavorites = favorites.filter((f) => f.userId === userId);
    return { data: userFavorites };
  },

  toggle: async (userId: string, contentId: string): Promise<ApiResponse<{ isFavorite: boolean }>> => {
    await delay();
    const existing = favorites.find((f) => f.userId === userId && f.contentId === contentId);
    if (existing) {
      favorites = favorites.filter((f) => f.id !== existing.id);
      return { data: { isFavorite: false } };
    } else {
      const newFavorite: Favorite = {
        id: `favorite-${Date.now()}`,
        userId,
        contentId,
        createdAt: new Date().toISOString(),
      };
      favorites.push(newFavorite);
      return { data: { isFavorite: true } };
    }
  },

  isFavorite: async (userId: string, contentId: string): Promise<ApiResponse<boolean>> => {
    await delay();
    const isFav = favorites.some((f) => f.userId === userId && f.contentId === contentId);
    return { data: isFav };
  },
};

// Products API
export const productsApi = {
  getByContent: async (contentId: string): Promise<ApiResponse<ProductRecommendation[]>> => {
    await delay();
    // In a real app, this would filter by contentId
    return { data: products };
  },
};

// Monthly Hairstyles API
export const monthlyHairstylesApi = {
  getByMonth: async (userId: string, month: string): Promise<ApiResponse<MonthlyHairstyle[]>> => {
    await delay();
    const monthHairstyles = monthlyHairstyles.filter(
      (h) => h.userId === userId && h.month === month
    );
    return { data: monthHairstyles };
  },

  getById: async (hairstyleId: string): Promise<ApiResponse<MonthlyHairstyle>> => {
    await delay();
    const hairstyle = monthlyHairstyles.find((h) => h.id === hairstyleId);
    if (!hairstyle) throw new Error('Hairstyle not found');
    return { data: hairstyle };
  },

  create: async (
    hairstyle: Omit<MonthlyHairstyle, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<MonthlyHairstyle>> => {
    await delay();
    const newHairstyle: MonthlyHairstyle = {
      ...hairstyle,
      id: `hairstyle-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    monthlyHairstyles.push(newHairstyle);
    return { data: newHairstyle };
  },

  update: async (
    hairstyleId: string,
    updates: Partial<MonthlyHairstyle>
  ): Promise<ApiResponse<MonthlyHairstyle>> => {
    await delay();
    const hairstyleIndex = monthlyHairstyles.findIndex((h) => h.id === hairstyleId);
    if (hairstyleIndex >= 0) {
      monthlyHairstyles[hairstyleIndex] = {
        ...monthlyHairstyles[hairstyleIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { data: monthlyHairstyles[hairstyleIndex] };
    }
    throw new Error('Hairstyle not found');
  },

  delete: async (hairstyleId: string): Promise<ApiResponse<void>> => {
    await delay();
    monthlyHairstyles = monthlyHairstyles.filter((h) => h.id !== hairstyleId);
    return { data: undefined };
  },
};

// Mood Board API
export const moodBoardApi = {
  getAll: async (userId: string, month?: string): Promise<ApiResponse<MoodBoardEntry[]>> => {
    await delay();
    let userEntries = moodBoardEntries.filter((e) => e.userId === userId);
    if (month) {
      userEntries = userEntries.filter((e) => e.month === month);
    }
    return { data: userEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  },

  getById: async (entryId: string): Promise<ApiResponse<MoodBoardEntry>> => {
    await delay();
    const entry = moodBoardEntries.find((e) => e.id === entryId);
    if (!entry) throw new Error('Mood board entry not found');
    return { data: entry };
  },

  create: async (entry: Omit<MoodBoardEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MoodBoardEntry>> => {
    await delay();
    const newEntry: MoodBoardEntry = {
      ...entry,
      id: `moodboard-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    moodBoardEntries.push(newEntry);
    return { data: newEntry };
  },

  update: async (entryId: string, updates: Partial<MoodBoardEntry>): Promise<ApiResponse<MoodBoardEntry>> => {
    await delay();
    const entryIndex = moodBoardEntries.findIndex((e) => e.id === entryId);
    if (entryIndex >= 0) {
      moodBoardEntries[entryIndex] = {
        ...moodBoardEntries[entryIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { data: moodBoardEntries[entryIndex] };
    }
    throw new Error('Mood board entry not found');
  },

  delete: async (entryId: string): Promise<ApiResponse<void>> => {
    await delay();
    moodBoardEntries = moodBoardEntries.filter((e) => e.id !== entryId);
    return { data: undefined };
  },
};

// Treatments API
export const treatmentsApi = {
  getAll: async (userId: string): Promise<ApiResponse<Treatment[]>> => {
    await delay();
    const userTreatments = treatments.filter((t) => t.userId === userId);
    return { data: userTreatments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  },

  getById: async (treatmentId: string): Promise<ApiResponse<Treatment>> => {
    await delay();
    const treatment = treatments.find((t) => t.id === treatmentId);
    if (!treatment) throw new Error('Treatment not found');
    return { data: treatment };
  },

  create: async (treatment: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Treatment>> => {
    await delay();
    const newTreatment: Treatment = {
      ...treatment,
      id: `treatment-${Date.now()}`,
      sessions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    treatments.push(newTreatment);
    return { data: newTreatment };
  },

  update: async (treatmentId: string, updates: Partial<Treatment>): Promise<ApiResponse<Treatment>> => {
    await delay();
    const treatmentIndex = treatments.findIndex((t) => t.id === treatmentId);
    if (treatmentIndex >= 0) {
      treatments[treatmentIndex] = {
        ...treatments[treatmentIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { data: treatments[treatmentIndex] };
    }
    throw new Error('Treatment not found');
  },

  delete: async (treatmentId: string): Promise<ApiResponse<void>> => {
    await delay();
    treatments = treatments.filter((t) => t.id !== treatmentId);
    return { data: undefined };
  },
};

// Auth API - Mock user database with passwords
interface AuthUser {
  id: string;
  email: string;
  password: string; // In real app, this would be hashed
  name: string;
  createdAt: string;
}

// Mock users database (in real app, passwords would be hashed)
let authUsers: AuthUser[] = [
  {
    id: 'user-1',
    email: 'demo@kalon.app',
    password: 'Demo123!@#', // Demo password
    name: 'Demo User',
    createdAt: new Date().toISOString(),
  },
];

// Password reset tokens (in real app, these would be stored securely)
let resetTokens: Map<string, { email: string; expiresAt: number }> = new Map();

// Generate a simple token (in real app, use crypto)
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<{
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }>> => {
    await delay();
    
    const authUser = authUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!authUser || authUser.password !== password) {
      throw new Error('Invalid email or password');
    }

    // Find or create user in users array
    let user = users.find((u) => u.id === authUser.id);
    if (!user) {
      user = {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        createdAt: authUser.createdAt,
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    }

    // Generate tokens (in real app, use JWT)
    const accessToken = generateToken();
    const refreshToken = generateToken();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    return {
      data: {
        user,
        accessToken,
        refreshToken,
        expiresAt,
      },
    };
  },

  signup: async (name: string, email: string, password: string): Promise<ApiResponse<{
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }>> => {
    await delay();

    // Check if user already exists
    if (authUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }

    // Create new user
    const userId = `user-${Date.now()}`;
    const newAuthUser: AuthUser = {
      id: userId,
      email: email.toLowerCase(),
      password, // In real app, hash this
      name,
      createdAt: new Date().toISOString(),
    };
    authUsers.push(newAuthUser);

    const newUser: User = {
      id: userId,
      name,
      email: email.toLowerCase(),
      createdAt: newAuthUser.createdAt,
      updatedAt: newAuthUser.createdAt,
    };
    users.push(newUser);

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    return {
      data: {
        user: newUser,
        accessToken,
        refreshToken,
        expiresAt,
      },
    };
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    await delay();

    const authUser = authUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    // Don't reveal if email exists (security best practice)
    if (authUser) {
      // Generate reset token
      const token = generateToken();
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
      resetTokens.set(token, { email: authUser.email, expiresAt });

      // In real app, send email with reset link
      console.log(`Password reset token for ${email}: ${token}`);
    }

    return {
      data: {
        message: 'If an account exists with this email, a password reset link has been sent.',
      },
    };
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    await delay();

    const resetData = resetTokens.get(token);
    
    if (!resetData || Date.now() > resetData.expiresAt) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    const authUserIndex = authUsers.findIndex((u) => u.email === resetData.email);
    if (authUserIndex >= 0) {
      authUsers[authUserIndex].password = newPassword; // In real app, hash this
    }

    // Remove used token
    resetTokens.delete(token);

    return {
      data: {
        message: 'Password has been reset successfully',
      },
    };
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{
    accessToken: string;
    expiresAt: number;
  }>> => {
    await delay();

    // In real app, validate refresh token
    // For mock, just generate new access token
    const accessToken = generateToken();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    return {
      data: {
        accessToken,
        expiresAt,
      },
    };
  },
};

// Seed function for dev mode
export const seedData = () => {
  users = [mockUser];
  goals = [...mockGoals];
  photos = [...mockProgressPhotos];
  activities = [...mockActivities];
  routines = [...mockRoutines];
  scheduledRoutines = [...mockScheduledRoutines];
  // Force fresh copy to ensure latest mock data
  content = JSON.parse(JSON.stringify(mockContent));
  products = [...mockProducts];
  favorites = [...mockFavorites];
  monthlyHairstyles = [...mockMonthlyHairstyles];
  moodBoardEntries = [...mockMoodBoardEntries];
  treatments = [...mockTreatments];
  
  // Reset auth users
  authUsers = [
    {
      id: 'user-1',
      email: 'demo@kalon.app',
      password: 'Demo123!@#',
      name: 'Demo User',
      createdAt: new Date().toISOString(),
    },
  ];
  resetTokens.clear();
};

