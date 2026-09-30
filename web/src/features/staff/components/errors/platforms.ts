/** Where an error came from, as the reports name it and as people say it. */
export const PLATFORMS = [
  { value: 'ios', label: 'iPhone app' },
  { value: 'android', label: 'Android app' },
  { value: 'web', label: 'Website' },
  { value: 'staff', label: 'Staff' },
  { value: 'server', label: 'Server' },
];

export const platformName = (value: string) =>
  PLATFORMS.find(platform => platform.value === value)?.label ?? (value || 'Unknown');
