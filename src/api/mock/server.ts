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
} from './data';
import { User, HairProfile } from '@/types/user';
import { Goal, ProgressPhoto, Activity, Routine, ScheduledRoutine, MonthlyHairstyle } from '@/types/planner';
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
};

