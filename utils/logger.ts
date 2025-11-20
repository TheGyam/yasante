// Comprehensive logging utility
export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) {
      console.log('[LOG]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (__DEV__) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (__DEV__) {
      console.error('[ERROR]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (__DEV__) {
      console.info('[INFO]', ...args);
    }
  },
  debug: (...args: any[]) => {
    if (__DEV__) {
      console.debug('[DEBUG]', ...args);
    }
  },
  // Log prop types for debugging
  logProps: (componentName: string, props: Record<string, any>) => {
    if (__DEV__) {
      const propTypes = Object.entries(props).reduce((acc, [key, value]) => {
        acc[key] = { value, type: typeof value };
        return acc;
      }, {} as Record<string, { value: any; type: string }>);
      console.log(`[${componentName} Props]`, propTypes);
    }
  },
};










