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
    if (document.body) document.body.style.backgroundColor = '#FAFCFD';
    if (document.documentElement) document.documentElement.style.backgroundColor = '#FAFCFD';
    return;
  }

  document.documentElement.setAttribute('data-theme', 'dark');
  document.body?.classList.add('dark-mode');
  if (document.body) document.body.style.backgroundColor = '#090E1A';
  if (document.documentElement) document.documentElement.style.backgroundColor = '#090E1A';

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root,
    html[data-theme="dark"],
    html[data-theme="dark"] body,
    html[data-theme="dark"] #root {
      background-color: #090E1A !important;
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
      background-color: #090E1A !important;
    }

    /* Cards, Modals, Popups, and White Surfaces */
    html[data-theme="dark"] [style*="background-color: rgb(255, 255, 255)"],
    html[data-theme="dark"] [style*="background-color: #FFFFFF"],
    html[data-theme="dark"] [style*="background-color: #ffffff"],
    html[data-theme="dark"] .r-backgroundColor-14lw9ot {
      background-color: #121D32 !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
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
    html[data-theme="dark"] [style*="background-color: #E0ECF6"] {
      background-color: #111C30 !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
    }

    /* Light Page Container Overrides -> Deep Obsidian */
    html[data-theme="dark"] [style*="background-color: #F1F8F6"],
    html[data-theme="dark"] [style*="background-color: #f1f8f6"],
    html[data-theme="dark"] [style*="background-color: #F5FEFB"],
    html[data-theme="dark"] [style*="background-color: #f5fefb"],
    html[data-theme="dark"] [style*="background-color: #E8F1F8"],
    html[data-theme="dark"] [style*="background-color: #e8f1f8"],
    html[data-theme="dark"] [style*="background-color: #F0F6FA"],
    html[data-theme="dark"] [style*="background-color: #f0f6fa"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, #E6F0F7"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, rgb(230, 240, 247)"],
    html[data-theme="dark"] [class*="practoHeroCardsSection"],
    html[data-theme="dark"] [class*="specialtiesSection"] {
      background-color: #080E1A !important;
      background-image: none !important;
    }

    /* Headers, Topbars, Navbars */
    html[data-theme="dark"] header,
    html[data-theme="dark"] nav,
    html[data-theme="dark"] #mediunify-web-header,
    html[data-theme="dark"] [class*="Header"],
    html[data-theme="dark"] [class*="header"],
    html[data-theme="dark"] [class*="topHeader"] {
      background-color: #0B132B !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    html[data-theme="dark"] [class*="navLinkBtnActive"] {
      background-color: rgba(0, 229, 176, 0.12) !important;
    }

    /* Footers */
    html[data-theme="dark"] footer,
    html[data-theme="dark"] [class*="Footer"],
    html[data-theme="dark"] [class*="footer"],
    html[data-theme="dark"] [class*="footerWrapper"],
    html[data-theme="dark"] #mediunify-footer,
    html[data-theme="dark"] [style*="linear-gradient(180deg, #DDEAF5"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, rgb(221, 234, 245)"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, #E6F0F7"],
    html[data-theme="dark"] [style*="linear-gradient(180deg, rgb(230, 240, 247)"] {
      background-color: #0B132B !important;
      background-image: none !important;
      border-top-color: rgba(255, 255, 255, 0.08) !important;
    }

    /* Healthcare Service Cards — Modern Glassmorphism */
    html[data-theme="dark"] .service-card,
    html[data-theme="dark"] [class*="organicServiceCard"] {
      background: linear-gradient(180deg, #131E35 0%, #0D1627 100%) !important;
      border-width: 1.5px !important;
      border-style: solid !important;
      border-color: rgba(255, 255, 255, 0.09) !important;
      box-shadow: 0 14px 34px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
      transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease !important;
    }

    html[data-theme="dark"] .service-card:hover,
    html[data-theme="dark"] [class*="organicServiceCard"]:hover {
      transform: translateY(-5px) !important;
      box-shadow: 0 20px 42px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 229, 176, 0.22) !important;
      border-color: rgba(255, 255, 255, 0.24) !important;
    }

    html[data-theme="dark"] [class*="organicIllustrationWrap"] {
      background-color: rgba(255, 255, 255, 0.03) !important;
      border-radius: 26px 26px 0 0 !important;
    }

    html[data-theme="dark"] [class*="organicCardTitle"] {
      color: #FFFFFF !important;
      font-weight: 800 !important;
    }

    html[data-theme="dark"] [class*="organicCardSubtitle"] {
      color: #94A3B8 !important;
    }

    html[data-theme="dark"] [class*="organicArrowCircle"] {
      background-color: rgba(255, 255, 255, 0.06) !important;
    }

    /* Left Services Column & Right One Platform Badge */
    html[data-theme="dark"] [class*="servicesHeaderBadgeRow"] {
      background-color: rgba(0, 184, 148, 0.15) !important;
      border: 1px solid rgba(0, 184, 148, 0.35) !important;
    }

    html[data-theme="dark"] [class*="servicesHeaderBadgeText"] {
      color: #00E5B0 !important;
    }

    html[data-theme="dark"] [class*="servicesHeaderBadgeLine"] {
      background-color: #00E5B0 !important;
    }

    html[data-theme="dark"] [class*="servicesSectionMainTitle"] {
      color: #FFFFFF !important;
    }

    html[data-theme="dark"] [class*="servicesSectionMainSubtitle"] {
      color: #94A3B8 !important;
    }

    html[data-theme="dark"] [class*="betterCareText"] {
      color: #F8FAFC !important;
    }

    html[data-theme="dark"] [class*="togetherText"] {
      color: #94A3B8 !important;
    }

    html[data-theme="dark"] [class*="onePlatformPill"] {
      background-color: #131E35 !important;
      border: 1px solid rgba(0, 184, 148, 0.35) !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
    }

    html[data-theme="dark"] [class*="onePlatformTitle"] {
      color: #FFFFFF !important;
    }

    html[data-theme="dark"] [class*="onePlatformSubtitle"] {
      color: #00E5B0 !important;
    }

    html[data-theme="dark"] [class*="dotActive"] {
      background-color: #00E5B0 !important;
      box-shadow: 0 0 10px #00E5B0 !important;
    }

    html[data-theme="dark"] [class*="dotInactive"] {
      background-color: #334155 !important;
    }

    /* Promotional Ads Section ("Healthcare Deals & Savings") */
    html[data-theme="dark"] [class*="adShowcaseCard"] {
      background: linear-gradient(145deg, #131E35 0%, #0E1626 100%) !important;
      border: 1.5px solid rgba(255, 255, 255, 0.1) !important;
      box-shadow: 0 14px 34px -4px rgba(0, 0, 0, 0.6) !important;
    }

    html[data-theme="dark"] [class*="sectionTitle"],
    html[data-theme="dark"] [class*="showcaseTitle"] {
      color: #FFFFFF !important;
    }

    html[data-theme="dark"] [class*="floatingSideArrow"] {
      background-color: #18253D !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
    }

    html[data-theme="dark"] [class*="floatingSideArrow"] i,
    html[data-theme="dark"] [class*="floatingSideArrow"] svg {
      color: #F8FAFC !important;
      fill: #F8FAFC !important;
    }

    html[data-theme="dark"] [class*="couponBox"] {
      background-color: rgba(0, 184, 148, 0.12) !important;
      border: 1px dashed #00B894 !important;
    }

    html[data-theme="dark"] [class*="slideCounterTag"] {
      background-color: #18253D !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    /* Auth Modal Specifics in Web Dark Mode */
    html[data-theme="dark"] #ag-auth-login-root input,
    html[data-theme="dark"] #ag-auth-gate-root input {
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
      color: #F8FAFC !important;
      outline: none !important;
    }
    html[data-theme="dark"] #ag-auth-login-root input::placeholder {
      color: #64748B !important;
    }

    /* Auth Modal Dark Mode Styles */
    html[data-theme="dark"] #ag-auth-login-root [class*="loginContainer"],
    html[data-theme="dark"] #ag-auth-login-root [class*="loginHeader"] {
      background-color: #111C35 !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
    }
    html[data-theme="dark"] #ag-auth-login-root [class*="tabContainer"] {
      background-color: #16223D !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    html[data-theme="dark"] #ag-auth-login-root [class*="tabActive"] {
      background-color: #111C35 !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
    }
    html[data-theme="dark"] #ag-auth-login-root [class*="inputBox"] {
      background-color: #16223D !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
    }
    html[data-theme="dark"] #ag-auth-login-root [class*="closeBtn"] {
      background-color: #16223D !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
    }
    html[data-theme="dark"] #ag-auth-login-root [class*="formTitle"] {
      color: #FFFFFF !important;
    }
    html[data-theme="dark"] #ag-auth-login-root [class*="formSubtitle"],
    html[data-theme="dark"] #ag-auth-login-root [class*="signupFooterText"] {
      color: #94A3B8 !important;
    }
    html[data-theme="dark"] #ag-auth-login-root [class*="fieldLabel"] {
      color: #E2E8F0 !important;
    }

    /* Form Inputs across App & Modals */
    html[data-theme="dark"] .modal-input,
    html[data-theme="dark"] .page-search-bar {
      background-color: #121D32 !important;
      border: 1.5px solid rgba(255, 255, 255, 0.14) !important;
      color: #F8FAFC !important;
    }

    /* Primary, Navy, Dark Slate & Black Headings -> Clean Bright White/Off-White */
    html[data-theme="dark"] [style*="color: rgb(30, 58, 138)"],
    html[data-theme="dark"] [style*="color: rgb(15, 23, 42)"],
    html[data-theme="dark"] [style*="color: rgb(30, 41, 59)"],
    html[data-theme="dark"] [style*="color: rgb(12, 59, 107)"],
    html[data-theme="dark"] [style*="color: #1E3A8A"],
    html[data-theme="dark"] [style*="color: #1e3a8a"],
    html[data-theme="dark"] [style*="color: #0F172A"],
    html[data-theme="dark"] [style*="color: #0f172a"],
    html[data-theme="dark"] [style*="color: #1E293B"],
    html[data-theme="dark"] [style*="color: #1e293b"],
    html[data-theme="dark"] [style*="color: #0C3B6B"],
    html[data-theme="dark"] [style*="color: #0c3b6b"],
    html[data-theme="dark"] [style*="color: #000000"],
    html[data-theme="dark"] [style*="color: black"] {
      color: #F8FAFC !important;
    }

    /* Secondary and Slate text -> Clean Slate-400 */
    html[data-theme="dark"] [style*="color: rgb(100, 116, 139)"],
    html[data-theme="dark"] [style*="color: rgb(71, 85, 105)"],
    html[data-theme="dark"] [style*="color: #64748B"],
    html[data-theme="dark"] [style*="color: #64748b"],
    html[data-theme="dark"] [style*="color: #475569"],
    html[data-theme="dark"] [style*="color: #334155"] {
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
      border-color: rgba(255, 255, 255, 0.08) !important;
    }

    /* Inputs & Form Fields */
    html[data-theme="dark"] input,
    html[data-theme="dark"] textarea,
    html[data-theme="dark"] select {
      background-color: #121D32 !important;
      color: #F8FAFC !important;
      border-color: rgba(255, 255, 255, 0.14) !important;
    }

    html[data-theme="dark"] input::placeholder,
    html[data-theme="dark"] textarea::placeholder {
      color: #64748B !important;
    }

    /* Modals & Dropdown dialogs */
    html[data-theme="dark"] [role="dialog"],
    html[data-theme="dark"] [class*="modalBox"],
    html[data-theme="dark"] [class*="modalContent"],
    html[data-theme="dark"] [class*="cityModalCard"],
    html[data-theme="dark"] [class*="dropdownMenu"],
    html[data-theme="dark"] [class*="cityDropdown"] {
      background-color: #121D32 !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 24px 50px -10px rgba(0, 0, 0, 0.75) !important;
    }

    /* PatientPageBanner across sub-pages */
    html[data-theme="dark"] [class*="bannerCard"] {
      background: linear-gradient(135deg, #131E35 0%, #0E1626 100%) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
    }

    /* Tables */
    html[data-theme="dark"] [class*="tableHeaderRow"] {
      background-color: #16243E !important;
    }

    html[data-theme="dark"] [class*="tableDataRow"] {
      background-color: #121D32 !important;
      border-top-color: rgba(255, 255, 255, 0.06) !important;
    }

    html[data-theme="dark"] [class*="tableDataRow"]:hover {
      background-color: #16243E !important;
    }

    /* Scrollbars */
    html[data-theme="dark"] ::-webkit-scrollbar-track {
      background: #070B14 !important;
    }
    html[data-theme="dark"] ::-webkit-scrollbar-thumb {
      background: #1E293B !important;
      border-radius: 4px;
    }
  `;
};

// Immediate web initialization
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const isDarkStored = typeof localStorage !== 'undefined' && localStorage.getItem('@unnathi_dark_mode') === 'true';
    if (isDarkStored) {
      injectWebDarkModeCSS(true);
    }
  } catch (e) {}
}

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
      } else {
        setIsDarkMode(false);
        injectWebDarkModeCSS(false);
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
          localStorage.setItem('@mediunify_light_theme_active_v1', 'true');
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
    background: isDarkMode ? '#080E1A' : '#FAFCFD',
    card: isDarkMode ? '#111C35' : '#FFFFFF',
    cardSubtle: isDarkMode ? '#16223D' : '#F0F9FF',
    headerBg: isDarkMode ? '#0B132B' : '#FFFFFF',
    footerBg: isDarkMode ? '#0B132B' : '#E0ECF6',
    text: isDarkMode ? '#F8FAFC' : '#1E3A8A',
    textPrimary: isDarkMode ? '#F8FAFC' : '#0F172A',
    textSecondary: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#DCE7EC',
    divider: isDarkMode ? 'rgba(255, 255, 255, 0.07)' : '#F1F8FB',
    inputBg: isDarkMode ? '#111C35' : '#FAFCFD',
    inputBorder: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
    badgeBg: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    primary: isDarkMode ? '#00E5B0' : '#00B894',
    teal: isDarkMode ? '#00E5B0' : '#00B894',
    navyBlue: isDarkMode ? '#60A5FA' : '#1E3A8A',
    aqua: isDarkMode ? '#38BDF8' : '#00C2CB',
    freshGreen: isDarkMode ? '#34D399' : '#7BC96F',
    coral: isDarkMode ? '#FB923C' : '#FF7F50',
    amber: isDarkMode ? '#FBBF24' : '#D97706',
    red: isDarkMode ? '#F87171' : '#DC2626',
    success: isDarkMode ? '#00E5B0' : '#059669',
    warning: isDarkMode ? '#FBBF24' : '#D97706',
    error: isDarkMode ? '#F87171' : '#DC2626',
    white: isDarkMode ? '#F8FAFC' : '#FFFFFF',
    inputPlaceholder: isDarkMode ? '#64748B' : '#94A3B8',
    slate: isDarkMode ? '#94A3B8' : '#64748B',
    modalBg: isDarkMode ? '#111C35' : '#FFFFFF',
    statusBar: isDarkMode ? 'light-content' : 'dark-content',
    statusBarBg: isDarkMode ? '#0B132B' : '#FFFFFF',
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
        inputPlaceholder: '#94A3B8',
        amber: '#D97706',
        red: '#DC2626',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        white: '#FFFFFF',
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
