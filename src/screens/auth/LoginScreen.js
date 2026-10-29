import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
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
import { safeNavigateToMain } from '../../utils/navigationHelper';
import { syncLogin, syncRegister, autoMigrateLocalAccountsToServer } from '../../services/dataSyncService';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { detectPhoneGPSLocation } from '../../utils/locationHelper';

const PRE_SEEDED_CREDENTIALS = {
  'user@mediunify.com': {
    password: 'password123',
    userData: {
      name: 'Demo Patient',
      email: 'user@mediunify.com',
      phone: '+91 98765 43210',
      gender: 'Male',
      bloodGroup: 'O+ Positive',
      age: '29 Yrs',
    },
  },
  '9876543210': {
    password: 'password123',
    userData: {
      name: 'Demo Patient',
      email: 'user@mediunify.com',
      phone: '+91 98765 43210',
      gender: 'Male',
      bloodGroup: 'O+ Positive',
      age: '29 Yrs',
    },
  },
  'admin@unnathi.com': {
    password: 'password123',
    userData: {
      name: 'Dr. Unnathi Admin',
      email: 'admin@unnathi.com',
      phone: '+91 98450 12345',
      gender: 'Female',
      bloodGroup: 'A+ Positive',
      age: '34 Yrs',
    },
  },
  '9845012345': {
    password: 'password123',
    userData: {
      name: 'Dr. Unnathi Admin',
      email: 'admin@unnathi.com',
      phone: '+91 98450 12345',
      gender: 'Female',
      bloodGroup: 'A+ Positive',
      age: '34 Yrs',
    },
  },
};

import { useKeyboardVisibility } from '../../utils/keyboardUtils';

const LoginScreen = ({ navigation, route }) => {
  const { isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { t = (k, fb) => fb || k, isIndic } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmallDevice = width < 375 || height < 680;
  const isTablet = width >= 600;
  const scrollViewRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const isKeyboardVisible = useKeyboardVisibility();

  // On Android, ensure status bar area is never overlapped even if insets report 0
  const androidExtraTop = Platform.OS === 'android' && insets.top === 0 ? (StatusBar.currentHeight || 24) : 0;

  // Vertical centering: Center when vertical height allows comfortable viewing without clipping header.
  // When keyboard is open, align to flex-start and add padding so fields and buttons are freely scrollable.
  const minHeightForCentering = isSmallDevice ? 520 : 620;
  const canCenterVertically = !isKeyboardVisible && height >= minHeightForCentering;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    try {
      autoMigrateLocalAccountsToServer();
    } catch (e) {}
  }, []);



  const handleLogin = async () => {
    if (isLoggingIn) return;
    const inputVal = email.trim();
    const inputPassword = password.trim();
    setErrorMessage('');

    if (!inputVal || !inputPassword) {
      setErrorMessage('Please enter your registered email/phone and password.');
      showAlert(
        'Missing Information',
        'Please enter your registered email/phone and password.'
      );
      return;
    }

    setIsLoggingIn(true);

    try {
      // 0. Connect directly to Central Sync Server (live Web <-> Mobile shared data)
      try {
        const syncRes = await syncLogin(inputVal, inputPassword);
        if (syncRes && syncRes.success && syncRes.user) {
          console.log('[LoginScreen] Logged in via Central Sync Server:', syncRes.user.name);
          await AsyncStorage.setItem('isLoggedIn', 'true');
          await safeNavigateToMain(navigation);
          return;
        } else if (syncRes && syncRes.status === 401) {
          setIsLoggingIn(false);
          setErrorMessage('The password you entered is incorrect. Please verify and try again.');
          showAlert(
            'Incorrect Password',
            'The password you entered is incorrect. Please verify and try again.',
            [
              { text: 'Try Again' },
              { text: 'Forgot Password?', onPress: () => navigation.navigate('ForgotPassword') },
            ]
          );
          return;
        }
      } catch (syncErr) {
        console.warn('[LoginScreen] Central Sync Server unreachable, falling back to local storage:', syncErr);
      }

      const cleanPhone = inputVal.replace(/[^0-9]/g, '');
      const cleanPhone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      const lowerEmail = inputVal.toLowerCase();

      // 1. Check registered credentials store
      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) {
        try {
          registeredCreds = JSON.parse(regCredsStr);
        } catch (e) {}
      }

      const allCreds = { ...PRE_SEEDED_CREDENTIALS, ...registeredCreds };
      const matchingCred =
        allCreds[lowerEmail] ||
        (cleanPhone10.length === 10 ? allCreds[cleanPhone10] : null);

      if (matchingCred) {
        // Enforce password match
        if (matchingCred.password && matchingCred.password !== inputPassword) {
          setIsLoggingIn(false);
          setErrorMessage('The password you entered is incorrect. Please try again.');
          showAlert(
            'Incorrect Password',
            'The password you entered is incorrect. Please verify and try again.',
            [
              { text: 'Try Again' },
              { text: 'Forgot Password?', onPress: () => navigation.navigate('ForgotPassword') },
            ]
          );
          return;
        }
      }

      // 2. Load registered user data
      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) {
        try {
          registeredUsers = JSON.parse(regUsersStr);
        } catch (e) {}
      }

      const foundReg =
        (matchingCred && matchingCred.userData) ||
        registeredUsers[lowerEmail] ||
        (cleanPhone10.length === 10 ? registeredUsers[cleanPhone10] : null);

      let userFullName = '';
      let existingEmail = lowerEmail.includes('@') ? lowerEmail : (foundReg?.email || 'user@example.com');
      let existingPhone = cleanPhone10.length === 10 ? `+91 ${cleanPhone10}` : (foundReg?.phone || '+91 98450 12345');
      let existingBlood = 'O+ Positive';
      let existingAge = '28 Yrs';
      let existingGender = 'Male';
      let existingEmergency = `${existingPhone} (Family)`;
      let existingDob = '15/08/1998';

      if (foundReg && foundReg.name && !foundReg.name.includes('@')) {
        userFullName = foundReg.name.trim();
        if (foundReg.email) existingEmail = foundReg.email;
        if (foundReg.phone) existingPhone = foundReg.phone;
        if (foundReg.bloodGroup) existingBlood = foundReg.bloodGroup;
        if (foundReg.age) existingAge = foundReg.age;
        if (foundReg.gender) existingGender = foundReg.gender;
        if (foundReg.emergencyContact) existingEmergency = foundReg.emergencyContact;
        if (foundReg.dob) existingDob = foundReg.dob;
      }

      // Check existing storage if not in registered map
      if (!userFullName) {
        const storedPrimary = await AsyncStorage.getItem('@unnathi_primary_user');
        const storedUser = await AsyncStorage.getItem('user');
        const storedName = await AsyncStorage.getItem('userName');

        let parsed = null;
        if (storedPrimary) {
          try { parsed = JSON.parse(storedPrimary); } catch (e) {}
        } else if (storedUser) {
          try { parsed = JSON.parse(storedUser); } catch (e) {}
        }

        if (parsed?.name && !parsed.name.includes('@') && (!parsed?.email || parsed.email.toLowerCase() === lowerEmail)) {
          userFullName = parsed.name.trim();
          if (parsed.email) existingEmail = parsed.email;
          if (parsed.phone) existingPhone = parsed.phone;
          if (parsed.bloodGroup) existingBlood = parsed.bloodGroup;
          if (parsed.age) existingAge = parsed.age;
          if (parsed.gender) existingGender = parsed.gender;
          if (parsed.emergencyContact) existingEmergency = parsed.emergencyContact;
          if (parsed.dob) existingDob = parsed.dob;
        } else if (storedName && !storedName.includes('@') && storedName.trim()) {
          userFullName = storedName.trim();
        }
      }

      // Fallback: format clean readable full name
      if (!userFullName) {
        const rawPart = lowerEmail.includes('@')
          ? lowerEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/[0-9]/g, '').trim() || lowerEmail.split('@')[0].replace(/[._-]/g, ' ').trim()
          : `User ${cleanPhone10.slice(-4)}`;
        userFullName = rawPart
          .split(' ')
          .filter(Boolean)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ') || 'User Profile';
      }

      // 3. Save User Data
      const userData = {
        name: userFullName,
        email: existingEmail,
        phone: existingPhone,
        dob: existingDob,
        bloodGroup: existingBlood,
        age: existingAge,
        gender: existingGender,
        emergencyContact: existingEmergency,
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('@unnathi_primary_user', JSON.stringify(userData));
      await AsyncStorage.setItem('userName', userFullName);
      await AsyncStorage.setItem('userEmail', existingEmail);
      await AsyncStorage.setItem('userPhone', existingPhone);

      // Account-specific family members isolation
      const userKey = (existingEmail || cleanPhone10 || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const userFamKey = `@unnathi_family_members_${userKey}`;
      const savedFam = await AsyncStorage.getItem(userFamKey);
      let userFamilyList = [];
      if (savedFam) {
        try {
          userFamilyList = JSON.parse(savedFam);
        } catch (e) {}
      }

      const primaryMember = {
        id: 'self',
        name: `${userFullName} (Self)`,
        displayName: userFullName.split(' ')[0],
        relation: 'Self',
        age: existingAge || '28 Yrs',
        gender: existingGender || 'Male',
        bloodGroup: existingBlood ? existingBlood.split(' ')[0] : 'O+',
        allergies: 'None',
        conditions: 'None',
        icon: 'person',
        themeColor: '#00B894',
        bgLight: '#E6F8F4',
        isPrimary: true,
      };

      if (!Array.isArray(userFamilyList) || userFamilyList.length === 0) {
        userFamilyList = [primaryMember];
      } else {
        let foundSelf = false;
        userFamilyList = userFamilyList.map((m) => {
          if (m.id === 'self' || m.isPrimary || m.relation === 'Self') {
            foundSelf = true;
            return {
              ...m,
              name: `${userFullName} (Self)`,
              displayName: `${userFullName.split(' ')[0]} (Self)`,
              bloodGroup: existingBlood ? existingBlood.split(' ')[0] : m.bloodGroup,
              age: existingAge || m.age,
              gender: existingGender || m.gender,
            };
          }
          return m;
        });
        if (!foundSelf) {
          userFamilyList.unshift(primaryMember);
        }
      }

      await AsyncStorage.setItem(userFamKey, JSON.stringify(userFamilyList));
      await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify(userFamilyList));
      await AsyncStorage.setItem('@unnathi_active_patient', JSON.stringify(userFamilyList[0] || primaryMember));

      // 4. Save login status
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('@unnathi_is_guest', 'false');

      // Background push to Central Sync Server
      try {
        syncRegister(userData, inputPassword);
      } catch (e) {}

      // 5. Navigate to Main App (or return to intended action)
      const returnTo = route?.params?.returnTo;
      const returnParams = route?.params?.returnParams;
      await safeNavigateToMain(navigation, returnTo, returnParams);
    } catch (error) {
      setIsLoggingIn(false);
      console.log('Login storage error:', error);
      setErrorMessage('Something went wrong while logging in. Please check your connection and try again.');
      showAlert('Login Error', 'Something went wrong while logging in.');
    }
  };

  const handleContinueAsGuest = async () => {
    try {
      await AsyncStorage.setItem('isLoggedIn', 'false');
      await AsyncStorage.setItem('@unnathi_is_guest', 'true');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userPhone');
      await AsyncStorage.removeItem('@unnathi_primary_user');
      await AsyncStorage.removeItem('@mediunify_membership');
      await AsyncStorage.removeItem('@unnathi_active_patient');

      // Proactively trigger phone GPS detection so user location is ready
      detectPhoneGPSLocation(false).catch(() => {});
    } catch (e) {}
    await safeNavigateToMain(navigation);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        androidExtraTop > 0 && { paddingTop: androidExtraTop },
      ]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#080E1A' : '#FFFFFF'} />

      {/* TOP UTILITY BAR: BACK BUTTON (ONLY IF CAN GO BACK) */}
      {navigation.canGoBack() ? (
        <View style={styles.topUtilityBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <View style={{ width: 36 }} />
        </View>
      ) : (
        <View style={{ height: 12 }} />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top > 0 ? insets.top : 20) : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            isSmallDevice && styles.scrollContentSmall,
            isTablet && styles.scrollContentTablet,
            {
              paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 140 : 100) : (isSmallDevice ? 16 : 24),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[
              styles.authCard,
              isSmallDevice && styles.authCardSmall,
              isTablet && styles.authCardTablet,
            ]}
          >
            {/* BRAND LOGO */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* CARD HEADING */}
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isIndic && { lineHeight: 28 }]}>
                {t('auth_login_tab', 'Sign In')}
              </Text>
              <Text style={[styles.cardSubtitle, isIndic && { lineHeight: 20 }]}>
                {t('auth_subtitle_login', 'Enter your details to access your healthcare account')}
              </Text>
            </View>

            {/* INPUT: EMAIL OR PHONE */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                {t('auth_email_phone', 'Email or Mobile Number')}
              </Text>
              <View style={[styles.inputBox, email ? styles.inputBoxFilled : null]}>
                <Ionicons
                  name={email.includes('@') ? 'mail-outline' : 'call-outline'}
                  size={19}
                  color={email ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  ref={emailInputRef}
                  style={styles.textInput}
                  placeholder={t('auth_email_placeholder', 'Email address or 10-digit number')}
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }, 100);
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  name="username"
                  id="login_mobile_identity"
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setEmail('')}
                    style={styles.clearBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear email or mobile number"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* INPUT: PASSWORD */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                  {t('auth_password', 'Password')}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.forgotPassLink, isIndic && { lineHeight: 18 }]}>
                    {t('auth_forgot_pass', 'Forgot password?')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputBox, password ? styles.inputBoxFilled : null]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={password ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.textInput}
                  placeholder={t('auth_password_placeholder', 'Enter your password')}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: isSmallDevice ? 100 : 120, animated: true });
                      }, 100);
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  name="password"
                  id="login_mobile_password"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={showPassword ? '#007D69' : '#94A3B8'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* INLINE ERROR BOX */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={17} color="#EF4444" />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* PRIMARY SIGN IN BUTTON */}
            <TouchableOpacity
              style={[
                styles.primarySubmitBtn,
                isLoggingIn && styles.primarySubmitBtnDisabled,
              ]}
              onPress={() => {
                Keyboard.dismiss();
                handleLogin();
              }}
              disabled={isLoggingIn}
              activeOpacity={0.85}
            >
              {isLoggingIn ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.primarySubmitBtnText, isIndic && { lineHeight: 20 }]}>
                    {t('auth_signing_in', 'Signing in...')}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.primarySubmitBtnText, isIndic && { lineHeight: 20 }]}>
                  {t('auth_sign_in_btn', 'Sign In')}
                </Text>
              )}
            </TouchableOpacity>

            {/* REGISTER & SKIP ROW */}
            <View style={styles.signupFooter}>
              <Text style={[styles.signupFooterText, isIndic && { lineHeight: 18 }]}>
                {t('auth_no_account', "Don't have an account?")}{' '}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Register')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={[styles.signupFooterLink, isIndic && { lineHeight: 18 }]}>
                  {t('auth_sign_up', 'Sign Up')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.signupFooterDivider}> • </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleContinueAsGuest}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                accessibilityLabel="Skip Login"
              >
                <Text style={[styles.signupFooterLink, isIndic && { lineHeight: 18 }]}>
                  {t('auth_skip_btn', 'Skip')}
                </Text>
              </TouchableOpacity>
            </View>
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
  topUtilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  skipTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: '#F0FDF9',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  skipTopBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007D69',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  skipCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007D69',
    backgroundColor: '#F0FDF9',
    width: '100%',
  },
  skipCardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007D69',
  },
  guestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0FDF9',
  },
  guestLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007D69',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  scrollContentSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scrollContentTablet: {
    paddingHorizontal: 32,
    paddingVertical: 36,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  authCardSmall: {
    width: '100%',
  },
  authCardTablet: {
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  logoImage: {
    width: 180,
    height: 48,
  },
  cardHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  forgotPassLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#007D69',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    ...(Platform.OS === 'web' ? {
      cursor: 'text',
      pointerEvents: 'auto',
    } : {}),
  },
  inputBoxFilled: {
    borderColor: '#007D69',
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
    fontWeight: '500',
    paddingVertical: 0,
    height: '100%',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      userSelect: 'text',
      WebkitUserSelect: 'text',
    } : {}),
  },
  clearBtn: {
    padding: 4,
  },
  eyeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBoxText: {
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  primarySubmitBtn: {
    backgroundColor: '#007D69',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primarySubmitBtnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primarySubmitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  signupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  signupFooterText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  signupFooterLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#007D69',
  },
  signupFooterDivider: {
    fontSize: 13,
    color: '#94A3B8',
    marginHorizontal: 4,
    fontWeight: '600',
  },
});

export default LoginScreen;