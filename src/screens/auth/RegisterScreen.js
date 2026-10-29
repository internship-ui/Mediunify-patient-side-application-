import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../utils/alert';
import colors from '../../theme/colors';
import { safeNavigateToMain } from '../../utils/navigationHelper';
import { autoMigrateLocalAccountsToServer } from '../../services/dataSyncService';

import { useKeyboardVisibility } from '../../utils/keyboardUtils';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const RegisterScreen = ({ navigation, route }) => {
  const { t, isIndic, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmallDevice = width < 375 || height < 680;
  const isTablet = width >= 600;
  const scrollViewRef = useRef(null);

  const isKeyboardVisible = useKeyboardVisibility();

  // Android status bar safe margin
  const androidExtraTop = Platform.OS === 'android' && insets.top === 0 ? (StatusBar.currentHeight || 24) : 0;

  // Preserve registration information if returned from OTP or prefilled
  const initialData = route?.params?.userData || {};
  const initialCreds = route?.params?.credentials || {};

  const [name, setName] = useState(initialData.name || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [phone, setPhone] = useState(
    initialData.phone ? initialData.phone.replace(/[^0-9]/g, '').slice(-10) : (initialCreds.phone || '')
  );
  const [password, setPassword] = useState(initialCreds.password || '');
  const [confirmPassword, setConfirmPassword] = useState(initialCreds.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(initialData.referralCode || '');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    try {
      autoMigrateLocalAccountsToServer();
    } catch (e) {}
  }, []);

  const handleSkipToHome = async () => {
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
    } catch (e) {}
    await safeNavigateToMain(navigation);
  };

  // Strictly accept numeric digits and cap at exactly 10 digits
  const handlePhoneChange = (text) => {
    const raw = String(text || '').replace(/[^0-9]/g, '');
    let cleaned = raw;
    if (cleaned.length > 10 && cleaned.startsWith('91')) {
      cleaned = cleaned.slice(2);
    }
    cleaned = cleaned.slice(0, 10);
    setPhone(cleaned);
  };

  const handleRegister = async () => {
    setErrorMessage('');
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const rawPhone = phone.replace(/[^0-9]/g, '');
    const cleanPhone10 = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedReferralCode = referralCode.trim().toUpperCase();

    // 1. Required fields validation
    if (!trimmedName || !trimmedEmail || !cleanPhone10 || !trimmedPassword || !trimmedConfirmPassword) {
      const msg = 'Please enter your Full Name, Email, 10-digit Mobile Number, and Password.';
      setErrorMessage(msg);
      showAlert('Missing Information', msg);
      return;
    }

    // 2. Validate Full Name
    if (trimmedName.length < 2 || !/^[a-zA-Z\s.]+$/.test(trimmedName)) {
      const msg = 'Please enter a valid full name containing letters only (minimum 2 characters).';
      setErrorMessage(msg);
      showAlert('Invalid Full Name', msg);
      return;
    }

    // 3. Validate Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = 'Please enter a valid email address (e.g. name@domain.com).';
      setErrorMessage(msg);
      showAlert('Invalid Email', msg);
      return;
    }

    // 4. Validate 10-digit mobile number
    if (cleanPhone10.length !== 10) {
      const msg = `Please enter a valid 10-digit mobile number (currently ${cleanPhone10.length} digits).`;
      setErrorMessage(msg);
      showAlert('Invalid Mobile Number', msg);
      return;
    }

    // 5. Validate Password length
    if (trimmedPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long for your account security.';
      setErrorMessage(msg);
      showAlert('Weak Password', msg);
      return;
    }

    // 6. Validate Password match
    if (trimmedPassword !== trimmedConfirmPassword) {
      const msg = 'Passwords do not match. Please ensure both passwords match identically.';
      setErrorMessage(msg);
      showAlert('Password Mismatch', msg);
      return;
    }

    // 7. Terms agreement
    if (!agreedToTerms) {
      const msg = 'Please accept the MediUnify Terms of Service and Privacy Policy to proceed.';
      setErrorMessage(msg);
      showAlert('Terms Agreement Required', msg);
      return;
    }

    setIsRegistering(true);

    try {
      // Check existing accounts
      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) {
        try { registeredCreds = JSON.parse(regCredsStr); } catch (e) {}
      }

      // Check if Email already registered
      if (registeredCreds[trimmedEmail]) {
        setIsRegistering(false);
        const msg = `An account with email "${trimmedEmail}" already exists. Please sign in instead.`;
        setErrorMessage(msg);
        showAlert(
          'Email Already in Use',
          msg,
          [
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      // Check if Phone already registered
      if (registeredCreds[cleanPhone10]) {
        setIsRegistering(false);
        const msg = `An account with mobile number "+91 ${cleanPhone10}" already exists. Please sign in instead.`;
        setErrorMessage(msg);
        showAlert(
          'Phone Number Already in Use',
          msg,
          [
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      // Prepare user data payload
      const formattedPhone = `+91 ${cleanPhone10}`;
      const cleanFirstName = trimmedName.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '') || 'USER';
      const myReferralCode = `${cleanFirstName}250`;

      const userData = {
        name: trimmedName,
        email: trimmedEmail,
        phone: formattedPhone,
        dob: '15/08/1998',
        age: '28 Yrs',
        gender: 'Male',
        bloodGroup: 'O+ Positive',
        emergencyContact: `${formattedPhone} (Family)`,
        myReferralCode,
        referralCode: trimmedReferralCode || null,
      };

      const accountCredentials = {
        email: trimmedEmail,
        phone: cleanPhone10,
        password: trimmedPassword,
        myReferralCode,
        referralCode: trimmedReferralCode || null,
        userData,
        createdAt: Date.now(),
      };

      setIsRegistering(false);

      // Open existing OTP screen with user data & credentials
      navigation.navigate('OTP', { userData, credentials: accountCredentials });
    } catch (e) {
      console.warn('Registration validation warning:', e);
      setIsRegistering(false);
      const formattedPhone = `+91 ${cleanPhone10}`;
      navigation.navigate('OTP', {
        userData: {
          name: trimmedName,
          email: trimmedEmail,
          phone: formattedPhone,
          dob: '15/08/1998',
          age: '28 Yrs',
          gender: 'Male',
          bloodGroup: 'O+ Positive',
          emergencyContact: `${formattedPhone} (Family)`,
          referralCode: trimmedReferralCode || null,
        },
        credentials: {
          email: trimmedEmail,
          phone: cleanPhone10,
          password: trimmedPassword,
        },
      });
    }
  };

  const isPasswordFilled = password.length > 0;
  const isConfirmFilled = confirmPassword.length > 0;
  const isPasswordMatch = isPasswordFilled && isConfirmFilled && password === confirmPassword && password.length >= 6;
  const isPasswordMismatch = isPasswordFilled && isConfirmFilled && password !== confirmPassword;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        androidExtraTop > 0 && { paddingTop: androidExtraTop },
      ]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#080E1A' : '#FFFFFF'} />

      {/* TOP UTILITY BAR */}
      <View style={styles.topUtilityBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.guestLink}
            onPress={handleSkipToHome}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.guestLinkText, isIndic && { lineHeight: 18 }]}>
              {t('auth.continue_as_guest', 'Continue as Guest')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#007D69" />
          </TouchableOpacity>
        )}
      </View>

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
              paddingBottom: isKeyboardVisible
                ? (Platform.OS === 'ios' ? 160 : 120)
                : Math.max(insets.bottom, 0) + (isSmallDevice ? 24 : 40),
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
                {t('auth.create_account', 'Create Account')}
              </Text>
              <Text style={[styles.cardSubtitle, isIndic && { lineHeight: 20 }]}>
                {t('auth.register_subtitle', 'Sign up to book appointments, manage lab tests & view medical records')}
              </Text>
            </View>

            {/* FIELD 1: FULL NAME */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                {t('auth.full_name', 'Full Name')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.inputBox, name ? styles.inputBoxFilled : null]}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={name ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.full_name_ph', 'Enter your full name')}
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }, 100);
                    }
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  type="text"
                  textContentType="name"
                  name="name"
                  id="reg_mobile_name"
                />
                {name.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setName('')}
                    style={styles.clearBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* FIELD 2: MOBILE NUMBER (10 DIGITS) */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                  {t('auth.mobile_number', 'Mobile Number')} <Text style={styles.requiredMark}>*</Text>
                </Text>
                <Text
                  style={[
                    styles.counterText,
                    phone.length === 10 ? styles.counterTextSuccess : phone.length > 0 ? styles.counterTextWarning : null,
                  ]}
                >
                  {phone.length}/10 {t('auth.digits', 'digits')}
                </Text>
              </View>
              <View
                style={[
                  styles.inputBox,
                  phone.length === 10 ? styles.inputBoxValid : phone.length > 0 ? styles.inputBoxFilled : null,
                ]}
              >
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <Ionicons
                  name="call-outline"
                  size={19}
                  color={phone.length === 10 ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.mobile_ph', '10-digit mobile number')}
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: isSmallDevice ? 80 : 100, animated: true });
                      }, 100);
                    }
                  }}
                  keyboardType="phone-pad"
                  inputMode="tel"
                  type="tel"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  name="tel"
                  id="reg_mobile_phone"
                />
                {phone.length === 10 ? (
                  <Ionicons name="checkmark-circle" size={20} color="#007D69" />
                ) : phone.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setPhone('')}
                    style={styles.clearBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* FIELD 3: EMAIL ADDRESS */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                {t('auth.email_address', 'Email Address')} <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={[styles.inputBox, email ? styles.inputBoxFilled : null]}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={email ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.email_ph', 'Enter your email address')}
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: isSmallDevice ? 140 : 160, animated: true });
                      }, 100);
                    }
                  }}
                  keyboardType="email-address"
                  inputMode="email"
                  type="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  name="email"
                  id="reg_mobile_email"
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setEmail('')}
                    style={styles.clearBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* FIELD 4: PASSWORD */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                  {t('auth.password', 'Password')} <Text style={styles.requiredMark}>*</Text>
                </Text>
                {password.length > 0 && (
                  <Text
                    style={[
                      styles.counterText,
                      password.length >= 6 ? styles.counterTextSuccess : styles.counterTextWarning,
                    ]}
                  >
                    {password.length >= 6 ? t('auth.strong', 'Strong') : `${password.length}/6 ${t('auth.chars', 'chars')}`}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.inputBox,
                  password.length >= 6 ? styles.inputBoxValid : password.length > 0 ? styles.inputBoxFilled : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={password ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.password_ph', 'Minimum 6 characters')}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: isSmallDevice ? 200 : 220, animated: true });
                      }, 100);
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  type="password"
                  textContentType="newPassword"
                  name="password"
                  id="reg_mobile_password"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={showPassword ? '#007D69' : '#94A3B8'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* FIELD 5: CONFIRM PASSWORD */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                  {t('auth.confirm_password', 'Confirm Password')} <Text style={styles.requiredMark}>*</Text>
                </Text>
                {isPasswordMatch && (
                  <View style={styles.matchedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#007D69" />
                    <Text style={styles.matchedBadgeText}>{t('auth.passwords_match', 'Passwords Match')}</Text>
                  </View>
                )}
                {isPasswordMismatch && (
                  <Text style={styles.counterTextWarning}>{t('auth.mismatch', 'Mismatch')}</Text>
                )}
              </View>
              <View
                style={[
                  styles.inputBox,
                  isPasswordMatch ? styles.inputBoxValid : isPasswordMismatch ? styles.inputBoxWarning : null,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={confirmPassword ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.confirm_password_ph', 'Re-enter your password')}
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: isSmallDevice ? 260 : 280, animated: true });
                      }, 100);
                    }
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  type="password"
                  textContentType="newPassword"
                  name="confirm-password"
                  id="reg_mobile_confirmpassword"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={showConfirmPassword ? '#007D69' : '#94A3B8'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* FIELD 6: REFERRAL CODE (OPTIONAL) */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, isIndic && { lineHeight: 18 }]}>
                  {t('auth.referral_code_optional', 'Referral Code (Optional)')}
                </Text>
                <View style={styles.bonusHintBadge}>
                  <Ionicons name="gift-outline" size={13} color="#007D69" />
                  <Text style={styles.bonusHintBadgeText}>₹250 {t('common.bonus', 'Bonus')}</Text>
                </View>
              </View>
              <View style={[styles.inputBox, referralCode ? styles.inputBoxFilled : null]}>
                <Ionicons
                  name="pricetag-outline"
                  size={19}
                  color={referralCode ? '#007D69' : '#94A3B8'}
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={t('auth.referral_ph', 'Enter referral code')}
                  placeholderTextColor="#94A3B8"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  onFocus={() => {
                    if (Platform.OS !== 'web') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: isSmallDevice ? 320 : 340, animated: true });
                      }, 100);
                    }
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  type="text"
                  textContentType="none"
                  name="referral"
                  id="reg_mobile_referral"
                />
                {referralCode.length > 0 && (
                  <View style={styles.appliedTag}>
                    <Text style={styles.appliedTagText}>{t('auth.bonus_ready', 'BONUS READY')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* TERMS & PRIVACY CHECKBOX */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxBox, agreedToTerms && styles.checkboxBoxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.termsText, isIndic && { lineHeight: 20 }]}>
                {t('auth.terms_agree', 'I agree to the')}{' '}
                <Text style={styles.termsLink}>{t('auth.terms_of_service', 'Terms of Service')}</Text> {t('auth.and', 'and')}{' '}
                <Text style={styles.termsLink}>{t('auth.privacy_policy', 'Privacy Policy')}</Text>.
              </Text>
            </TouchableOpacity>

            {/* INLINE ERROR BANNER */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* PRIMARY SUBMIT BUTTON */}
            <TouchableOpacity
              style={[
                styles.primarySubmitBtn,
                isRegistering && styles.primarySubmitBtnDisabled,
              ]}
              onPress={() => {
                Keyboard.dismiss();
                handleRegister();
              }}
              disabled={isRegistering}
              activeOpacity={0.85}
            >
              {isRegistering ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.primarySubmitBtnText, isIndic && { lineHeight: 22 }]}>
                    {t('auth.creating_account', 'Creating Account...')}
                  </Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={[styles.primarySubmitBtnText, isIndic && { lineHeight: 22 }]}>
                    {t('auth.create_account', 'Create Account')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* SIGN IN FOOTER */}
            <View style={styles.loginFooter}>
              <Text style={[styles.loginFooterText, isIndic && { lineHeight: 20 }]}>
                {t('auth.already_have_account', 'Already have an account?')}{' '}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={[styles.loginFooterLink, isIndic && { lineHeight: 20 }]}>
                  {t('auth.sign_in', 'Sign In')}
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
    maxWidth: 460,
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
    marginTop: 8,
    marginBottom: 20,
  },
  logoImage: {
    width: 180,
    height: 48,
  },
  cardHeader: {
    marginBottom: 20,
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
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 7,
  },
  requiredMark: {
    color: '#EF4444',
    fontWeight: '800',
  },
  counterText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  counterTextSuccess: {
    color: '#007D69',
  },
  counterTextWarning: {
    color: '#F59E0B',
  },
  countryCodeBadge: {
    backgroundColor: '#F0FDF9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  countryCodeText: {
    fontSize: 12.5,
    fontWeight: '800',
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
  inputBoxValid: {
    borderColor: '#007D69',
    backgroundColor: '#FFFFFF',
  },
  inputBoxWarning: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
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
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#007D69',
  },
  bonusHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bonusHintBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#007D69',
  },
  appliedTag: {
    backgroundColor: '#F0FDF9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  appliedTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#007D69',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#007D69',
    borderColor: '#007D69',
  },
  termsText: {
    fontSize: 12.5,
    color: '#64748B',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: '#007D69',
    fontWeight: '700',
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
    marginTop: 4,
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
  loginFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  loginFooterText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  loginFooterLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#007D69',
  },
});

export default RegisterScreen;