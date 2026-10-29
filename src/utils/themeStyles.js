import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const darkStylesCache = new WeakMap();

// ============================================================================
// MOBILE DARK MODE PALETTE — BENCHMARKED AGAINST APPLE HEALTH & PRACTO
// ============================================================================
export const DARK_BG_ROOT = '#080E1A';       // Level 0: Deep Midnight Obsidian canvas
export const DARK_BG_HEADER = '#0B132B';     // Elevated Header / Bottom Bar
export const DARK_BG_CARD = '#111C35';       // Level 1: Primary Cards & Modals
export const DARK_BG_SUBTLE = '#16223D';     // Level 2: Elevated Chips, Inner items
export const DARK_BG_INPUT = '#16223D';      // Inputs & Search Fields

export const DARK_TEXT_PRIMARY = '#F8FAFC';  // Crisp headings & primary text
export const DARK_TEXT_MUTED = '#94A3B8';    // Secondary text & captions (Slate-400)
export const DARK_BORDER = 'rgba(255, 255, 255, 0.08)';       // Subtle card boundary
export const DARK_BORDER_SUBTLE = 'rgba(255, 255, 255, 0.05)';
export const DARK_BORDER_FOCUS = 'rgba(255, 255, 255, 0.16)';

// Luminous Badge Tints for Dark Mode
const TINT_GREEN_BG = 'rgba(0, 229, 176, 0.12)';
const TINT_GREEN_BORDER = 'rgba(0, 229, 176, 0.28)';
const TINT_BLUE_BG = 'rgba(56, 189, 248, 0.14)';
const TINT_BLUE_BORDER = 'rgba(56, 189, 248, 0.28)';
const TINT_AMBER_BG = 'rgba(251, 191, 36, 0.14)';
const TINT_AMBER_BORDER = 'rgba(251, 191, 36, 0.28)';
const TINT_RED_BG = 'rgba(248, 113, 113, 0.14)';
const TINT_RED_BORDER = 'rgba(248, 113, 113, 0.28)';
const TINT_PURPLE_BG = 'rgba(192, 132, 252, 0.14)';
const TINT_PURPLE_BORDER = 'rgba(192, 132, 252, 0.28)';

// Light Background Matchers
const LIGHT_BG_ROOT_COLORS = new Set([
  '#ffffff',
  '#fff',
  'white',
  'rgb(255, 255, 255)',
  'rgba(255, 255, 255, 1)',
  '#f8fafc',
  '#fafcfd',
  '#f1f5f9',
  '#f0f4f8',
  '#f3f4f6',
  '#f9fafb',
  '#fafafa',
  '#f5f5f5',
  '#f8f9fa',
  '#f4f6f8',
  '#f1f8f6',
  '#e8f1f8',
  '#f5fefb',
  '#f0f6fa',
  '#f1f8fb',
  '#e6f0f7',
  '#ebf4fa',
  '#e8f4fd',
  '#f0fdf9',
  '#f0fdfa',
  '#e0ecf6',
  '#e0f7f4',
  '#e0f7fa',
  '#e6f8f4',
  '#e6f8f5',
  '#ecfdf5',
  '#eff6ff',
  '#f0f9ff',
  '#f0fdf4',
  '#f2faf0',
  '#f4f8fa',
  '#f4fbfc',
  '#f7fcfc',
  '#faf5ff',
  '#fafcfc',
  '#fcfdfe',
  '#fff5f0',
  '#fff7ed',
  '#fffbeb',
  'rgb(250, 252, 253)',
  'rgb(248, 250, 252)',
  'rgb(241, 245, 249)',
]);

// Color Categories for Badges and Accents
const GREEN_TINTS = new Set([
  '#ecfdf5', '#d1fae5', '#e6f8f5', '#dcfce7', '#f0fdf4', '#f0fdfa',
  '#ccfbf1', '#d0f2e9', '#e8f8f5', '#e0f7f4', '#e0f7fa', '#f0fdf9',
  '#ebf8f5', '#ebf8e7', '#f4fbf4', '#f2faf0', '#e8fdf8', '#def7ec',
  'rgb(236, 253, 245)', 'rgb(240, 253, 250)', 'rgb(220, 252, 231)',
]);

const BLUE_TINTS = new Set([
  '#eff6ff', '#dbeafe', '#e0f2fe', '#e0ecf6', '#f0f9ff', '#eef7fc',
  '#e8f4fd', '#bfdbfe', '#e0e7ff', '#d8eef6', '#d4eaf7', '#ebf4fa',
  '#e6f0f7', '#f1f8fb', '#e8f1f8', '#f0f6fa',
  'rgb(239, 246, 255)', 'rgb(219, 234, 254)', 'rgb(224, 242, 254)',
]);

const AMBER_TINTS = new Set([
  '#fef3c7', '#fde68a', '#fff7ed', '#ffedd5', '#fff2ed', '#fffbeb',
  '#fed7aa', '#fef9c3', '#fff1e8', '#fff8f5', '#fff5f0',
  'rgb(254, 243, 199)', 'rgb(255, 247, 237)', 'rgb(255, 237, 213)',
]);

const RED_TINTS = new Set([
  '#fee2e2', '#fee4e6', '#ffe4e6', '#fef2f2', '#fce7f3', '#fff1f2',
  '#fdeff3', '#fdf2f8', '#ffe4e6',
  'rgb(254, 226, 226)', 'rgb(254, 242, 242)', 'rgb(255, 228, 230)',
]);

const PURPLE_TINTS = new Set([
  '#f3e8ff', '#ede9fe', '#f5f3ff', '#f2eeff', '#fae8ff', '#ddd6fe',
  'rgb(243, 232, 255)', 'rgb(237, 233, 254)', 'rgb(245, 243, 255)',
]);

// Colored Text Accent Mappings (Transforms dark-on-light accents into luminous dark mode accents)
const TEAL_ACCENT_TEXT = new Set([
  '#007d69', '#0d9488', '#059669', '#0f766e', '#047857', '#006655',
  '#065f46', '#115e59', '#16a34a', '#15803d', '#166534', '#00a885',
  '#00b894', '#00bb95', '#10b981', '#008060',
  'rgb(0, 125, 105)', 'rgb(13, 148, 136)', 'rgb(5, 150, 105)',
]);

const BLUE_ACCENT_TEXT = new Set([
  '#1e40af', '#1d4ed8', '#2563eb', '#0284c7', '#0369a1', '#0c4a6e',
  '#0c3b6b', '#00c2cb', '#3b82f6', '#0284c7',
  'rgb(30, 64, 175)', 'rgb(29, 78, 216)', 'rgb(2, 132, 199)',
]);

const AMBER_ACCENT_TEXT = new Set([
  '#d97706', '#b45309', '#92400e', '#c2410c', '#ea580c', '#f59e0b',
  '#ff7f50', '#9a3412',
  'rgb(217, 119, 6)', 'rgb(180, 83, 9)', 'rgb(194, 65, 12)',
]);

const RED_ACCENT_TEXT = new Set([
  '#dc2626', '#b91c1c', '#991b1b', '#e11d48', '#be123c', '#ef4444',
  'rgb(220, 38, 38)', 'rgb(185, 28, 28)', 'rgb(153, 27, 27)',
]);

const PURPLE_ACCENT_TEXT = new Set([
  '#7c3aed', '#6d28d9', '#8b5cf6', '#5b21b6', '#6b21a8', '#581c87',
  'rgb(124, 58, 237)', 'rgb(109, 40, 217)', 'rgb(139, 92, 246)',
]);

const DARK_TEXT_COLORS = new Set([
  '#0f172a',
  '#1e3a8a',
  '#1e293b',
  '#111827',
  '#000000',
  '#000',
  'black',
  '#1a202c',
  '#1f2937',
  '#2d3748',
  '#334155',
  '#374151',
  '#1e3a5f',
  '#0d253f',
  '#212529',
  '#121212',
  '#18181b',
  '#27272a',
  '#113247',
  '#0a1c3e',
  '#1a1a1a',
  'rgb(30, 58, 138)',
  'rgb(15, 23, 42)',
  'rgb(30, 41, 59)',
  'rgb(0, 0, 0)',
  'rgb(17, 24, 39)',
  'rgb(51, 65, 85)',
]);

const MUTED_TEXT_COLORS = new Set([
  '#64748b',
  '#475569',
  '#6b7280',
  '#718096',
  '#94a3b8',
  '#9ca3af',
  '#a0aec0',
  '#78849e',
  '#8a99ad',
  '#647488',
  '#52525b',
  '#71717a',
  'rgb(100, 116, 139)',
  'rgb(71, 85, 105)',
  'rgb(107, 114, 128)',
  'rgb(148, 163, 184)',
]);

const LIGHT_BORDER_COLORS = new Set([
  '#e2e8f0',
  '#dce7ec',
  '#cbd5e1',
  '#f1f5f9',
  '#e5e7eb',
  '#e0e7ff',
  '#bfdfeb',
  '#c4d8e7',
  '#d1d5db',
  '#e4e4e7',
  '#eeeff2',
  '#ddd',
  '#eee',
  '#ccc',
  '#e0e0e0',
  'rgba(255, 255, 255, 0.6)',
  'rgba(255, 255, 255, 0.35)',
  'rgb(226, 232, 240)',
  'rgb(220, 231, 236)',
  'rgb(203, 213, 225)',
]);

const isLightBackground = (clean) => {
  return (
    clean === 'white' ||
    clean === '#fff' ||
    clean === '#ffffff' ||
    clean.startsWith('#f') ||
    clean.startsWith('#e') ||
    clean.startsWith('rgb(24') ||
    clean.startsWith('rgb(25') ||
    clean.startsWith('rgba(255') ||
    LIGHT_BG_ROOT_COLORS.has(clean) ||
    GREEN_TINTS.has(clean) ||
    BLUE_TINTS.has(clean) ||
    AMBER_TINTS.has(clean) ||
    RED_TINTS.has(clean) ||
    PURPLE_TINTS.has(clean)
  );
};

/**
 * Checks whether a key corresponds strictly to the root screen container.
 * Sub-components, inner wrappers, and cards should NOT receive the root background.
 */
function isRootContainerKey(keyName) {
  if (
    /(card|modal|dialog|sheet|popup|menu|dropdown|picker|tile|pill|badge|chip|item|avatar|btn|button|input|search|form|row|col|tab|upload|drawer|toast|header|footer|nav|stat|section|summary|bubble|result|preview|step|info|content|wrapper)/i.test(
      keyName
    )
  ) {
    if (/^(screenContainer|safeAreaContainer|rootContainer|pageContainer|mainContainer)$/i.test(keyName)) {
      return true;
    }
    return false;
  }
  return /^(screen|safe|safeArea|safeContainer|safeAreaContainer|root|rootContainer|container|mainContainer|page|pageContainer|bodyContainer|scrollContainer|contentContainer|scrollView|fullContainer|layoutContainer)$/i.test(
    keyName
  );
}

/**
 * Transforms a single style property value for Mobile Dark Mode
 */
function transformValue(val, prop, keyName) {
  if (typeof val !== 'string') return val;
  const clean = val.trim().toLowerCase();

  // ==========================================================================
  // 1. BACKGROUND COLORS
  // ==========================================================================
  if (prop === 'backgroundColor') {
    // 1a. Outermost Screen Container ONLY -> Level 0 Deep Midnight
    if (isRootContainerKey(keyName)) {
      if (isLightBackground(clean)) {
        return DARK_BG_ROOT;
      }
    }

    // 1b. Header, Navbar, Topbar, Bottombar
    if (/(header|topbar|navbar|appbar|breadcrumbs|bottomnav)/i.test(keyName)) {
      if (isLightBackground(clean)) {
        return DARK_BG_HEADER;
      }
    }

    // 1c. Inputs, Search fields, Text entries
    if (/(input|search|textentry|field)/i.test(keyName)) {
      if (isLightBackground(clean)) {
        return DARK_BG_INPUT;
      }
    }

    // 1d. Smart Translucent Badges / Status Chips / Tags
    if (GREEN_TINTS.has(clean)) {
      return TINT_GREEN_BG;
    }
    if (BLUE_TINTS.has(clean)) {
      return TINT_BLUE_BG;
    }
    if (AMBER_TINTS.has(clean)) {
      return TINT_AMBER_BG;
    }
    if (RED_TINTS.has(clean)) {
      return TINT_RED_BG;
    }
    if (PURPLE_TINTS.has(clean)) {
      return TINT_PURPLE_BG;
    }

    // 1e. Cards, Modals, Dialogs, Surfaces
    if (/(card|box|panel|modal|dialog|drawer|sheet|popup|menu|dropdown|picker|tile|surface)/i.test(keyName)) {
      if (isLightBackground(clean)) {
        return DARK_BG_CARD;
      }
    }

    // 1f. Elevated Chips, Inner items, Subtle elements
    if (/(pill|chip|tag|tab|subtle|badge|btn|button|row|item|summary|upload|preview|banner|action)/i.test(keyName)) {
      if (isLightBackground(clean)) {
        return DARK_BG_SUBTLE;
      }
    }

    // 1g. Other light surfaces
    if (isLightBackground(clean)) {
      return DARK_BG_CARD;
    }
  }

  // ==========================================================================
  // 1b. GRADIENTS (CSS / Web Backgrounds)
  // ==========================================================================
  if (prop === 'background' || prop === 'backgroundImage') {
    if (clean.includes('gradient')) {
      if (
        clean.includes('00a885') ||
        clean.includes('00bb95') ||
        clean.includes('15d4aa') ||
        clean.includes('d8eef6') ||
        clean.includes('d4f3eb')
      ) {
        return 'radial-gradient(ellipse 100% 90% at 50% -10%, rgba(0, 229, 176, 0.16) 0%, rgba(11, 23, 40, 0.95) 55%, #080E1A 100%)';
      }
      if (
        clean.includes('fff') ||
        clean.includes('f8f') ||
        clean.includes('e0f') ||
        clean.includes('ecf') ||
        clean.includes('e6f') ||
        clean.includes('ebf') ||
        clean.includes('f0f') ||
        clean.includes('cce') ||
        clean.includes('dde') ||
        clean.includes('f4f')
      ) {
        return 'none';
      }
    }
  }

  // ==========================================================================
  // 2. TEXT & ICON COLORS
  // ==========================================================================
  if (prop === 'color') {
    // Preserve crisp white text (e.g. on primary buttons, badges, active chips)
    if (clean === '#ffffff' || clean === '#fff' || clean === 'white') {
      return val;
    }

    // 2a. Luminous Colored Accents in Dark Mode (Eliminates illegible dark-on-dark text)
    if (TEAL_ACCENT_TEXT.has(clean)) {
      return '#00E5B0'; // Mediunify Luminous Mint
    }
    if (BLUE_ACCENT_TEXT.has(clean)) {
      return '#38BDF8'; // Luminous Sky Blue
    }
    if (AMBER_ACCENT_TEXT.has(clean)) {
      return '#FBBF24'; // Luminous Warm Gold
    }
    if (RED_ACCENT_TEXT.has(clean)) {
      return '#F87171'; // Luminous Coral / Red
    }
    if (PURPLE_ACCENT_TEXT.has(clean)) {
      return '#C084FC'; // Luminous Lavender
    }

    // 2b. High-contrast primary headings & titles
    if (DARK_TEXT_COLORS.has(clean)) {
      return DARK_TEXT_PRIMARY;
    }

    // 2c. Secondary / Muted slate text
    if (MUTED_TEXT_COLORS.has(clean)) {
      return DARK_TEXT_MUTED;
    }

    // 2d. In-key title/heading text
    if (/(title|heading|headline|label|name|bold)/i.test(keyName)) {
      if (
        clean.startsWith('#0') ||
        clean.startsWith('#1') ||
        clean.startsWith('#2') ||
        clean.startsWith('#3')
      ) {
        return DARK_TEXT_PRIMARY;
      }
    }

    // 2e. In-key subtitle/caption text
    if (/(subtitle|caption|desc|muted|hint|meta|date|time)/i.test(keyName)) {
      if (
        clean.startsWith('#4') ||
        clean.startsWith('#5') ||
        clean.startsWith('#6') ||
        clean.startsWith('#7')
      ) {
        return DARK_TEXT_MUTED;
      }
    }
  }

  // ==========================================================================
  // 3. BORDER COLORS
  // ==========================================================================
  if (
    prop === 'borderColor' ||
    prop === 'borderTopColor' ||
    prop === 'borderBottomColor' ||
    prop === 'borderLeftColor' ||
    prop === 'borderRightColor'
  ) {
    // 3a. Luminous Accent Borders
    if (
      GREEN_TINTS.has(clean) ||
      clean === '#d0f2e9' ||
      clean === '#a7f3d0' ||
      clean === '#ccfbf1' ||
      clean === '#86efac' ||
      clean === '#d1fae5' ||
      clean === '#bbf7d0' ||
      clean === '#99f6e4'
    ) {
      return TINT_GREEN_BORDER;
    }
    if (
      BLUE_TINTS.has(clean) ||
      clean === '#bae6fd' ||
      clean === '#bfdbfe' ||
      clean === '#bfdfeb' ||
      clean === '#c4d8e7' ||
      clean === '#e0e7ff' ||
      clean === '#ddd6fe'
    ) {
      return TINT_BLUE_BORDER;
    }
    if (
      AMBER_TINTS.has(clean) ||
      clean === '#fed7aa' ||
      clean === '#fde68a' ||
      clean === '#fef08a'
    ) {
      return TINT_AMBER_BORDER;
    }
    if (
      RED_TINTS.has(clean) ||
      clean === '#fecaca' ||
      clean === '#fda4af'
    ) {
      return TINT_RED_BORDER;
    }
    if (PURPLE_TINTS.has(clean)) {
      return TINT_PURPLE_BORDER;
    }

    // 3b. White borders on dark surfaces -> Subtle translucent divider
    if (clean === '#ffffff' || clean === '#fff' || clean === 'white') {
      return 'rgba(255, 255, 255, 0.14)';
    }

    // 3c. Light gray borders -> Level 1 dark perimeter
    if (
      LIGHT_BORDER_COLORS.has(clean) ||
      clean.startsWith('#e') ||
      clean.startsWith('#f') ||
      clean.startsWith('#d') ||
      clean.startsWith('#c')
    ) {
      return DARK_BORDER;
    }
  }

  // ==========================================================================
  // 4. SHADOWS
  // ==========================================================================
  if (prop === 'shadowColor') {
    return '#000000';
  }

  return val;
}

/**
 * Recursively creates a dark-mode transformed version of a StyleSheet
 */
export function getThemedStyles(baseStyles, isDarkMode, theme) {
  if (!isDarkMode || !baseStyles || typeof baseStyles !== 'object') {
    return baseStyles;
  }

  if (darkStylesCache.has(baseStyles)) {
    return darkStylesCache.get(baseStyles);
  }

  const themed = {};
  for (const key of Object.keys(baseStyles)) {
    const rule = baseStyles[key];
    if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
      const transformedRule = { ...rule };
      for (const prop of Object.keys(rule)) {
        transformedRule[prop] = transformValue(rule[prop], prop, key);
      }
      themed[key] = transformedRule;
    } else {
      themed[key] = rule;
    }
  }

  const result = StyleSheet.create(themed);
  try {
    darkStylesCache.set(baseStyles, result);
  } catch (e) {}

  return result;
}

/**
 * React Hook for automatic dark mode styling across React Native screens
 * Usage:
 *   const styles = useThemedStyles(baseStyles);
 */
export function useThemedStyles(baseStyles) {
  const { isDarkMode, theme } = useTheme();
  return useMemo(() => {
    return getThemedStyles(baseStyles, isDarkMode, theme);
  }, [baseStyles, isDarkMode, theme]);
}

export default useThemedStyles;
