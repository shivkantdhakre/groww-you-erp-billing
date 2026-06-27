export const typography = {
  // Font Families
  families: {
    inter: 'inter',
    lexend: 'lexend',
  },
  
  // Semantic Tiers
  display: {
    fontFamily: 'lexend',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900', // black
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'lexend',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800', // extrabold
  },
  heading: {
    fontFamily: 'lexend',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700', // bold
  },
  subheading: {
    fontFamily: 'inter',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600', // semibold
  },
  body: {
    fontFamily: 'inter',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400', // normal
  },
  bodyStrong: {
    fontFamily: 'inter',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600', // semibold
  },
  caption: {
    fontFamily: 'inter',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400', // normal
  },
  captionStrong: {
    fontFamily: 'inter',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700', // bold
  },
  label: {
    fontFamily: 'inter',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600', // semibold
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
} as const;

export type ThemeTypography = typeof typography;
