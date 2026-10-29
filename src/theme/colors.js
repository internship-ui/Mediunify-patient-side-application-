/**
 * MediUnify Official Design Token & Color System
 *
 * ONLY 6 MAIN UI COLORS:
 * 1. Teal:        #00B894 (Primary Brand, "Unify", Key Actions, Primary Buttons, Active Tabs)
 * 2. Navy Blue:   #1E3A8A (Primary Headings, "Medi", Top Nav, High-Priority Elements)
 * 3. Aqua:        #00C2CB (Secondary Accent, Diagnostics, Radiology, Interactive Highlights)
 * 4. Fresh Green: #7BC96F (Success States, Verified Badges, Positive Metrics)
 * 5. Coral:       #FF7F50 (Warnings, Cancellation, Delete, Return, Attention Actions - Used Sparingly)
 * 6. Slate:       #64748B (Secondary Text, Subtitles, Icons, Borders, Metadata)
 */

export const PALETTE = {
  teal: '#00B894',
  navyBlue: '#1E3A8A',
  aqua: '#00C2CB',
  freshGreen: '#7BC96F',
  coral: '#FF7F50',
  slate: '#64748B',
};

// Aliased brand tokens
export const BRAND_COLORS = {
  ...PALETTE,
  navy: '#1E3A8A',
  green: '#7BC96F',
};

// Root / Global Banner Themes for consistent page headers across MediUnify
export const BANNER_THEMES = {
  teal: {
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #F0FDF9 0%, #F8FAFC 100%)',
    borderColor: '#E2E8F0',
    badgeBg: '#ECFDF5',
    badgeBorder: '#A7F3D0',
    badgeText: '#008B94',
    iconCircleBg: '#ECFDF5',
    iconColor: '#00B894',
    iconBorder: '#A7F3D0',
    headingColor: '#1E3A8A',
    textColor: '#64748B',
  },
  navy: {
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #F0F5FF 0%, #F8FAFC 100%)',
    borderColor: '#E2E8F0',
    badgeBg: '#EEF2FF',
    badgeBorder: '#C7D2FE',
    badgeText: '#1E3A8A',
    iconCircleBg: '#EEF2FF',
    iconColor: '#1E3A8A',
    iconBorder: '#C7D2FE',
    headingColor: '#1E3A8A',
    textColor: '#64748B',
  },
  aqua: {
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #F0FBFC 0%, #F8FAFC 100%)',
    borderColor: '#E2E8F0',
    badgeBg: '#E0F7FA',
    badgeBorder: '#B2EBF2',
    badgeText: '#00838F',
    iconCircleBg: '#E0F7FA',
    iconColor: '#00838F',
    iconBorder: '#B2EBF2',
    headingColor: '#1E3A8A',
    textColor: '#64748B',
  },
  freshGreen: {
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #F4FBF4 0%, #F8FAFC 100%)',
    borderColor: '#E2E8F0',
    badgeBg: '#EBF8E7',
    badgeBorder: '#C2EDB7',
    badgeText: '#15803D',
    iconCircleBg: '#EBF8E7',
    iconColor: '#15803D',
    iconBorder: '#C2EDB7',
    headingColor: '#1E3A8A',
    textColor: '#64748B',
  },
  green: {
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #F4FBF4 0%, #F8FAFC 100%)',
    borderColor: '#E2E8F0',
    badgeBg: '#EBF8E7',
    badgeBorder: '#C2EDB7',
    badgeText: '#15803D',
    iconCircleBg: '#EBF8E7',
    iconColor: '#15803D',
    iconBorder: '#C2EDB7',
    headingColor: '#1E3A8A',
    textColor: '#64748B',
  },
  coral: {
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #FFF8F5 0%, #F8FAFC 100%)',
    borderColor: '#E2E8F0',
    badgeBg: '#FFF2ED',
    badgeBorder: '#FFD8CC',
    badgeText: '#EA580C',
    iconCircleBg: '#FFF2ED',
    iconColor: '#FF7F50',
    iconBorder: '#FFD8CC',
    headingColor: '#1E3A8A',
    textColor: '#64748B',
  },
  slate: {
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 100%)',
    borderColor: '#E2E8F0',
    badgeBg: '#F1F5F9',
    badgeBorder: '#CBD5E1',
    badgeText: '#475569',
    iconCircleBg: '#F1F5F9',
    iconColor: '#475569',
    iconBorder: '#CBD5E1',
    headingColor: '#1E3A8A',
    textColor: '#64748B',
  },
};

export const DARK_BANNER_THEMES = {
  teal: {
    bg: '#111C35',
    gradient: 'linear-gradient(135deg, rgba(0, 184, 148, 0.16) 0%, rgba(17, 28, 53, 0.95) 50%, #0D1627 100%)',
    borderColor: 'rgba(0, 184, 148, 0.35)',
    badgeBg: 'rgba(0, 184, 148, 0.16)',
    badgeBorder: 'rgba(0, 184, 148, 0.4)',
    badgeText: '#00E5B0',
    iconCircleBg: 'rgba(0, 184, 148, 0.16)',
    iconColor: '#00E5B0',
    iconBorder: 'rgba(0, 184, 148, 0.4)',
    headingColor: '#FFFFFF',
    textColor: '#94A3B8',
  },
  navy: {
    bg: '#111C35',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(17, 28, 53, 0.95) 50%, #0D1627 100%)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    badgeBg: 'rgba(59, 130, 246, 0.16)',
    badgeBorder: 'rgba(59, 130, 246, 0.4)',
    badgeText: '#60A5FA',
    iconCircleBg: 'rgba(59, 130, 246, 0.16)',
    iconColor: '#60A5FA',
    iconBorder: 'rgba(59, 130, 246, 0.4)',
    headingColor: '#FFFFFF',
    textColor: '#94A3B8',
  },
  aqua: {
    bg: '#111C35',
    gradient: 'linear-gradient(135deg, rgba(0, 194, 203, 0.16) 0%, rgba(17, 28, 53, 0.95) 50%, #0D1627 100%)',
    borderColor: 'rgba(0, 194, 203, 0.35)',
    badgeBg: 'rgba(0, 194, 203, 0.16)',
    badgeBorder: 'rgba(0, 194, 203, 0.4)',
    badgeText: '#38BDF8',
    iconCircleBg: 'rgba(0, 194, 203, 0.16)',
    iconColor: '#38BDF8',
    iconBorder: 'rgba(0, 194, 203, 0.4)',
    headingColor: '#FFFFFF',
    textColor: '#94A3B8',
  },
  freshGreen: {
    bg: '#111C35',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(17, 28, 53, 0.95) 50%, #0D1627 100%)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'rgba(16, 185, 129, 0.16)',
    badgeBorder: 'rgba(16, 185, 129, 0.4)',
    badgeText: '#34D399',
    iconCircleBg: 'rgba(16, 185, 129, 0.16)',
    iconColor: '#34D399',
    iconBorder: 'rgba(16, 185, 129, 0.4)',
    headingColor: '#FFFFFF',
    textColor: '#94A3B8',
  },
  green: {
    bg: '#111C35',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(17, 28, 53, 0.95) 50%, #0D1627 100%)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'rgba(16, 185, 129, 0.16)',
    badgeBorder: 'rgba(16, 185, 129, 0.4)',
    badgeText: '#34D399',
    iconCircleBg: 'rgba(16, 185, 129, 0.16)',
    iconColor: '#34D399',
    iconBorder: 'rgba(16, 185, 129, 0.4)',
    headingColor: '#FFFFFF',
    textColor: '#94A3B8',
  },
  coral: {
    bg: '#111C35',
    gradient: 'linear-gradient(135deg, rgba(255, 127, 80, 0.16) 0%, rgba(17, 28, 53, 0.95) 50%, #0D1627 100%)',
    borderColor: 'rgba(255, 127, 80, 0.35)',
    badgeBg: 'rgba(255, 127, 80, 0.16)',
    badgeBorder: 'rgba(255, 127, 80, 0.4)',
    badgeText: '#FB923C',
    iconCircleBg: 'rgba(255, 127, 80, 0.16)',
    iconColor: '#FB923C',
    iconBorder: 'rgba(255, 127, 80, 0.4)',
    headingColor: '#FFFFFF',
    textColor: '#94A3B8',
  },
  slate: {
    bg: '#111C35',
    gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.12) 0%, rgba(17, 28, 53, 0.95) 50%, #0D1627 100%)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    badgeBorder: 'rgba(255, 255, 255, 0.14)',
    badgeText: '#CBD5E1',
    iconCircleBg: 'rgba(255, 255, 255, 0.08)',
    iconColor: '#CBD5E1',
    iconBorder: 'rgba(255, 255, 255, 0.14)',
    headingColor: '#FFFFFF',
    textColor: '#94A3B8',
  },
};

export const getBannerTheme = (themeKey = 'teal', isDark = false) => {
  const dict = isDark ? DARK_BANNER_THEMES : BANNER_THEMES;
  return dict[themeKey] || dict.teal;
};

const colors = {
  // 6 PRIMARY PALETTE TOKENS
  teal: '#00B894',          // TEAL - Primary Brand, "Unify", Key Actions
  navyBlue: '#1E3A8A',      // NAVY BLUE - Primary Headings, "Medi", Nav
  aqua: '#00C2CB',          // AQUA - Secondary Accent, Diagnostics, Radiology
  freshGreen: '#7BC96F',    // FRESH GREEN - Success, Verified Badges
  coral: '#FF7F50',         // CORAL - Warnings, Cancellation, Delete
  slate: '#64748B',         // SLATE - Secondary Text, Borders, Subtitles

  // SEMANTIC SHORTCUTS
  primary: '#00B894',       // TEAL (Primary CTAs, active buttons, links)
  secondary: '#1E3A8A',     // NAVY BLUE (Headings, primary typography)
  accent: '#00C2CB',        // AQUA (Highlights, diagnostics)
  success: '#7BC96F',       // FRESH GREEN (Verified, confirmed)
  warning: '#FF7F50',       // CORAL (Attention required)
  danger: '#FF7F50',        // CORAL (Cancellation, destructive actions)
  error: '#FF7F50',         // CORAL
  muted: '#64748B',         // SLATE

  // NEUTRALS & CLEAN BACKGROUNDS
  background: '#FAFCFD',    // Clean light neutral
  pageBg: '#FFFFFF',        // Pure white
  pageBgOff: '#FAFCFD',     // Clean light off-white
  white: '#FFFFFF',
  black: '#0F172A',
  cardBg: '#FFFFFF',

  // SOFT LIGHT TINTS DERIVED FROM THE 6 APPROVED COLORS
  lightTeal: '#E6F8F4',
  lightNavy: '#EFF6FF',
  lightAqua: '#E0F7FA',
  lightGreen: '#EBF8E7',
  lightCoral: '#FFF2ED',
  lightSlate: '#F1F5F9',

  // SECTION BACKGROUND TINTS
  sectionLightBlue: '#EFF6FF',
  sectionLightBlueSubtle: '#F0F5FF',
  sectionSoftMint: '#E6F8F4',
  sectionSoftMintLight: '#F0FDF9',
  sectionAquaTint: '#E0F7FA',
  sectionCoralTint: '#FFF2ED',

  // SERVICE CARDS PASTEL BACKGROUNDS (strictly within 6-color system)
  pastelLightBlue: '#EEF7FC',
  pastelLightMint: '#E6F8F4',
  pastelSoftAqua: '#E0F7FA',
  pastelSoftGreen: '#EBF8E7',
  pastelSoftCoral: '#FFF2ED',
  pastelSoftNavy: '#EEF2FF',

  // TYPOGRAPHY & BORDERS
  text: '#0F172A',
  textSecondary: '#64748B', // SLATE
  textDark: '#1E3A8A',      // NAVY BLUE
  textMuted: '#94A3B8',
  border: '#E2E8F0',        // Subtle slate border
  borderSubtle: '#E2E8F0',
};

export default colors;