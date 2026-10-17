import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { LANGUAGES, TRANSLATIONS, translate } from '../translations/index';

export { LANGUAGES, TRANSLATIONS, translate };

const ThemeContext = createContext();

// Global CSS for Web Dark Appearance
const injectWebDarkModeCSS = (isDark) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'mediunify-global-dark-mode';
  let styleEl = document.getElementById(styleId);

  if (!isDark) {
    if (styleEl) styleEl.remove();
    document.documentElement.removeAttribute('data-theme');
    document.body?.classList.remove('dark-mode');
    return;
  }

  document.documentElement.setAttribute('data-theme', 'dark');
  document.body?.classList.add('dark-mode');

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    html[data-theme="dark"],
    html[data-theme="dark"] body,
    html[data-theme="dark"] #root {
      background-color: #0B1120 !important;
      color: #F8FAFC !important;
      color-scheme: dark !important;
    }

    /* Page root and scrollable containers */
    html[data-theme="dark"] [style*="background-color: rgb(250, 252, 253)"],
    html[data-theme="dark"] [style*="background-color: rgb(248, 250, 252)"],
    html[data-theme="dark"] [style*="background-color: rgb(241, 245, 249)"],
    html[data-theme="dark"] [style*="background-color: #FAFCFD"],
    html[data-theme="dark"] [style*="background-color: #fafcfd"],
    html[data-theme="dark"] [style*="background-color: #F8FAFC"],
    html[data-theme="dark"] [style*="background-color: #f8fafc"],
    html[data-theme="dark"] [style*="background-color: #F1F5F9"],
    html[data-theme="dark"] [style*="background-color: #f1f5f9"],
    html[data-theme="dark"] .r-backgroundColor-1v8cplm {
      background-color: #0B1120 !important;
    }

    /* Cards, Modals, Popups, and White Surfaces */
    html[data-theme="dark"] [style*="background-color: rgb(255, 255, 255)"],
    html[data-theme="dark"] [style*="background-color: #FFFFFF"],
    html[data-theme="dark"] [style*="background-color: #ffffff"],
    html[data-theme="dark"] .r-backgroundColor-14lw9ot {
      background-color: #1E293B !important;
    }

    /* Subtle tinted backgrounds & pastel service cards */
    html[data-theme="dark"] [style*="background-color: rgb(241, 245, 249)"],
    html[data-theme="dark"] [style*="background-color: rgb(239, 246, 255)"],
    html[data-theme="dark"] [style*="background-color: rgb(240, 249, 255)"],
    html[data-theme="dark"] [style*="background-color: rgb(236, 253, 245)"],
    html[data-theme="dark"] [style*="background-color: rgb(254, 243, 199)"],
    html[data-theme="dark"] [style*="background-color: rgb(255, 247, 237)"],
    html[data-theme="dark"] [style*="background-color: rgb(245, 243, 255)"],
    html[data-theme="dark"] [style*="background-color: rgb(238, 247, 252)"],
    html[data-theme="dark"] [style*="background-color: rgb(236, 249, 245)"],
    html[data-theme="dark"] [style*="background-color: #F1F5F9"],
    html[data-theme="dark"] [style*="background-color: #EFF6FF"],
    html[data-theme="dark"] [style*="background-color: #eff6ff"],
    html[data-theme="dark"] [style*="background-color: #F0F9FF"],
    html[data-theme="dark"] [style*="background-color: #f0f9ff"],
    html[data-theme="dark"] [style*="background-color: #ECFDF5"],
    html[data-theme="dark"] [style*="background-color: #ecfdf5"],
    html[data-theme="dark"] [style*="background-color: #FEF3C7"],
    html[data-theme="dark"] [style*="background-color: #fef3c7"],
    html[data-theme="dark"] [style*="background-color: #FFF7ED"],
    html[data-theme="dark"] [style*="background-color: #fff7ed"],
    html[data-theme="dark"] [style*="background-color: #F5F3FF"],
    html[data-theme="dark"] [style*="background-color: #f5f3ff"],
    html[data-theme="dark"] [style*="background-color: #EEF7FC"],
    html[data-theme="dark"] [style*="background-color: #ECF9F5"],
    html[data-theme="dark"] [style*="background-color: #E6F8F5"],
    html[data-theme="dark"] [style*="background-color: #E0ECF6"],
    html[data-theme="dark"] [style*="background-color: #D8EEF6"] {
      background-color: #162032 !important;
    }

    /* Light linear gradients in hero banners & footers */
    html[data-theme="dark"] .hero-search-section-bg,
    html[data-theme="dark"] [class*="footerWrapper"],
    html[data-theme="dark"] [style*="linear-gradient(135deg, #CCE8F5"],
    html[data-theme="dark"] [style*="linear-gradient(135deg, rgb(204, 232, 245)"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, #DDEAF5"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, rgb(221, 234, 245)"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, #E6F0F7"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, rgb(230, 240, 247)"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, #F4FDF9"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, rgb(244, 253, 249)"],
    html[data-theme="dark"] [style*="linear-gradient(145deg, #FFFFFF"],
    html[data-theme="dark"] [style*="linear-gradient(145deg, rgb(255, 255, 255)"],
    html[data-theme="dark"] [style*="linear-gradient(135deg, #FFFFFF"],
    html[data-theme="dark"] [style*="linear-gradient(135deg, rgb(255, 255, 255)"] {
      background: #0F172A !important;
      background-image: linear-gradient(135deg, #0F172A 0%, #1E293B 100%) !important;
      border-color: #334155 !important;
    }

    /* Headers, Topbars, Navbars */
    html[data-theme="dark"] header,
    html[data-theme="dark"] nav,
    html[data-theme="dark"] #mediunify-web-header,
    html[data-theme="dark"] [class*="Header"],
    html[data-theme="dark"] [class*="header"],
    html[data-theme="dark"] [class*="topHeader"] {
      background-color: #0F172A !important;
      border-color: #334155 !important;
    }

    /* Footers */
    html[data-theme="dark"] footer,
    html[data-theme="dark"] [class*="Footer"],
    html[data-theme="dark"] [class*="footer"] {
      background-color: #0B1120 !important;
      border-color: #334155 !important;
    }

    /* Primary and Navy headings */
    html[data-theme="dark"] [style*="color: rgb(30, 58, 138)"],
    html[data-theme="dark"] [style*="color: rgb(15, 23, 42)"],
    html[data-theme="dark"] [style*="color: rgb(30, 41, 59)"],
    html[data-theme="dark"] [style*="color: #1E3A8A"],
    html[data-theme="dark"] [style*="color: #1e3a8a"],
    html[data-theme="dark"] [style*="color: #0F172A"],
    html[data-theme="dark"] [style*="color: #0f172a"],
    html[data-theme="dark"] [style*="color: #1E293B"],
    html[data-theme="dark"] [style*="color: #1e293b"] {
      color: #F8FAFC !important;
    }

    /* Secondary and Slate text */
    html[data-theme="dark"] [style*="color: rgb(100, 116, 139)"],
    html[data-theme="dark"] [style*="color: rgb(71, 85, 105)"],
    html[data-theme="dark"] [style*="color: #64748B"],
    html[data-theme="dark"] [style*="color: #64748b"],
    html[data-theme="dark"] [style*="color: #475569"],
    html[data-theme="dark"] [style*="color: #475569"] {
      color: #94A3B8 !important;
    }

    /* Borders and Dividers */
    html[data-theme="dark"] [style*="border-color: rgb(226, 232, 240)"],
    html[data-theme="dark"] [style*="border-color: rgb(220, 231, 236)"],
    html[data-theme="dark"] [style*="border-color: #E2E8F0"],
    html[data-theme="dark"] [style*="border-color: #e2e8f0"],
    html[data-theme="dark"] [style*="border-color: #DCE7EC"],
    html[data-theme="dark"] [style*="border-color: #dce7ec"],
    html[data-theme="dark"] [style*="border-color: #C4D8E7"],
    html[data-theme="dark"] [style*="border-color: #BFDFEB"],
    html[data-theme="dark"] [style*="border-bottom-color: rgb(226, 232, 240)"],
    html[data-theme="dark"] [style*="border-bottom-color: #E2E8F0"],
    html[data-theme="dark"] [style*="border-bottom-color: #e2e8f0"],
    html[data-theme="dark"] [style*="border-top-color: rgb(226, 232, 240)"],
    html[data-theme="dark"] [style*="border-top-color: #E2E8F0"] {
      border-color: #334155 !important;
    }

    /* Inputs & Form Fields */
    html[data-theme="dark"] input,
    html[data-theme="dark"] textarea,
    html[data-theme="dark"] select {
      background-color: #0F172A !important;
      color: #F8FAFC !important;
      border-color: #334155 !important;
    }

    html[data-theme="dark"] input::placeholder,
    html[data-theme="dark"] textarea::placeholder {
      color: #64748B !important;
    }

    /* Modals & Dropdown dialogs */
    html[data-theme="dark"] [role="dialog"],
    html[data-theme="dark"] [class*="modalBox"],
    html[data-theme="dark"] [class*="modalContent"],
    html[data-theme="dark"] [class*="dropdownMenu"],
    html[data-theme="dark"] [class*="cityDropdown"] {
      background-color: #1E293B !important;
      border-color: #334155 !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6) !important;
    }

    /* Scrollbars */
    html[data-theme="dark"] ::-webkit-scrollbar-track {
      background: #0B1120 !important;
    }
    html[data-theme="dark"] ::-webkit-scrollbar-thumb {
      background: #334155 !important;
      border-radius: 4px;
    }
  `;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    push: true,
    whatsapp: true,
    sms: true,
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Load preferences from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Synchronize Web Dark Mode CSS whenever isDarkMode changes
  useEffect(() => {
    injectWebDarkModeCSS(isDarkMode);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDarkMode } }));
      } catch (e) {}
    }
  }, [isDarkMode]);

  const loadSettings = async () => {
    try {
      let savedDark = await AsyncStorage.getItem('@unnathi_dark_mode');
      if (!savedDark && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        savedDark = localStorage.getItem('@unnathi_dark_mode');
      }
      if (savedDark !== null) {
        const isDark = savedDark === 'true';
        setIsDarkMode(isDark);
        injectWebDarkModeCSS(isDark);
      }

      let savedLang = await AsyncStorage.getItem('@unnathi_app_language');
      if (!savedLang && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        savedLang = localStorage.getItem('@unnathi_app_language');
      }
      if (savedLang && !['en', 'kn', 'hi'].includes(savedLang)) {
        savedLang = 'en';
        await AsyncStorage.setItem('@unnathi_app_language', 'en');
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('@unnathi_app_language', 'en');
          } catch (e) {}
        }
      }
      if (savedLang) {
        setLanguage(savedLang);
      }

      const savedNotifs = await AsyncStorage.getItem('@unnathi_notification_settings');
      if (savedNotifs) {
        setNotifications(JSON.parse(savedNotifs));
      }
    } catch (e) {
      console.log('Error loading settings from storage:', e);
    }
  };

  const toggleDarkMode = async (value) => {
    try {
      const targetVal = typeof value === 'boolean' ? value : !isDarkMode;
      setIsDarkMode(targetVal);
      injectWebDarkModeCSS(targetVal);
      await AsyncStorage.setItem('@unnathi_dark_mode', targetVal ? 'true' : 'false');
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('@unnathi_dark_mode', targetVal ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDarkMode: targetVal } }));
        } catch (e) {}
      }
    } catch (e) {
      console.log('Error saving dark mode:', e);
    }
  };

  const toggleTheme = (val) => toggleDarkMode(val);

  const changeLanguage = async (langCode) => {
    try {
      const validCode = ['en', 'kn', 'hi'].includes(langCode) ? langCode : 'en';
      setLanguage(validCode);
      await AsyncStorage.setItem('@unnathi_app_language', validCode);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('@unnathi_app_language', validCode);
          window.dispatchEvent(new CustomEvent('app-language-changed', { detail: validCode }));
        } catch (e) {}
      }
    } catch (e) {
      console.log('Error saving language:', e);
    }
  };

  const updateNotifications = async (key, val) => {
    try {
      const updated = { ...notifications, [key]: val };
      setNotifications(updated);
      await AsyncStorage.setItem('@unnathi_notification_settings', JSON.stringify(updated));
    } catch (e) {
      console.log('Error saving notification settings:', e);
    }
  };

  const toggleBiometric = async (val) => {
    try {
      setBiometricEnabled(val);
      await AsyncStorage.setItem('@unnathi_biometric_enabled', val ? 'true' : 'false');
    } catch (e) {
      console.log('Error saving biometric settings:', e);
    }
  };

  const t = (keyOrText, fallback, params) => {
    return translate(language, keyOrText, fallback, params);
  };

  const isIndic = ['kn', 'hi'].includes(language);
  const isNonEnglish = language !== 'en';

  const getAdaptiveFontSize = (baseSize, options = {}) => {
    if (!isIndic) return baseSize;
    const minSize = options.minSize ?? (baseSize > 14 ? baseSize - 1.5 : baseSize - 1);
    if (options.compact) {
      return Math.max(minSize, baseSize - (options.scaleDown || 1));
    }
    return baseSize;
  };

  const getAdaptiveLineHeight = (fontSize, customLineHeight) => {
    if (!isIndic) return customLineHeight || Math.round(fontSize * 1.3);
    const minLineHeight = Math.round(fontSize * 1.38);
    return customLineHeight ? Math.max(customLineHeight, minLineHeight) : minLineHeight;
  };

  const adaptiveTextStyle = (baseStyle = {}, options = {}) => {
    const rawSize = baseStyle.fontSize || 14;
    const adaptedSize = getAdaptiveFontSize(rawSize, options);
    const adaptedLineHeight = getAdaptiveLineHeight(adaptedSize, baseStyle.lineHeight);
    return {
      ...baseStyle,
      fontSize: adaptedSize,
      lineHeight: adaptedLineHeight,
    };
  };

  // Comprehensive Dynamic Theme Palette
  const theme = {
    isDark: isDarkMode,
    background: isDarkMode ? '#0B1120' : '#FAFCFD',
    card: isDarkMode ? '#1E293B' : '#FFFFFF',
    cardSubtle: isDarkMode ? '#162032' : '#F0F9FF',
    headerBg: isDarkMode ? '#0F172A' : '#FFFFFF',
    text: isDarkMode ? '#F8FAFC' : '#1E3A8A',
    textPrimary: isDarkMode ? '#F8FAFC' : '#0F172A',
    textSecondary: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#334155' : '#DCE7EC',
    divider: isDarkMode ? '#1E293B' : '#F1F8FB',
    inputBg: isDarkMode ? '#0F172A' : '#FAFCFD',
    inputBorder: isDarkMode ? '#334155' : '#CBD5E1',
    badgeBg: isDarkMode ? '#1E293B' : '#F1F5F9',
    primary: '#00B894',
    teal: '#00B894',
    navyBlue: isDarkMode ? '#60A5FA' : '#1E3A8A',
    aqua: '#00C2CB',
    freshGreen: '#7BC96F',
    coral: '#FF7F50',
    slate: isDarkMode ? '#94A3B8' : '#64748B',
    modalBg: isDarkMode ? '#1E293B' : '#FFFFFF',
    statusBar: isDarkMode ? 'light-content' : 'dark-content',
    statusBarBg: isDarkMode ? '#0F172A' : '#FFFFFF',
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        toggleTheme,
        language,
        changeLanguage,
        isIndic,
        isNonEnglish,
        getAdaptiveFontSize,
        getAdaptiveLineHeight,
        adaptiveTextStyle,
        t,
        notifications,
        updateNotifications,
        biometricEnabled,
        toggleBiometric,
        theme,
        LANGUAGES,
        TRANSLATIONS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isDarkMode: false,
      toggleDarkMode: () => {},
      toggleTheme: () => {},
      language: 'en',
      changeLanguage: () => {},
      isIndic: false,
      isNonEnglish: false,
      getAdaptiveFontSize: (s) => s,
      getAdaptiveLineHeight: (s, l) => l || Math.round(s * 1.3),
      adaptiveTextStyle: (s) => s,
      t: (k, fb, p) => translate('en', k, fb, p),
      notifications: { push: true, whatsapp: true, sms: true },
      updateNotifications: () => {},
      biometricEnabled: false,
      toggleBiometric: () => {},
      theme: {
        isDark: false,
        background: '#FAFCFD',
        card: '#FFFFFF',
        headerBg: '#FFFFFF',
        text: '#1E3A8A',
        textPrimary: '#0F172A',
        textSecondary: '#64748B',
        primary: '#00B894',
        border: '#DCE7EC',
        inputBg: '#FAFCFD',
        statusBar: 'dark-content',
        statusBarBg: '#FFFFFF',
      },
      LANGUAGES,
      TRANSLATIONS,
    };
  }
  return context;
};

export default ThemeContext;
