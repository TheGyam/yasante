/**
 * Links into the app. On a phone with the app installed, a yasante.com link opens the
 * app by itself (App Links / Universal Links); these are for the buttons that ask for
 * it outright. The paths match the app's routes (src/shared/lib/links.ts at the root).
 */
export const appLink = {
  stylist: (handle: string) => `yasante://stylist/${handle}`,
  look: (id: string) => `yasante://looks/${id}`,
  sharedCollection: (code: string) => `yasante://c/${encodeURIComponent(code)}`,
  sharedCarePlan: (code: string) => `yasante://p/${encodeURIComponent(code)}`,
};

/**
 * Where to download the app. Empty until it's in the stores: until then the prompts
 * offer the waitlist instead. Fill these in at launch.
 */
export const STORE_LINKS = {
  appStore: '',
  googlePlay: '',
};
