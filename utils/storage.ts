import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom storage adapter that ensures proper type handling
// Zustand's persist middleware handles JSON serialization, so we just need to fix booleans
export const createSafeStorage = () => {
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const value = await AsyncStorage.getItem(name);
        if (!value) return null;
        
        try {
          // Parse the JSON string from Zustand
          const parsed = JSON.parse(value);
          // Fix boolean values recursively
          const fixed = fixBooleans(parsed);
          // Return as JSON string for Zustand to parse again
          return JSON.stringify(fixed);
        } catch (parseError) {
          // If it's not valid JSON, return as-is
          return value;
        }
      } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        await AsyncStorage.setItem(name, value);
      } catch (error) {
        console.error('Error writing to storage:', error);
      }
    },
    removeItem: async (name: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(name);
      } catch (error) {
        console.error('Error removing from storage:', error);
      }
    },
  };
};

// Recursively fix boolean values in objects
function fixBooleans(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(fixBooleans);
  }
  
  if (typeof obj === 'object') {
    const fixed: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        // Check if this is a known boolean field
        if (
          key === 'isAuthenticated' ||
          key === 'completed' ||
          key === 'enabled' ||
          key === 'reminderEnabled'
        ) {
          // Convert string "true"/"false" to actual boolean
          if (value === 'true' || value === true) {
            fixed[key] = true;
          } else if (value === 'false' || value === false) {
            fixed[key] = false;
          } else {
            fixed[key] = Boolean(value);
          }
        } else if (key === 'schedule' && Array.isArray(value)) {
          // Handle schedule array with reminderEnabled
          fixed[key] = value.map((item: any) => ({
            ...item,
            reminderEnabled: item.reminderEnabled === 'true' || item.reminderEnabled === true,
          }));
        } else {
          fixed[key] = fixBooleans(value);
        }
      }
    }
    return fixed;
  }
  
  return obj;
}

