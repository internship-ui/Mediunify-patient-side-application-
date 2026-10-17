import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const darkStylesCache = new WeakMap();

const DARK_BG_ROOT = '#0B1120';
const DARK_BG_HEADER = '#0F172A';
const DARK_BG_CARD = '#1E293B';
const DARK_BG_SUBTLE = '#162032';
const DARK_BG_INPUT = '#0F172A';
const DARK_TEXT_PRIMARY = '#F8FAFC';
const DARK_TEXT_MUTED = '#94A3B8';
const DARK_BORDER = '#334155';

const LIGHT_BG_ROOT_COLORS = new Set([
  '#ffffff',
  '#fff',
  'rgb(255, 255, 255)',
  'rgba(255, 255, 255, 1)',
  '#f8fafc',
  '#fafcfd',
  '#f1f5f9',
  '#f0f4f8',
  '#f3f4f6',
  '#f9fafb',
]);

const LIGHT_BG_SURFACE_COLORS = new Set([
  '#ffffff',
  '#fff',
  'rgb(255, 255, 255)',
  'rgba(255, 255, 255, 1)',
  '#fafafa',
  '#f8fafc',
  '#fafcfd',
]);

const LIGHT_BG_TINTED_COLORS = new Set([
  '#eff6ff',
  '#f0f9ff',
  '#ecfdf5',
  '#fef3c7',
  '#fff7ed',
  '#f5f3ff',
  '#eef7fc',
  '#f1f5f9',
  '#e0ecf6',
  '#e6f8f5',
  '#e2e8f0',
  '#f1f8fb',
  '#e8f4fd',
  '#f0fdf4',
  '#fffbeb',
  '#fff1f2',
  '#fdf2f8',
  '#f3e8ff',
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
]);

/**
 * Transforms a single style property value for Dark Mode
 */
function transformValue(val, prop, keyName) {
  if (typeof val !== 'string') return val;
  const clean = val.trim().toLowerCase();

  // 1. BACKGROUND COLORS
  if (prop === 'backgroundColor') {
    // Root & Page-level scroll containers
    if (/(container|safe|root|screen|scroll|page|wrapper|body|main|content)/i.test(keyName)) {
      if (LIGHT_BG_ROOT_COLORS.has(clean)) {
        return DARK_BG_ROOT;
      }
    }

    // Headers, Navbars, Appbars
    if (/(header|topbar|navbar|appbar|breadcrumbs)/i.test(keyName)) {
      if (LIGHT_BG_ROOT_COLORS.has(clean)) {
        return DARK_BG_HEADER;
      }
    }

    // Inputs & Search fields
    if (/(input|search|textentry|field)/i.test(keyName)) {
      if (LIGHT_BG_ROOT_COLORS.has(clean) || LIGHT_BG_TINTED_COLORS.has(clean)) {
        return DARK_BG_INPUT;
      }
    }

    // Cards, Modals, Dialogs, Surfaces
    if (LIGHT_BG_SURFACE_COLORS.has(clean)) {
      return DARK_BG_CARD;
    }

    // Tinted / Subtle card backgrounds
    if (LIGHT_BG_TINTED_COLORS.has(clean)) {
      return DARK_BG_SUBTLE;
    }
  }

  // 2. TEXT COLORS
  if (prop === 'color') {
    // Keep white text intact (buttons, chips, active tags)
    if (clean === '#ffffff' || clean === '#fff' || clean === 'white') {
      return val;
    }

    // High-contrast primary text
    if (DARK_TEXT_COLORS.has(clean)) {
      return DARK_TEXT_PRIMARY;
    }

    // Secondary / Muted slate text
    if (MUTED_TEXT_COLORS.has(clean)) {
      return DARK_TEXT_MUTED;
    }
  }

  // 3. BORDER COLORS
  if (
    prop === 'borderColor' ||
    prop === 'borderTopColor' ||
    prop === 'borderBottomColor' ||
    prop === 'borderLeftColor' ||
    prop === 'borderRightColor'
  ) {
    if (LIGHT_BORDER_COLORS.has(clean)) {
      return DARK_BORDER;
    }
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
 * React Hook for automatic dark mode styling
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
