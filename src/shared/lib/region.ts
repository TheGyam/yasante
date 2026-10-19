import { getLocales } from 'expo-localization';

/**
 * Where this phone is set to: its language tag, its region (ISO 3166) and whether
 * it measures in miles. Read from the phone's own settings, so nobody is asked for
 * their location. Read once: changing these settings restarts the app.
 */
const first = (() => {
  try {
    return getLocales()[0];
  } catch {
    return undefined;
  }
})();

export const deviceLocale = first?.languageTag || 'en-GB';
export const deviceRegion = (first?.regionCode || 'GB').toUpperCase();
/** The phone's own currency (ISO 4217): for labels, never for converting a price. */
export const deviceCurrency = (first?.currencyCode || 'GBP').toUpperCase();
/** Miles where the phone measures in miles (the UK and the US), kilometres elsewhere. */
export const usesMiles = first?.measurementSystem
  ? first.measurementSystem !== 'metric' || deviceRegion === 'GB'
  : deviceRegion === 'GB' || deviceRegion === 'US';
