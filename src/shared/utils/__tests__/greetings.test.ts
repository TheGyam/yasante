import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNextGreeting, getTimeOfDayPrefix } from '../greetings';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('greetings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNextGreeting', () => {
    it('returns first greeting when no previous index', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const greeting = await getNextGreeting();
      expect(greeting).toBeTruthy();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@yasante:lastGreetingIndex', '0');
    });

    it('rotates to next greeting', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('0');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const greeting = await getNextGreeting();
      expect(greeting).toBeTruthy();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@yasante:lastGreetingIndex', '1');
    });

    it('wraps around to first greeting after last', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('5');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const greeting = await getNextGreeting();
      expect(greeting).toBeTruthy();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@yasante:lastGreetingIndex', '0');
    });

    it('handles storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const greeting = await getNextGreeting();
      expect(greeting).toBeTruthy();
    });
  });

  describe('getTimeOfDayPrefix', () => {
    it('returns morning prefix for early hours', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      expect(getTimeOfDayPrefix()).toBe('Good morning, ');
    });

    it('returns afternoon prefix for midday hours', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      expect(getTimeOfDayPrefix()).toBe('Afternoon, ');
    });

    it('returns evening prefix for late hours', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      expect(getTimeOfDayPrefix()).toBe('Evening, ');
    });
  });
});
