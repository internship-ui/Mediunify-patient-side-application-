import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../utils/alert';
import colors from '../../theme/colors';
import { safeNavigateToMain } from '../../utils/navigationHelper';
import { syncRegister } from '../../services/dataSyncService';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { useKeyboardVisibility } from '../../utils/keyboardUtils';

const OTPScreen = ({ navigation, route }) => {
  const { isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { t, isIndic } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmallDevice = width < 375 || height < 680;
  const isTablet = width >= 600;

  const androidExtraTop = Platform.OS === 'android' && insets.top === 0 ? (StatusBar.currentHeight || 24) : 0;

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isKeyboardVisible = useKeyboardVisibility();

  const inputRefs = useRef([]);
  const scrollViewRef = useRef(null);

  const passedUser = route?.params?.userData || {};
  const passedCreds = route?.params?.credentials || {};
  const phoneNumber = passedUser?.phone || (passedCreds?.phone ? `+91 ${passedCreds.phone}` : '+91 98765 43210');

  useEffect(() => {
    let interval = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  const handleDigitChange = (text, index) => {
    setErrorMessage('');
    const cleaned = text.replace(/[^0-9]/g, '');

    // Full paste of multiple digits
    if (cleaned.length > 1) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (cleaned[i]) {
          newDigits[i] = cleaned[i];
        }
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(cleaned.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleAutofillDemo = () => {
    setOtpDigits(['1', '2', '3', '4', '5', '6']);
    setErrorMessage('');
    inputRefs.current[5]?.focus();
  };

  const handleResend = () => {
    if (!canResend) return;
    setCountdown(30);
    setCanResend(false);
    setErrorMessage('');
    showAlert('OTP Resent', `A fresh 6-digit verification code has been dispatched to ${phoneNumber}.`);
  };

  const handleChangeMobile = () => {
    // Preserve registration info when navigating back to registration screen
    navigation.navigate('Register', {
      userData: passedUser,
      credentials: passedCreds,
    });
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length < 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      showAlert('Incomplete Code', 'Please enter all 6 digits of the verification code.');
      return;
    }

    if (enteredOtp !== '123456') {
      setErrorMessage('Invalid verification code. Please enter demo OTP: 123456');
      showAlert(
        'Invalid Verification Code',
        'The OTP you entered is incorrect. Tap the demo chip or enter 123456 to continue.'
      );
      return;
    }

    setVerifying(true);
    setErrorMessage('');

    try {
      // 1. Save user profile into local storage
      const finalUser = {
        name: passedUser.name || 'MediUnify Patient',
        email: passedUser.email || 'patient@mediunify.com',
        phone: phoneNumber,
        dob: passedUser.dob || '15/08/1998',
        age: passedUser.age || '28 Yrs',
        gender: passedUser.gender || 'Male',
        bloodGroup: passedUser.bloodGroup || 'O+ Positive',
        emergencyContact: passedUser.emergencyContact || `${phoneNumber} (Family)`,
        myReferralCode: passedUser.myReferralCode || 'PATIENT250',
        referralCode: passedUser.referralCode || null,
      };

      await AsyncStorage.setItem('user', JSON.stringify(finalUser));
      await AsyncStorage.setItem('@unnathi_primary_user', JSON.stringify(finalUser));
      await AsyncStorage.setItem('userName', finalUser.name);
      await AsyncStorage.setItem('userEmail', finalUser.email);
      await AsyncStorage.setItem('userPhone', finalUser.phone);
      if (finalUser.myReferralCode) {
        await AsyncStorage.setItem('@unnathi_user_referral_code', finalUser.myReferralCode);
      }

      // 2. Save credentials in registry
      const cleanPhone10 = phoneNumber.replace(/[^0-9]/g, '').slice(-10);
      const lowerEmail = finalUser.email.toLowerCase();

      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) {
        try { registeredCreds = JSON.parse(regCredsStr); } catch (e) {}
      }

      const accountCredentials = {
        email: lowerEmail,
        phone: cleanPhone10,
        password: passedCreds.password || 'password123',
        myReferralCode: finalUser.myReferralCode,
        referralCode: finalUser.referralCode,
        userData: finalUser,
        createdAt: Date.now(),
      };

      registeredCreds[lowerEmail] = accountCredentials;
      registeredCreds[cleanPhone10] = accountCredentials;
      await AsyncStorage.setItem('@unnathi_registered_credentials', JSON.stringify(registeredCreds));

      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) {
        try { registeredUsers = JSON.parse(regUsersStr); } catch (e) {}
      }
      registeredUsers[lowerEmail] = finalUser;
      registeredUsers[cleanPhone10] = finalUser;
      await AsyncStorage.setItem('@unnathi_registered_users', JSON.stringify(registeredUsers));

      // 3. Credit referral bonus if referral code was provided
      if (finalUser.referralCode) {
        const currentBalStr = await AsyncStorage.getItem('@unnathi_wallet_balance');
        const currentBal = currentBalStr ? parseInt(currentBalStr, 10) : 1250;
        const newBal = currentBal + 250;
        await AsyncStorage.setItem('@unnathi_wallet_balance', newBal.toString());

        const storedTxStr = await AsyncStorage.getItem('@unnathi_wallet_transactions');
        let existingTx = [];
        if (storedTxStr) {
          try { existingTx = JSON.parse(storedTxStr); } catch (e) {}
        }
        const referralBonusTx = {
          id: `tx-ref-${Date.now()}`,
          title: 'Referral Welcome Bonus',
          subtitle: `Code "${finalUser.referralCode}" applied on registration`,
          amount: '+₹250',
          type: 'credit',
          date: 'Just now',
          icon: 'gift-outline',
        };
        await AsyncStorage.setItem('@unnathi_wallet_transactions', JSON.stringify([referralBonusTx, ...existingTx]));
      }

      // 4. Primary family profile (Self)
      const primaryMember = {
        id: 'self',
        name: `${finalUser.name} (Self)`,
        displayName: finalUser.name.split(' ')[0],
        relation: 'Self',
        age: finalUser.age,
        gender: finalUser.gender,
        bloodGroup: finalUser.bloodGroup.split(' ')[0] || 'O+',
        allergies: 'None',
        conditions: 'None',
        icon: 'person',
        themeColor: '#00B894',
        bgLight: '#E6F8F4',
        isPrimary: true,
      };
      await AsyncStorage.setItem('@unnathi_active_patient', JSON.stringify(primaryMember));

      const userKey = (lowerEmail || cleanPhone10 || 'default').replace(/[^a-z0-9]/g, '_');
      await AsyncStorage.setItem(`@unnathi_family_members_${userKey}`, JSON.stringify([primaryMember]));
      await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify([primaryMember]));

      // 5. Central Sync Server registration
      try {
        await syncRegister(finalUser, passedCreds.password || 'password123');
      } catch (syncErr) {
        console.warn('[OTPScreen] Central Sync Server registration notice:', syncErr);
      }

      // 6. Set logged-in state & auth token
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('@unnathi_is_guest', 'false');
      await AsyncStorage.setItem('userToken', `auth_token_${Date.now()}`);

      setVerifying(false);

      // 7. Safely navigate to Home/Dashboard
      await safeNavigateToMain(navigation);
    } catch (err) {
      console.log('OTP verification error:', err);
      setVerifying(false);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await safeNavigateToMain(navigation);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        androidExtraTop > 0 && { paddingTop: androidExtraTop },
      ]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#080E1A' : '#F8FAFC'} />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleChangeMobile}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#1E3A8A" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#00B894" />
          <Text style={styles.securityBadgeText}>SMS Verified</Text>
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
            {
              paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 140 : 100) : (isSmallDevice ? 12 : 20),
            },
            isSmallDevice && styles.contentSmall,
            isTablet && styles.contentTablet,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.card, isSmallDevice && styles.cardSmall, isTablet && styles.cardTablet]}>
            {/* ICON BADGE */}
            <View style={[styles.iconCircle, isSmallDevice && styles.iconCircleSmall]}>
              <Ionicons name="shield-checkmark" size={28} color="#00B894" />
            </View>

            {/* TITLE & SUBTITLE */}
            <Text style={[styles.title, isSmallDevice && styles.titleSmall, isIndic && { lineHeight: 28 }]}>
              {t('auth.auth_verify_mobile', 'Verify Your Mobile Number')}
            </Text>
            <Text style={[styles.subtitle, isSmallDevice && styles.subtitleSmall, isIndic && { lineHeight: 20 }]}>
              {t('auth.otp_sent_to', 'Enter the 6-digit OTP sent to')}
            </Text>

            {/* PHONE PILL WITH CHANGE OPTION */}
            <View style={styles.phonePill}>
              <Ionicons name="call-outline" size={14} color="#1E3A8A" />
              <Text style={styles.phonePillText}>{phoneNumber}</Text>
              <TouchableOpacity
                onPress={handleChangeMobile}
                activeOpacity={0.7}
                style={styles.changePhonePillBtn}
              >
                <Text style={[styles.changePhonePillBtnText, isIndic && { lineHeight: 16 }]}>
                  • {t('common.change', 'Change')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* DEMO CODE AUTOFILL CHIP */}
            <TouchableOpacity
              style={[styles.demoChip, isSmallDevice && styles.demoChipSmall]}
              onPress={handleAutofillDemo}
              activeOpacity={0.7}
            >
              <Ionicons name="flash-outline" size={14} color="#00B894" />
              <Text style={[styles.demoChipText, isIndic && { lineHeight: 18 }]}>
                {t('auth.autofill_demo_hint', 'Tap to autofill Demo OTP:')} <Text style={{ fontWeight: '900' }}>123456</Text>
              </Text>
            </TouchableOpacity>

            {/* 6 OTP INPUT BOXES */}
            <View style={styles.otpBoxesRow}>
              {otpDigits.map((digit, index) => {
                const isFocused = focusedIndex === index;
                return (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpBox,
                      isSmallDevice && styles.otpBoxSmall,
                      digit ? styles.otpBoxFilled : null,
                      isFocused ? styles.otpBoxFocused : null,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleDigitChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => {
                      setFocusedIndex(index);
                      if (Platform.OS !== 'web') {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({ y: isSmallDevice ? 100 : 130, animated: true });
                        }, 100);
                      }
                    }}
                    onBlur={() => setFocusedIndex(-1)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                );
              })}
            </View>

            {/* INLINE ERROR BANNER */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#FF7F50" />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* VERIFY OTP BUTTON */}
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                isSmallDevice && styles.verifyBtnSmall,
                verifying && styles.verifyBtnDisabled,
              ]}
              onPress={handleVerify}
              disabled={verifying}
              activeOpacity={0.85}
            >
              {verifying ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.verifyBtnText, isIndic && { lineHeight: 22 }]}>
                    {t('auth.verifying_otp', 'Verifying OTP...')}
                  </Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={[styles.verifyBtnText, isIndic && { lineHeight: 22 }]}>
                    {t('auth.verify_otp', 'Verify OTP')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* RESEND OTP WITH COUNTDOWN */}
            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={[styles.resendText, isIndic && { lineHeight: 18 }]}>
                  {t('auth.resend_in', 'Resend OTP in')}{' '}
                  <Text style={styles.countdownText}>{countdown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={[styles.resendLink, isIndic && { lineHeight: 18 }]}>
                    {t('auth.resend_otp', 'Resend OTP')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* CHANGE MOBILE NUMBER BUTTON */}
            <TouchableOpacity
              style={styles.changeMobileRow}
              onPress={handleChangeMobile}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={14} color="#00B894" />
              <Text style={[styles.changeMobileText, isIndic && { lineHeight: 18 }]}>
                {t('auth.change_mobile_num', 'Change Mobile Number')}
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
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
  },
  contentSmall: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contentTablet: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    alignItems: 'center',
  },
  cardSmall: {
    maxWidth: 360,
    padding: 18,
    borderRadius: 16,
  },
  cardTablet: {
    maxWidth: 460,
    padding: 30,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F8F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  titleSmall: {
    fontSize: 19,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  subtitleSmall: {
    fontSize: 12,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  phonePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  changePhonePillBtn: {
    marginLeft: 4,
  },
  changePhonePillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F8F4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
  },
  demoChipSmall: {
    marginBottom: 14,
    paddingVertical: 6,
  },
  demoChipText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    width: '100%',
  },
  otpBox: {
    width: 44,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      userSelect: 'text',
      WebkitUserSelect: 'text',
    } : {}),
  },
  otpBoxSmall: {
    width: 38,
    height: 44,
    fontSize: 18,
    borderRadius: 10,
  },
  otpBoxFilled: {
    borderColor: '#00B894',
    backgroundColor: '#FFFFFF',
  },
  otpBoxFocused: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDF9',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF2ED',
    borderWidth: 1,
    borderColor: '#FFD7C7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    width: '100%',
  },
  errorBoxText: {
    fontSize: 12,
    color: '#FF7F50',
    fontWeight: '600',
    flex: 1,
  },
  verifyBtn: {
    backgroundColor: '#00B894',
    borderRadius: 14,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  verifyBtnSmall: {
    height: 44,
    borderRadius: 12,
  },
  verifyBtnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  countdownText: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00B894',
  },
  changeMobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingVertical: 6,
  },
  changeMobileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
});

export default OTPScreen;