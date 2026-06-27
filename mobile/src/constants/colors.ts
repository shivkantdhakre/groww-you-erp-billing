export const colors = {
  // Base backgrounds
  backgroundPrimary: '#0A0F1D',
  backgroundSecondary: '#141824',
  backgroundElevated: '#1A1F2E',
  backgroundSelected: 'rgba(247, 148, 29, 0.1)', // 10% opacity
  
  // Surfaces (Cards, Chips, Modals)
  surfacePrimary: '#1A1F2E',
  surfaceSecondary: '#141824',
  surfaceElevated: '#1E2538',

  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  borderFocus: '#F7941D',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#000000',

  // Semantic & Brand
  accent: '#F7941D',
  accentSubtle: 'rgba(247, 148, 29, 0.1)',
  
  // Status Colors
  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.1)',
  
  error: '#EF4444',
  errorSubtle: 'rgba(239, 68, 68, 0.1)',
  
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.1)',
  
  info: '#3B82F6',
  infoSubtle: 'rgba(59, 130, 246, 0.1)',
} as const;

export type ThemeColors = typeof colors;
