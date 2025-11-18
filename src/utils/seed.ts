import { seedData } from '@/api/mock/server';

/**
 * Seed mock data for development
 * Call this in dev mode to reset all mock data
 */
export function seedMockData() {
  if (__DEV__) {
    console.log('🌱 Seeding mock data...');
    seedData();
    console.log('✅ Mock data seeded successfully');
  }
}

