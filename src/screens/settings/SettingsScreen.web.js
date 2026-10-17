import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebHeader from '../../components/web/WebHeader';
import WebFooter from '../../components/web/WebFooter';
import WebBackButton from '../../components/web/WebBackButton';
import {
  getActivePatient,
  getPatientSettings,
  savePatientSettings,
} from '../../data/patientDashboardData';
import { useTheme } from '../../context/ThemeContext';
import SettingsScreenMobile from './SettingsScreen.js';
import { isDesktopLayout } from '../../utils/responsiveLayoutHelper';

const LANGUAGES = [
  { code: 'en', label: 'English (India)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
];
const COMM_CHANNELS = ['WhatsApp & SMS', 'SMS Only', 'WhatsApp Only', 'Email Only'];

const SettingsScreenWeb = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { language, changeLanguage, t, isIndic, isDarkMode, toggleTheme, theme } = useTheme();

  const [patient, setPatient] = useState(null);
  const [settings, setSettings] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const p = await getActivePatient();
      setPatient(p);
      const s = await getPatientSettings();
      setSettings(s);
    } catch (e) {
      console.warn('Error loading settings:', e);
    }
  };

  const handleToggle = async (section, key) => {
    if (!settings) return;
    const updated = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: !settings[section][key],
      },
    };
    setSettings(updated);
    await savePatientSettings(updated);
    showToast('Preference updated successfully.');
  };

  const handleUpdatePreference = async (key, val) => {
    if (!settings) return;
    const updated = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: val,
      },
    };
    setSettings(updated);
    await savePatientSettings(updated);
    showToast('Setting saved.');
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
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
      await AsyncStorage.setItem('isLoggedIn', 'false');
    } catch (e) {}

    // Navigate to Login screen
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      try {
        parent.navigate('Auth', { screen: 'Login' });
        return;
      } catch (e) {}
    }
    navigation?.navigate('Auth', { screen: 'Login' });
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ paddingVertical: 100, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#64748B' }}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Notification Toast */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* Breadcrumb Bar */}
        <View style={styles.breadcrumbBar}>
          <View style={[styles.innerContainer, styles.breadcrumbContent]}>
            <TouchableOpacity onPress={() => navigation?.navigate('Home')} activeOpacity={0.7} style={styles.breadcrumbItem}>
              <Ionicons name="home-outline" size={14} color="#64748B" />
              <Text style={styles.breadcrumbText}>Home</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
            <Text style={styles.breadcrumbActive}>Patient Account Settings</Text>
          </View>
        </View>

        {/* Full-Width Hero Banner */}
        <View style={styles.heroBannerWrap}>
          <View style={[styles.innerContainer, styles.heroSection]}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <View style={styles.categoryBadgeRow}>
                <View style={styles.gearIconBadge}>
                  <Ionicons name="settings" size={16} color="#00B894" />
                </View>
                <Text style={styles.categoryBadgeText}>Preferences & Appearance</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 4 }}>
                <WebBackButton
                  onPress={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate('Home')}
                />
                <Text style={[styles.pageTitle, { marginTop: 0, marginBottom: 0 }]}>Account Settings</Text>
              </View>
              <Text style={styles.pageSubtitle}>
                Manage SMS/email notification alerts, privacy controls, consultation reminders, and app appearance.
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.innerContainer, { paddingTop: 8, paddingBottom: 60 }]}>

          {/* Settings Grid */}
          <View style={styles.settingsGrid}>
            {/* 1. NOTIFICATION PREFERENCES */}
            <View style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: '#E6F8F4' }]}>
                  <Ionicons name="notifications" size={20} color="#00B894" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Notification Preferences</Text>
                  <Text style={styles.cardSubtitle}>Choose how MediUnify reaches you with healthcare updates</Text>
                </View>
              </View>

              <View style={styles.togglesList}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Email Notifications</Text>
                    <Text style={styles.toggleSub}>Lab reports, appointment invoices, and discharge summaries</Text>
                  </View>
                  <Switch
                    value={settings.notifications?.emailNotifications}
                    onValueChange={() => handleToggle('notifications', 'emailNotifications')}
                    trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>SMS Alerts</Text>
                    <Text style={styles.toggleSub}>Live medicine delivery status and OTP verifications</Text>
                  </View>
                  <Switch
                    value={settings.notifications?.smsNotifications}
                    onValueChange={() => handleToggle('notifications', 'smsNotifications')}
                    trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>WhatsApp Concierge Updates</Text>
                    <Text style={styles.toggleSub}>Fast clinic check-in tokens, doctor video room links, and parking passes</Text>
                  </View>
                  <Switch
                    value={settings.notifications?.whatsappUpdates}
                    onValueChange={() => handleToggle('notifications', 'whatsappUpdates')}
                    trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Appointment Reminders (24h & 1h Before)</Text>
                    <Text style={styles.toggleSub}>Receive automated schedule alarms before doctor consultations</Text>
                  </View>
                  <Switch
                    value={settings.notifications?.appointmentReminders24h}
                    onValueChange={() => handleToggle('notifications', 'appointmentReminders24h')}
                    trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Medicine Refill Reminders</Text>
                    <Text style={styles.toggleSub}>Automatic reminders when chronic medicine supply is running low</Text>
                  </View>
                  <Switch
                    value={settings.notifications?.medicineRefillReminders}
                    onValueChange={() => handleToggle('notifications', 'medicineRefillReminders')}
                    trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* 2. PRIVACY & HEALTH DATA ACCESS */}
            <View style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Privacy & Health Records Access</Text>
                  <Text style={styles.cardSubtitle}>Control medical record sharing with consulting doctors</Text>
                </View>
              </View>

              <View style={styles.togglesList}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Share Health Vault with Consulting Doctors</Text>
                    <Text style={styles.toggleSub}>Allows specialist doctors to review past lab reports and scans during appointments</Text>
                  </View>
                  <Switch
                    value={settings.privacy?.shareRecordsWithConsultingDoctors}
                    onValueChange={() => handleToggle('privacy', 'shareRecordsWithConsultingDoctors')}
                    trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* 3. LANGUAGE & COMMUNICATION PREFERENCES */}
            <View style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: '#FAF5FF' }]}>
                  <Ionicons name="language" size={20} color="#7E22CE" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Language & Communication Preferences</Text>
                  <Text style={styles.cardSubtitle}>Customize regional language for app notifications & prescriptions</Text>
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.inputSectionLabel}>{t('language', 'Preferred Language')}</Text>
                <View style={styles.pillsRow}>
                  {LANGUAGES.map((lang) => {
                    const isSel = language === lang.code;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        style={[styles.prefChip, isSel && styles.prefChipActive]}
                        onPress={() => {
                          changeLanguage(lang.code);
                          handleUpdatePreference('language', lang.label);
                        }}
                      >
                        <Text style={[styles.prefChipText, isSel && styles.prefChipTextActive]}>
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.inputSectionLabel, { marginTop: 16 }]}>Primary Notification Channel</Text>
                <View style={styles.pillsRow}>
                  {COMM_CHANNELS.map((ch) => {
                    const isSel = settings?.preferences?.communicationChannel === ch;
                    return (
                      <TouchableOpacity
                        key={ch}
                        style={[styles.prefChip, isSel && styles.prefChipActive]}
                        onPress={() => handleUpdatePreference('communicationChannel', ch)}
                      >
                        <Text style={[styles.prefChipText, isSel && styles.prefChipTextActive]}>
                          {ch}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 4. APP PREFERENCES & APPEARANCE */}
            <View style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: '#E6F8F4' }]}>
                  <Ionicons name="moon" size={20} color="#00B894" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>App Preferences & Appearance</Text>
                  <Text style={styles.cardSubtitle}>Display theme, dark mode, and active session controls</Text>
                </View>
              </View>

              <View style={styles.togglesList}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Dark Appearance</Text>
                    <Text style={styles.toggleSub}>Sleek dark mode for low-light environments throughout MediUnify</Text>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={toggleTheme}
                    trackColor={{ false: '#CBD5E1', true: '#00B894' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View style={[styles.securityActionsRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14 }]}>
                <TouchableOpacity
                  style={styles.logoutActionBtn}
                  onPress={() => setIsLogoutModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={16} color="#FF7F50" style={{ marginRight: 6 }} />
                  <Text style={styles.logoutActionBtnText}>Logout of Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* =========================================================
          LOGOUT CONFIRMATION MODAL
      ========================================================= */}
      <Modal visible={isLogoutModalOpen} transparent animationType="fade" onRequestClose={() => setIsLogoutModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: '#FF7F50' }]}>Logout from MediUnify</Text>
                <Text style={styles.modalSubtitle}>Terminate active session on this device</Text>
              </View>
              <TouchableOpacity onPress={() => setIsLogoutModalOpen(false)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.logoutWarnBox}>
                <Ionicons name="alert-circle" size={24} color="#FF7F50" style={{ marginRight: 10 }} />
                <Text style={styles.logoutWarnText}>
                  Are you sure you want to logout? You will need to sign in with your registered mobile number or email to access your appointments and health vault.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsLogoutModalOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Stay Logged In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: '#FF7F50' }]} onPress={handleConfirmLogout}>
                <Text style={styles.modalPrimaryBtnText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const SettingsScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  if (!isDesktopLayout(width)) {
    return <SettingsScreenMobile {...props} />;
  }
  return <SettingsScreenWeb {...props} />;
};

export default SettingsScreenResponsive;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  breadcrumbBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  breadcrumbContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  breadcrumbActive: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 9999,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  heroBannerWrap: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 32,
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gearIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00B894',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#647488',
    marginTop: 6,
    maxWidth: 680,
    lineHeight: 21,
  },
  settingsGrid: {
    gap: 20,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 1,
  },
  togglesList: {
    marginTop: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 16,
  },
  toggleLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  inputSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prefChipActive: {
    backgroundColor: '#E6F8F4',
    borderColor: '#00B894',
  },
  prefChipText: {
    fontSize: 12.5,
    color: '#334155',
  },
  prefChipTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  securityActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  changePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  changePassBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  logoutActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD7C7',
    backgroundColor: '#FFF2ED',
  },
  logoutActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF7F50',
  },
  // Modal Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseIcon: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  modalPassInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  logoutWarnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF2ED',
    borderWidth: 1,
    borderColor: '#FFD7C7',
    borderRadius: 8,
    padding: 14,
  },
  logoutWarnText: {
    flex: 1,
    fontSize: 13,
    color: '#FF7F50',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
});
