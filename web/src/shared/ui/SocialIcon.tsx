export function SocialIcon({ platform }: { platform: 'instagram' | 'tiktok' }) {
  return platform === 'instagram' ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.895 2.895 0 0 1-5.2 1.743 2.895 2.895 0 0 1 2.31-4.64c.298 0 .595.046.88.137v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.849-4.432V8.686a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
    </svg>
  );
}
