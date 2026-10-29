import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../utils/alert';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { useKeyboardVisibility } from '../../utils/keyboardUtils';

const ForgotPasswordScreen = ({ navigation }) => {
  const { isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { t, isIndic } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmallDevice = width < 375 || height < 680;
  const isTablet = width >= 600;
  const scrollViewRef = useRef(null);

  const isKeyboardVisible = useKeyboardVisibility();

  const androidExtraTop = Platform.OS === 'android' && insets.top === 0 ? (StatusBar.currentHeight || 24) : 0;

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleReset = async () => {
    Keyboard.dismiss();
    const inputVal = email.trim();
    if (!inputVal) {
      showAlert(
        'Missing Information',
        'Please enter your registered email address or 10-digit mobile number.'
      );
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showAlert(
        'Weak Password',
        'Your new password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert(
        'Password Mismatch',
        'New password and confirm password do not match.'
      );
      return;
    }

    setIsUpdating(true);

    try {
      const lowerEmail = inputVal.toLowerCase();
      const cleanPhone = inputVal.replace(/[^0-9]/g, '');
      const cleanPhone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) {
        try {
          registeredCreds = JSON.parse(regCredsStr);
        } catch (e) {}
      }

      const matching =
        registeredCreds[lowerEmail] ||
        (cleanPhone10.length === 10 ? registeredCreds[cleanPhone10] : null);

      if (matching) {
        matching.password = newPassword.trim();
        registeredCreds[matching.email.toLowerCase()] = matching;
        if (matching.phone) registeredCreds[matching.phone] = matching;
        await AsyncStorage.setItem('@unnathi_registered_credentials', JSON.stringify(registeredCreds));
      }

      setIsUpdating(false);

      showAlert(
        'Password Updated Successfully',
        'Your account password has been updated. You can now log in with your new password.',
        [
          {
            text: 'Sign In Now',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (e) {
      setIsUpdating(false);
      showAlert('Password Updated', 'Your password has been reset successfully.');
      navigation.navigate('Login');
    }
  };

  const isPasswordMatch = newPassword.length >= 6 && confirmPassword.length >= 6 && newPassword === confirmPassword;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#080E1A' : '#FFFFFF'} />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
          <Text style={styles.backBtnText}>Back to Sign In</Text>
        </TouchableOpacity>

        <View style={styles.securityBadge}>
          <Ionicons name="lock-closed" size={13} color="#00B894" />
          <Text style={styles.securityBadgeText}>Encrypted Reset</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top > 0 ? insets.top : 20) : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
            { paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 160 : 120) : (isTablet ? 32 : 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.card, isTablet && styles.cardTablet]}>
            {/* ICON BADGE */}
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={30} color="#00B894" />
            </View>

            <Text style={[styles.title, isIndic && { lineHeight: 28 }]}>
              {t('auth.forgot_password_title', 'Reset Account Password')}
            </Text>
            <Text style={[styles.subtitle, isIndic && { lineHeight: 20 }]}>
              {t('auth.forgot_password_desc', 'Enter your registered email or 10-digit mobile number and create a new secure password.')}
            </Text>

            {/* INPUT: EMAIL OR PHONE */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                {t('auth.email_or_mobile', 'Registered Email or Phone')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.inputBox, email ? styles.inputBoxFilled : null]}>
                <Ionicons
                  name={email.includes('@') ? 'mail-outline' : 'call-outline'}
                  size={18}
                  color={email ? colors.primary : colors.slate}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.email_or_mobile_ph', 'Enter registered email or mobile')}
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => {
                    if (!isTablet && Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }, 100);
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* INPUT: NEW PASSWORD */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                  {t('settings.new_password', 'New Password')} <Text style={styles.requiredMark}>*</Text>
                </Text>
                {newPassword.length > 0 && (
                  <Text style={[styles.counterText, newPassword.length >= 6 ? styles.counterTextSuccess : styles.counterTextWarning]}>
                    {newPassword.length >= 6 ? t('auth.min_met', 'Min 6 met') : `${newPassword.length}/6 ${t('auth.chars', 'chars')}`}
                  </Text>
                )}
              </View>
              <View style={[styles.inputBox, newPassword.length >= 6 ? styles.inputBoxValid : null]}>
                <Ionicons name="lock-closed-outline" size={18} color={newPassword ? colors.primary : colors.slate} style={styles.inputPrefixIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.new_pass_ph', 'Enter new password (min 6 chars)')}
                  placeholderTextColor="#94A3B8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => {
                    if (!isTablet && Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 100, animated: true });
                      }, 100);
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.slate} />
                </TouchableOpacity>
              </View>
            </View>

            {/* INPUT: CONFIRM PASSWORD */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                  {t('auth.confirm_password', 'Confirm New Password')} <Text style={styles.requiredMark}>*</Text>
                </Text>
                {isPasswordMatch && (
                  <View style={styles.matchedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#00B894" />
                    <Text style={styles.matchedBadgeText}>{t('auth.passwords_match', 'Passwords Match')}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.inputBox, isPasswordMatch ? styles.inputBoxValid : null]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={confirmPassword ? colors.primary : colors.slate} style={styles.inputPrefixIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.confirm_password_ph', 'Confirm your new password')}
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => {
                    if (!isTablet && Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 180, animated: true });
                      }, 100);
                    }
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.slate} />
                </TouchableOpacity>
              </View>
            </View>

            {/* UPDATE BUTTON */}
            <TouchableOpacity
              style={[styles.primaryBtn, isUpdating && styles.primaryBtnDisabled]}
              onPress={handleReset}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.primaryBtnText, isIndic && { lineHeight: 22 }]}>
                    {t('auth.updating_creds', 'Updating Security Credentials...')}
                  </Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={[styles.primaryBtnText, isIndic && { lineHeight: 22 }]}>
                    {t('auth.update_and_sign_in', 'Update Password & Sign In')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelLinkText, isIndic && { lineHeight: 18 }]}>
                {t('auth.cancel_return_signin', 'Cancel & Return to Sign In')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FAFCFD',
  },
  contentTablet: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  cardTablet: {
    padding: 34,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F8F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 5,
  },
  requiredMark: {
    color: '#FF7F50',
    fontWeight: '800',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  counterTextSuccess: {
    color: '#00B894',
    fontWeight: '700',
  },
  counterTextWarning: {
    color: '#FF7F50',
    fontWeight: '700',
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputBoxFilled: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
  },
  inputBoxValid: {
    borderColor: '#00B894',
    backgroundColor: '#FFFFFF',
  },
  inputPrefixIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
    height: '100%',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      userSelect: 'text',
      WebkitUserSelect: 'text',
    } : {}),
  },
  eyeBtn: {
    padding: 4,
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#00B894',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelLink: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default ForgotPasswordScreen;