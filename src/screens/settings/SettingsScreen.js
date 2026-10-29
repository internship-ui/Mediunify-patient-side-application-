import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  StatusBar,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../utils/alert';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const SettingsScreen = ({ navigation }) => {
  const {
    isDarkMode,
    toggleDarkMode,
    language,
    changeLanguage,
    t,
    notifications,
    updateNotifications,
    biometricEnabled,
    toggleBiometric,
    theme,
    LANGUAGES,
  } = useTheme();
  const styles = useThemedStyles(baseStyles);

  // Modals state
  const [showLangModal, setShowLangModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showAppPrefModal, setShowAppPrefModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Address state
  const [savedAddress, setSavedAddress] = useState('Flat 402, Green Meadows, Mysuru');
  const [addressInput, setAddressInput] = useState('Flat 402, Green Meadows, Mysuru');

  // Membership status
  const [membershipBadge, setMembershipBadge] = useState('Gold Active');

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Cache & Feedback
  const [toastMessage, setToastMessage] = useState('');
  const [cacheSize, setCacheSize] = useState('28.4 MB');

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      const storedMembership = await AsyncStorage.getItem('@unnathi_user_membership');
      if (storedMembership) {
        try {
          const parsed = JSON.parse(storedMembership);
          if (parsed?.tier) {
            setMembershipBadge(`${parsed.tier} Active`);
          } else if (typeof parsed === 'string') {
            setMembershipBadge(`${parsed} Active`);
          }
        } catch (e) {
          setMembershipBadge(`${storedMembership} Active`);
        }
      }
      const storedAddr = await AsyncStorage.getItem('@unnathi_user_address');
      if (storedAddr && storedAddr.trim()) {
        setSavedAddress(storedAddr.trim());
        setAddressInput(storedAddr.trim());
      }
    } catch (e) {}
  };

  const showFeedback = (msg) => {
    setToastMessage(msg);
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    }
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleSaveAddress = async () => {
    if (!addressInput.trim()) {
      showAlert('Address Required', 'Please enter your address.');
      return;
    }
    try {
      await AsyncStorage.setItem('@unnathi_user_address', addressInput.trim());
      setSavedAddress(addressInput.trim());
      setShowAddressModal(false);
      showFeedback('Address saved successfully!');
    } catch (e) {
      showAlert('Error', 'Failed to save address.');
    }
  };

  const handleClearCache = () => {
    showAlert(
      'Clear Cache',
      `Do you want to clear temporary offline cache, search suggestions, and temporary files (${cacheSize})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const tempKeys = allKeys.filter(
                (k) =>
                  k.startsWith('@unnathi_temp_') ||
                  k.startsWith('@unnathi_search_history') ||
                  k.startsWith('@unnathi_cached_')
              );
              if (tempKeys.length > 0) {
                await AsyncStorage.multiRemove(tempKeys);
              }
              setCacheSize('0.0 KB');
              showFeedback('Cache cleared successfully!');
            } catch (e) {
              console.log('Error clearing cache:', e);
            }
          },
        },
      ]
    );
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showAlert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('Weak Password', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Mismatch', 'New password and confirm password do not match.');
      return;
    }

    try {
      const storedPrimary = await AsyncStorage.getItem('@unnathi_primary_user');
      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) {
        try {
          registeredUsers = JSON.parse(regUsersStr);
        } catch (e) {}
      }

      let activeEmail = '';
      if (storedPrimary) {
        const parsed = JSON.parse(storedPrimary);
        activeEmail = (parsed.email || '').toLowerCase().trim();
      }

      if (!activeEmail) {
        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (storedEmail) activeEmail = storedEmail.toLowerCase().trim();
      }

      if (activeEmail && registeredUsers[activeEmail]) {
        const currentSavedPass = registeredUsers[activeEmail].password;
        if (currentSavedPass && currentSavedPass !== oldPassword) {
          showAlert('Incorrect Password', 'The current password you entered is incorrect.');
          return;
        }

        registeredUsers[activeEmail].password = newPassword;
        await AsyncStorage.setItem('@unnathi_registered_users', JSON.stringify(registeredUsers));
      }

      if (storedPrimary) {
        const parsed = JSON.parse(storedPrimary);
        parsed.password = newPassword;
        await AsyncStorage.setItem('@unnathi_primary_user', JSON.stringify(parsed));
      }

      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showAlert('Password Updated!', 'Your account password has been updated securely.');
      showFeedback('Password changed successfully!');
    } catch (e) {
      console.log('Error updating password:', e);
      showAlert('Error', 'Could not update password. Please try again.');
    }
  };

  const handleLogout = () => {
    const doLogout = async () => {
      try {
        await AsyncStorage.multiRemove([
          'userToken',
          'isLoggedIn',
          '@unnathi_active_patient',
          'user',
          'userName',
          'userEmail',
          'userPhone',
        ]);
      } catch (e) {
        console.log('Logout storage clear err:', e);
      }

      let navigated = false;
      const parent = navigation?.getParent?.();
      if (parent?.reset) {
        try {
          parent.reset({
            index: 0,
            routes: [{ name: 'Auth', state: { routes: [{ name: 'Login' }] } }],
          });
          navigated = true;
        } catch (e) {}
      }
      if (!navigated && parent?.navigate) {
        try {
          parent.navigate('Auth', { screen: 'Login' });
          navigated = true;
        } catch (e) {}
      }
      if (!navigated && navigation?.reset) {
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
          navigated = true;
        } catch (e) {}
      }
      if (!navigated && navigation?.navigate) {
        try {
          navigation.navigate('Auth', { screen: 'Login' });
          navigated = true;
        } catch (e) {}
      }
    };

    showAlert('Log Out', 'Are you sure you want to log out from MediUnify?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: doLogout,
      },
    ]);
  };

  const currentLangObj = LANGUAGES?.find((l) => l.code === language) || {
    code: 'en',
    name: 'English',
    native: 'English',
    flag: '🇺🇸',
  };

  const isNotificationsOn = Boolean(notifications?.push || notifications?.whatsapp || notifications?.sms);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background || '#F8FAFC' }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBg || '#FFFFFF'}
      />

      {/* ==================================================
          1. SETTINGS PAGE HEADER
      ================================================== */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.headerBg || '#FFFFFF', borderBottomColor: theme.border || '#E2E8F0' },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDarkMode ? '#16223D' : '#F1F5F9' }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
          {t('settings', 'Settings')}
        </Text>

        <View style={{ width: 36 }} />
      </View>

      {/* FEEDBACK TOAST BANNER */}
      {!!toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentWrap}>
          {/* ==================================================
              SECTION 1: ACCOUNT
          ================================================== */}
          <Text style={styles.sectionHeaderTitle}>{t('settings_account', 'ACCOUNT')}</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            {/* 👤 Personal Information */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => {
                if (navigation?.navigate) {
                  navigation.navigate('EditProfile');
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="person-outline" size={18} color="#2563EB" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('personal_info', 'Personal Information')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9' }]} />

            {/* 👥 Family Members */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => {
                if (navigation?.navigate) {
                  navigation.navigate('FamilyProfiles');
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#F0FDFA' }]}>
                  <Ionicons name="people-outline" size={18} color="#0D9488" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('family_members', 'Family Members')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9' }]} />

            {/* 📍 Address */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setShowAddressModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="location-outline" size={18} color="#EA580C" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('address', 'Address')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9' }]} />

            {/* 🏅 Membership */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => {
                if (navigation?.navigate) {
                  navigation.navigate('Membership');
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="ribbon-outline" size={18} color="#D97706" />
                </View>
                <Text
                  style={[styles.settingName, { color: theme.text || '#0F172A', flexShrink: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t('membership', 'Care Membership')}
                </Text>
              </View>
              <View style={styles.badgeRightWrap}>
                <View style={styles.membershipBadgePill}>
                  <Ionicons name="shield-checkmark" size={11} color="#B45309" style={{ marginRight: 3 }} />
                  <Text style={styles.membershipBadgeText}>{membershipBadge}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ==================================================
              SECTION 2: PREFERENCES
          ================================================== */}
          <Text style={styles.sectionHeaderTitle}>{t('settings_preferences', 'PREFERENCES')}</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            {/* 🔔 Notifications */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setShowNotifModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#059669" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('notifications', 'Notifications')}
                </Text>
              </View>
              <View style={styles.badgeRightWrap}>
                <Text style={[styles.statusText, { color: isNotificationsOn ? '#00B894' : '#94A3B8' }]}>
                  {isNotificationsOn ? t('status_on', 'On') : t('status_off', 'Off')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9' }]} />

            {/* 🌐 Language */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setShowLangModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#E6F8F4' }]}>
                  <Ionicons name="globe-outline" size={18} color="#00B894" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('language', 'Language')}
                </Text>
              </View>
              <View style={styles.badgeRightWrap}>
                <Text style={styles.statusText}>
                  {currentLangObj.name || 'English'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9' }]} />

            {/* ⚙ App Preferences */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setShowAppPrefModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="options-outline" size={18} color="#4F46E5" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('app_preferences', 'App Preferences')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* ==================================================
              SECTION 3: PRIVACY & SECURITY
          ================================================== */}
          <Text style={styles.sectionHeaderTitle}>{t('privacy_security', 'PRIVACY & SECURITY')}</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            {/* 🔒 Privacy */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setShowPrivacyModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('privacy', 'Privacy')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9' }]} />

            {/* 🔐 Login & Security */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setShowPasswordModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#FAF5FF' }]}>
                  <Ionicons name="key-outline" size={18} color="#9333EA" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('login_security', 'Login & Security')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* ==================================================
              SECTION 4: SUPPORT
          ================================================== */}
          <Text style={styles.sectionHeaderTitle}>{t('support', 'SUPPORT')}</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            {/* ❓ Help & Support */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => {
                if (navigation?.navigate) {
                  navigation.navigate('HelpSupport');
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="help-circle-outline" size={18} color="#D97706" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('help_support', 'Help & Support')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9' }]} />

            {/* ℹ About MediUnify */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setShowAboutModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.settingName, { color: theme.text || '#0F172A' }]}>
                  {t('about_mediunify', 'About MediUnify')}
                </Text>
              </View>
              <View style={styles.badgeRightWrap}>
                <Text style={styles.statusText}>v2.4.0</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ==================================================
              5. LOGOUT BUTTON (Subtle Danger Card)
          ================================================== */}
          <TouchableOpacity
            style={[
              styles.logoutButtonCard,
              { backgroundColor: isDarkMode ? '#7F1D1D22' : '#FEF2F2', borderColor: isDarkMode ? '#991B1B44' : '#FEE2E2' },
            ]}
            activeOpacity={0.85}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={19} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutButtonText}>{t('logout', 'Log Out')}</Text>
          </TouchableOpacity>

          <Text style={[styles.versionFooterText, { color: theme.textSecondary || '#94A3B8' }]}>
            MediUnify Healthcare • Version 2.4.0 (Build 240)
          </Text>
        </View>
      </ScrollView>

      {/* ==================================================
          LANGUAGE SELECTOR MODAL
      ================================================== */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>
                  {t('select_language', 'Select Language')}
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary || '#64748B' }]}>
                  {t('choose_language', 'Choose your preferred regional language')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}
                onPress={() => setShowLangModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.text || '#0F172A'} />
              </TouchableOpacity>
            </View>

            {LANGUAGES?.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.langOption,
                    {
                      backgroundColor: isSelected
                        ? isDarkMode
                          ? '#064E3B'
                          : '#E6F8F4'
                        : isDarkMode
                        ? '#0F172A'
                        : '#F8FAFC',
                      borderColor: isSelected ? colors.primary || '#00B894' : theme.border || '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    changeLanguage(lang.code);
                    setShowLangModal(false);
                    showFeedback(`Language set to ${lang.native}!`);
                  }}
                >
                  <View style={styles.langOptionLeft}>
                    <View style={[styles.langFlagBadge, { backgroundColor: isSelected ? colors.primary || '#00B894' : '#E2E8F0' }]}>
                      <Text style={{ fontSize: 14 }}>{lang.flag}</Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.langNativeText,
                          { color: isSelected ? colors.primary || '#00B894' : theme.text || '#0F172A' },
                        ]}
                      >
                        {lang.native}
                      </Text>
                      <Text style={[styles.langSubName, { color: theme.textSecondary || '#64748B' }]}>
                        {lang.name}
                      </Text>
                    </View>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary || '#00B894'} />
                  ) : (
                    <View style={[styles.radioCircle, { borderColor: theme.border || '#CBD5E1' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ==================================================
          NOTIFICATIONS SETTINGS MODAL
      ================================================== */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>
                  Notification Preferences
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary || '#64748B' }]}>
                  Manage how you receive alerts and updates
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}
                onPress={() => setShowNotifModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.text || '#0F172A'} />
              </TouchableOpacity>
            </View>

            {/* Push Notifications Switch */}
            <View style={styles.modalToggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleRowTitle, { color: theme.text || '#0F172A' }]}>Push Notifications</Text>
                <Text style={styles.toggleRowDesc}>Appointment reminders & live status</Text>
              </View>
              <Switch
                value={notifications?.push}
                onValueChange={(val) => {
                  updateNotifications('push', val);
                  showFeedback(val ? 'Push notifications enabled' : 'Push notifications disabled');
                }}
                trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9', marginVertical: 8 }]} />

            {/* WhatsApp Updates Switch */}
            <View style={styles.modalToggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleRowTitle, { color: theme.text || '#0F172A' }]}>WhatsApp Updates</Text>
                <Text style={styles.toggleRowDesc}>Receive diagnostic reports & e-prescriptions</Text>
              </View>
              <Switch
                value={notifications?.whatsapp}
                onValueChange={(val) => {
                  updateNotifications('whatsapp', val);
                  showFeedback(val ? 'WhatsApp updates on' : 'WhatsApp updates off');
                }}
                trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9', marginVertical: 8 }]} />

            {/* SMS Alerts Switch */}
            <View style={styles.modalToggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleRowTitle, { color: theme.text || '#0F172A' }]}>SMS Alerts</Text>
                <Text style={styles.toggleRowDesc}>OTPs & booking confirmation messages</Text>
              </View>
              <Switch
                value={notifications?.sms}
                onValueChange={(val) => {
                  updateNotifications('sms', val);
                  showFeedback(val ? 'SMS alerts enabled' : 'SMS alerts disabled');
                }}
                trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryActionBtn}
              onPress={() => setShowNotifModal(false)}
            >
              <Text style={styles.modalPrimaryActionBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          APP PREFERENCES MODAL
      ================================================== */}
      <Modal
        visible={showAppPrefModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppPrefModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>
                  App Preferences
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary || '#64748B' }]}>
                  Display, appearance, and local storage
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}
                onPress={() => setShowAppPrefModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.text || '#0F172A'} />
              </TouchableOpacity>
            </View>

            {/* Dark Mode Switch */}
            <View style={styles.modalToggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleRowTitle, { color: theme.text || '#0F172A' }]}>Dark Appearance</Text>
                <Text style={styles.toggleRowDesc}>Sleek dark mode for low-light environments</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={(val) => {
                  toggleDarkMode(val);
                  showFeedback(val ? 'Dark mode enabled' : 'Light mode enabled');
                }}
                trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.border || '#F1F5F9', marginVertical: 8 }]} />

            {/* Clear Cache */}
            <TouchableOpacity
              style={styles.modalActionRow}
              onPress={() => {
                setShowAppPrefModal(false);
                setTimeout(handleClearCache, 250);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleRowTitle, { color: theme.text || '#0F172A' }]}>Clear Offline Cache</Text>
                <Text style={styles.toggleRowDesc}>Free up temporary storage ({cacheSize})</Text>
              </View>
              <Ionicons name="trash-outline" size={18} color="#FF7F50" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalPrimaryActionBtn}
              onPress={() => setShowAppPrefModal(false)}
            >
              <Text style={styles.modalPrimaryActionBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          ADDRESS MODAL
      ================================================== */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>
                  Manage Home Address
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary || '#64748B' }]}>
                  For home nursing, medicine delivery & sample pickup
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}
                onPress={() => setShowAddressModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.text || '#0F172A'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary || '#64748B' }]}>
              Delivery / Home Care Address
            </Text>
            <View style={[styles.inputBoxWrap, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: theme.border || '#E2E8F0' }]}>
              <TextInput
                style={[styles.modalInput, { color: theme.text || '#0F172A', minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Enter Flat / House No, Street, City, Pincode"
                placeholderTextColor={theme.textSecondary || '#94A3B8'}
                multiline
                value={addressInput}
                onChangeText={setAddressInput}
              />
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryActionBtn}
              onPress={handleSaveAddress}
            >
              <Text style={styles.modalPrimaryActionBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          PRIVACY MODAL
      ================================================== */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>
                  Privacy & Health Data
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary || '#64748B' }]}>
                  How MediUnify safeguards your records
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.text || '#0F172A'} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoPillBlock}>
              <Ionicons name="lock-closed" size={16} color="#00B894" />
              <Text style={styles.infoPillBlockText}>
                256-Bit AES Encryption for all medical records and lab reports.
              </Text>
            </View>

            <View style={styles.infoPillBlock}>
              <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
              <Text style={styles.infoPillBlockText}>
                HIPAA & DISHA compliant patient consent architecture.
              </Text>
            </View>

            <View style={styles.infoPillBlock}>
              <Ionicons name="eye-off" size={16} color="#D97706" />
              <Text style={styles.infoPillBlockText}>
                No unauthorized third-party sharing. You own your health data.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryActionBtn}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.modalPrimaryActionBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* ==================================================
          ABOUT MEDIUNIFY MODAL
      ================================================== */}
      <Modal
        visible={showAboutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>
                  About MediUnify
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary || '#64748B' }]}>
                  Comprehensive Unified Healthcare Ecosystem
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}
                onPress={() => setShowAboutModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.text || '#0F172A'} />
              </TouchableOpacity>
            </View>

            <View style={styles.aboutInfoCard}>
              <Text style={[styles.aboutAppTitle, { color: colors.primary || '#00B894' }]}>MediUnify</Text>
              <Text style={styles.aboutAppVersion}>Version 2.4.0 (Production Release)</Text>
              <Text style={styles.aboutAppDesc}>
                Bringing hospital-grade clinical diagnostics, specialist doctors, video consultations, home nursing care, and pharmacy delivery to your fingertips.
              </Text>
              <View style={styles.aboutDivider} />
              <Text style={styles.aboutCopyrightText}>© 2026 Unnathi Healthcare. All rights reserved.</Text>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryActionBtn}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.modalPrimaryActionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          CHANGE PASSWORD MODAL
      ================================================== */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#FFFFFF', borderColor: theme.border || '#E2E8F0' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>
                  Change Password
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary || '#64748B' }]}>
                  Secure your healthcare records & account
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Ionicons name="close" size={18} color={theme.text || '#0F172A'} />
              </TouchableOpacity>
            </View>

            {/* CURRENT PASSWORD */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary || '#64748B' }]}>
              Current Password
            </Text>
            <View style={[styles.inputBoxWrap, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: theme.border || '#E2E8F0' }]}>
              <TextInput
                style={[styles.modalInput, { color: theme.text || '#0F172A' }]}
                placeholder="Enter current password"
                placeholderTextColor={theme.textSecondary || '#94A3B8'}
                secureTextEntry={!showOldPass}
                value={oldPassword}
                onChangeText={setOldPassword}
              />
              <TouchableOpacity onPress={() => setShowOldPass(!showOldPass)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showOldPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textSecondary || '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            {/* NEW PASSWORD */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary || '#64748B' }]}>
              New Password
            </Text>
            <View style={[styles.inputBoxWrap, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: theme.border || '#E2E8F0' }]}>
              <TextInput
                style={[styles.modalInput, { color: theme.text || '#0F172A' }]}
                placeholder="Min 6 characters"
                placeholderTextColor={theme.textSecondary || '#94A3B8'}
                secureTextEntry={!showNewPass}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showNewPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textSecondary || '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            {/* CONFIRM PASSWORD */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary || '#64748B' }]}>
              Confirm New Password
            </Text>
            <View style={[styles.inputBoxWrap, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: theme.border || '#E2E8F0' }]}>
              <TextInput
                style={[styles.modalInput, { color: theme.text || '#0F172A' }]}
                placeholder="Re-enter new password"
                placeholderTextColor={theme.textSecondary || '#94A3B8'}
                secureTextEntry={!showConfirmPass}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textSecondary || '#94A3B8'}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryActionBtn}
              activeOpacity={0.85}
              onPress={handleUpdatePassword}
            >
              <Text style={styles.modalPrimaryActionBtnText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
    paddingLeft: 4,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 52,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  membershipBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  membershipBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  rowDivider: {
    height: 1,
    marginLeft: 58,
  },
  logoutButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 24,
    shadowColor: '#EF4444',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  versionFooterText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },

  // Toast
  toastBanner: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    zIndex: 99,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langFlagBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langNativeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  langSubName: {
    fontSize: 11,
    marginTop: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRowDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoPillBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoPillBlockText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  aboutInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  aboutAppTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  aboutAppVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  aboutAppDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  aboutCopyrightText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  inputBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  modalInput: {
    flex: 1,
    minHeight: 44,
    fontSize: 13,
  },
  modalPrimaryActionBtn: {
    backgroundColor: '#00B894',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalPrimaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
