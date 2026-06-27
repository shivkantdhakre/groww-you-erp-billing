export const radius = {
  sm: 4,
  md: 8,
  badge: 12,
  lg: 16,
  chip: 16,
  xl: 20,
  card: 24,
  xxl: 28,
  full: 9999,
} as const;

export type ThemeRadius = typeof radius;
