// AuthGuardContext.js - Global reusable authentication guard for MediUnify
// Usage: const { requireLogin } = useAuthGuard(); requireLogin(() => proceedWithBooking());
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { syncLogin, syncRegister } from '../services/dataSyncService';

const AuthGuardContext = createContext(null);

const PRE_SEEDED_CREDENTIALS = {
  'user@mediunify.com': { password: 'password123', userData: { name: 'Demo Patient', email: 'user@mediunify.com', phone: '+91 98765 43210', gender: 'Male', bloodGroup: 'O+ Positive', age: '29 Yrs' } },
  '9876543210': { password: 'password123', userData: { name: 'Demo Patient', email: 'user@mediunify.com', phone: '+91 98765 43210', gender: 'Male', bloodGroup: 'O+ Positive', age: '29 Yrs' } },
  'admin@unnathi.com': { password: 'password123', userData: { name: 'Dr. Unnathi Admin', email: 'admin@unnathi.com', phone: '+91 98450 12345', gender: 'Female', bloodGroup: 'A+ Positive', age: '34 Yrs' } },
  '9845012345': { password: 'password123', userData: { name: 'Dr. Unnathi Admin', email: 'admin@unnathi.com', phone: '+91 98450 12345', gender: 'Female', bloodGroup: 'A+ Positive', age: '34 Yrs' } },
};

export const AuthGuardProvider = ({ children }) => {
  const [gateVisible, setGateVisible] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [gateTitle, setGateTitle] = useState('Login Required');
  const [gateMessage, setGateMessage] = useState('You need to login first to book an appointment with the doctor.');
  const pendingActionRef = useRef(null);

  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regReferralCode, setRegReferralCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpRefs = useRef([]);

  useEffect(() => {
    let interval = null;
    if (authTab === 'otp' && otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    } else if (otpCountdown === 0) {
      setCanResendOtp(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authTab, otpCountdown]);

  const handleOtpDigitChange = (text, index) => {
    setErrorMessage('');
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length > 1) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (cleaned[i]) {
          newDigits[i] = cleaned[i];
        }
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(cleaned.length, 5);
      otpRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleAutofillDemoOtp = () => {
    setOtpDigits(['1', '2', '3', '4', '5', '6']);
    setErrorMessage('');
    otpRefs.current[5]?.focus();
  };

  const handleResendOtp = () => {
    if (!canResendOtp) return;
    setOtpCountdown(30);
    setCanResendOtp(false);
    setErrorMessage('');
  };

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setShowRegPassword(false);
    setShowConfirmPassword(false);
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegReferralCode('');
    setAgreedToTerms(true);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpCountdown(30);
    setCanResendOtp(false);
    setErrorMessage('');
    setIsSubmitting(false);
    setAuthTab('login');
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOpenAuth = () => {
        resetForm();
        setLoginVisible(true);
      };
      window.addEventListener('open-auth-modal', handleOpenAuth);
      return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
    }
  }, [resetForm]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const id = 'mediunify-auth-guard-css';
      let s = document.getElementById(id);
      if (!s) {
        s = document.createElement('style');
        s.id = id;
        document.head.appendChild(s);
      }
      s.innerHTML = `
        .ag-login-btn-hover { transition: background-color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease !important; cursor: pointer !important; }
        .ag-login-btn-hover:hover { background-color: #006756 !important; transform: translateY(-1px) !important; box-shadow: 0 4px 12px rgba(0, 125, 105, 0.35) !important; }
        .ag-tab-btn { transition: all 0.18s ease !important; cursor: pointer !important; }
        .ag-cancel-btn-hover { transition: background-color 0.15s ease !important; cursor: pointer !important; }
        .ag-cancel-btn-hover:hover { background-color: #F1F5F9 !important; }
        .ag-close-btn-hover { transition: background-color 0.15s ease !important; cursor: pointer !important; }
        .ag-close-btn-hover:hover { background-color: #F1F5F9 !important; }
        .ag-otp-box:focus { border-color: #007D69 !important; background-color: #FFFFFF !important; box-shadow: 0 0 0 3px rgba(0, 125, 105, 0.15) !important; }

        /* Modal portal stacking rules: AuthGuard modals always stack above background modals without re-rendering DOM */
        div:has(#ag-auth-gate-root),
        div:has(#ag-auth-login-root),
        div:has(> #ag-auth-gate-root),
        div:has(> #ag-auth-login-root) {
          z-index: 999999 !important;
        }
        div:has(#doctor-booking-modal-overlay) {
          z-index: 9990 !important;
        }
        #ag-auth-gate-root,
        #ag-auth-login-root {
          z-index: 999999 !important;
        }
      `;
    }
  }, []);

  // Ensure AuthGuard modal ancestors have high z-index without moving DOM nodes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (gateVisible || loginVisible) {
        const targetId = gateVisible ? 'ag-auth-gate-root' : 'ag-auth-login-root';
        const el = document.getElementById(targetId);
        if (el) {
          let curr = el;
          while (curr && curr !== document.body) {
            curr.style.setProperty('z-index', '999999', 'important');
            curr = curr.parentElement;
          }
        }
      }
    }
  }, [gateVisible, loginVisible]);

  const requireLogin = useCallback(async (pendingAction, customMessage, customTitle) => {
    try {
      const stored = await AsyncStorage.getItem('isLoggedIn');
      const isGuest = await AsyncStorage.getItem('@unnathi_is_guest');
      if (stored === 'true' && isGuest !== 'true') {
        if (pendingAction) pendingAction();
        return;
      }
    } catch (e) {}
    pendingActionRef.current = pendingAction || null;
    setGateTitle(customTitle || 'Login Required');
    setGateMessage(customMessage || 'Please login to continue with this booking.');
    setGateVisible(true);
  }, []);

  const handleGateOK = useCallback(() => {
    setGateVisible(false);
    resetForm();
    setLoginVisible(true);
  }, [resetForm]);

  const handleGateCancel = useCallback(() => {
    setGateVisible(false);
    pendingActionRef.current = null;
  }, []);

  const handleCloseLogin = useCallback(() => {
    setLoginVisible(false);
    pendingActionRef.current = null;
  }, []);

  const onLoginSuccess = async () => {
    setIsSubmitting(false);
    setLoginVisible(false);

    // Broadcast immediate auth event to window so WebHeader & all components update instantly without refresh!
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const storedPhone = (await AsyncStorage.getItem('userPhone')) || (await AsyncStorage.getItem('@unnathi_user_phone'));
        const detail = { isLoggedIn: true, userName: storedName, userPhone: storedPhone };
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail }));
        window.dispatchEvent(new CustomEvent('user-login-success', { detail }));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    }

    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      setTimeout(() => {
        try { action(); } catch (e) { console.warn('[AuthGuard] pending action error:', e); }
      }, 350);
    }
  };

  const handleLogin = async () => {
    const inputVal = email.trim();
    const inputPassword = password.trim();
    setErrorMessage('');
    if (!inputVal) {
      setErrorMessage('Enter a valid email or 10-digit mobile number.');
      return;
    }
    const cleanPhone = inputVal.replace(/[^0-9]/g, '');
    const isEmail = inputVal.includes('@') && inputVal.includes('.');
    const isPhone = cleanPhone.length === 10;
    if (!isEmail && !isPhone) {
      setErrorMessage('Enter a valid email or 10-digit mobile number.');
      return;
    }
    if (!inputPassword) {
      setErrorMessage('Password is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      try {
        const syncRes = await syncLogin(inputVal, inputPassword);
        if (syncRes.success && syncRes.user) {
          await AsyncStorage.setItem('isLoggedIn', 'true');
          await AsyncStorage.setItem('@unnathi_is_guest', 'false');
          if (syncRes.user.name) await AsyncStorage.setItem('userName', syncRes.user.name);
          if (syncRes.user.phone) {
            await AsyncStorage.setItem('userPhone', syncRes.user.phone);
            await AsyncStorage.setItem('@unnathi_user_phone', syncRes.user.phone);
          }
          await onLoginSuccess();
          return;
        } else if (syncRes.status === 401) {
          setIsSubmitting(false);
          setErrorMessage('Incorrect password. Please verify and try again.');
          return;
        }
      } catch (e) {}

      const cleanPhone = inputVal.replace(/[^0-9]/g, '');
      const cleanPhone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      const lowerEmail = inputVal.toLowerCase();

      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) { try { registeredCreds = JSON.parse(regCredsStr); } catch (e) {} }

      const allCreds = { ...PRE_SEEDED_CREDENTIALS, ...registeredCreds };
      const matchingCred = allCreds[lowerEmail] || (cleanPhone10.length === 10 ? allCreds[cleanPhone10] : null);

      if (matchingCred && matchingCred.password && matchingCred.password !== inputPassword) {
        setIsSubmitting(false);
        setErrorMessage('Incorrect password. Please verify and try again.');
        return;
      }

      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) { try { registeredUsers = JSON.parse(regUsersStr); } catch (e) {} }

      const foundReg = (matchingCred && matchingCred.userData) || registeredUsers[lowerEmail] || registeredUsers[cleanPhone10];
      const userName = foundReg?.name || (lowerEmail.includes('@') ? lowerEmail.split('@')[0] : ('User ' + cleanPhone10.slice(-4)));
      const userData = {
        name: userName,
        email: lowerEmail.includes('@') ? lowerEmail : (foundReg?.email || 'user@example.com'),
        phone: cleanPhone10.length === 10 ? ('+91 ' + cleanPhone10) : '+91 98450 12345',
        gender: foundReg?.gender || 'Male',
        bloodGroup: foundReg?.bloodGroup || 'O+ Positive',
        age: foundReg?.age || '28 Yrs',
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('@unnathi_primary_user', JSON.stringify(userData));
      await AsyncStorage.setItem('userName', userData.name);
      await AsyncStorage.setItem('userEmail', userData.email);
      await AsyncStorage.setItem('userPhone', userData.phone);
      await AsyncStorage.setItem('@unnathi_user_phone', userData.phone);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('@unnathi_is_guest', 'false');
      try { syncRegister(userData, inputPassword); } catch (e) {}
      await onLoginSuccess();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage('An error occurred during login. Please try again.');
    }
  };

  const handleProceedToOtp = async () => {
    const nameVal = regName.trim();
    const emailVal = regEmail.trim().toLowerCase();
    const phoneVal = regPhone.trim().replace(/[^0-9]/g, '');
    const passVal = regPassword.trim();
    const confirmPassVal = regConfirmPassword.trim();

    setErrorMessage('');

    if (!nameVal || !emailVal || !phoneVal || !passVal || !confirmPassVal) {
      setErrorMessage('Please fill in all required registration fields.');
      return;
    }
    if (phoneVal.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (passVal.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (passVal !== confirmPassVal) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    try {
      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) { try { registeredCreds = JSON.parse(regCredsStr); } catch (e) {} }
      const cleanPhone10 = phoneVal.slice(-10);
      if (registeredCreds[emailVal] || PRE_SEEDED_CREDENTIALS[emailVal]) {
        setErrorMessage(`An account with email "${emailVal}" already exists. Please sign in instead.`);
        return;
      }
      if (registeredCreds[cleanPhone10] || PRE_SEEDED_CREDENTIALS[cleanPhone10]) {
        setErrorMessage(`An account with mobile number "+91 ${cleanPhone10}" already exists. Please sign in instead.`);
        return;
      }
    } catch (e) {}

    // Switch to OTP verification step
    setOtpDigits(['', '', '', '', '', '']);
    setOtpCountdown(30);
    setCanResendOtp(false);
    setErrorMessage('');
    setAuthTab('otp');
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otpDigits.join('');
    setErrorMessage('');
    if (enteredOtp.length < 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }
    if (enteredOtp !== '123456') {
      setErrorMessage('Invalid verification code. Please enter demo OTP: 123456');
      return;
    }

    setIsSubmitting(true);
    try {
      const nameVal = regName.trim();
      const emailVal = regEmail.trim().toLowerCase();
      const phoneVal = regPhone.trim().replace(/[^0-9]/g, '');
      const passVal = regPassword.trim();
      const cleanPhone10 = phoneVal.slice(-10);
      const formattedPhone = '+91 ' + cleanPhone10;
      const cleanFirstName = nameVal.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '') || 'USER';
      const myReferralCode = `${cleanFirstName}250`;

      const userData = {
        name: nameVal,
        email: emailVal,
        phone: formattedPhone,
        gender: 'Not specified',
        bloodGroup: 'B+ Positive',
        age: '28 Yrs',
        dob: '15/08/1998',
        myReferralCode,
        referralCode: regReferralCode.trim() || null,
        walletBalance: regReferralCode.trim() ? 250 : 0,
      };

      const accountCredentials = {
        email: emailVal,
        phone: cleanPhone10,
        password: passVal,
        myReferralCode,
        referralCode: regReferralCode.trim() || null,
        userData,
        createdAt: Date.now(),
      };

      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) { try { registeredCreds = JSON.parse(regCredsStr); } catch (e) {} }
      registeredCreds[emailVal] = accountCredentials;
      registeredCreds[cleanPhone10] = accountCredentials;
      await AsyncStorage.setItem('@unnathi_registered_credentials', JSON.stringify(registeredCreds));

      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) { try { registeredUsers = JSON.parse(regUsersStr); } catch (e) {} }
      registeredUsers[emailVal] = userData;
      registeredUsers[cleanPhone10] = userData;
      await AsyncStorage.setItem('@unnathi_registered_users', JSON.stringify(registeredUsers));

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('@unnathi_primary_user', JSON.stringify(userData));
      await AsyncStorage.setItem('userName', userData.name);
      await AsyncStorage.setItem('userEmail', userData.email);
      await AsyncStorage.setItem('userPhone', userData.phone);
      await AsyncStorage.setItem('@unnathi_user_phone', userData.phone);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('@unnathi_is_guest', 'false');

      if (regReferralCode.trim()) {
        await AsyncStorage.setItem('@unnathi_wallet_balance', '250');
      }

      try { syncRegister(userData, passVal); } catch (e) {}
      await onLoginSuccess();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage('Could not complete registration. Please try again.');
    }
  };

  const contextValue = {
    requireLogin,
    openLoginModal: () => {
      resetForm();
      setLoginVisible(true);
    },
  };

  const isPasswordFilled = regPassword.length > 0;
  const isConfirmFilled = regConfirmPassword.length > 0;
  const isPasswordMatch = isPasswordFilled && isConfirmFilled && regPassword === regConfirmPassword && regPassword.length >= 6;
  const isPasswordMismatch = isPasswordFilled && isConfirmFilled && regPassword !== regConfirmPassword;

  return (
    <AuthGuardContext.Provider value={contextValue}>
      {children}

      {/* GATE MODAL */}
      <Modal visible={gateVisible} transparent animationType="fade" onRequestClose={handleGateCancel}>
        <View style={styles.overlay} nativeID="ag-auth-gate-root">
          <View style={styles.gateCard}>
            <View style={styles.gateIconCircle}>
              <Ionicons name="lock-closed" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.gateTitle}>{gateTitle}</Text>
            <Text style={styles.gateMessage}>
              {gateMessage}
            </Text>
            <View style={styles.gateActions}>
              <TouchableOpacity
                style={styles.gateCancelBtn}
                className="ag-cancel-btn-hover"
                onPress={handleGateCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.gateCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gateOKBtn}
                className="ag-login-btn-hover"
                onPress={handleGateOK}
                activeOpacity={0.85}
              >
                <Text style={styles.gateOKText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL LOGIN / SIGN UP / OTP MODAL */}
      <Modal visible={loginVisible} transparent animationType="fade" onRequestClose={handleCloseLogin}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay} nativeID="ag-auth-login-root">
          <View style={styles.loginContainer}>
            {/* MODAL HEADER */}
            <View style={styles.loginHeader}>
              <View>
                <View style={styles.brandRow}>
                  <Text style={styles.brandMedi}>Medi</Text>
                  <Text style={styles.brandUnify}>Unify</Text>
                </View>
                <Text style={styles.brandTagline}>All your healthcare. One intelligent platform.</Text>
              </View>
              <TouchableOpacity onPress={handleCloseLogin} style={styles.closeBtn} className="ag-close-btn-hover" activeOpacity={0.7} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* SEGMENTED TAB SWITCHER */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, authTab === 'login' && styles.tabActive]}
                className="ag-tab-btn"
                onPress={() => { setAuthTab('login'); setErrorMessage(''); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="log-in-outline"
                  size={16}
                  color={authTab === 'login' ? '#007D69' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, authTab === 'login' && styles.tabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, (authTab === 'register' || authTab === 'otp') && styles.tabActive]}
                className="ag-tab-btn"
                onPress={() => { setAuthTab('register'); setErrorMessage(''); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-add-outline"
                  size={16}
                  color={(authTab === 'register' || authTab === 'otp') ? '#007D69' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, (authTab === 'register' || authTab === 'otp') && styles.tabTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* CARD INTRO HEADER */}
            <View style={styles.formHeaderIntro}>
              <Text style={styles.formTitle}>
                {authTab === 'login' ? 'Sign In' : authTab === 'register' ? 'Create Account' : 'Verify Mobile Number'}
              </Text>
              <Text style={styles.formSubtitle}>
                {authTab === 'login'
                  ? 'Enter your details to access your healthcare account'
                  : authTab === 'register'
                  ? 'Sign up to book appointments, manage lab tests & view medical records'
                  : 'Step 2 of 2: Enter the 6-digit verification code'}
              </Text>
            </View>

            {/* INLINE ERROR MESSAGE */}
            {!!errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={17} color="#DC2626" />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            )}

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {authTab === 'login' ? (
                <View style={styles.formBody}>
                  {/* INPUT: EMAIL OR PHONE */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Email or Mobile Number</Text>
                    <View style={[styles.inputBox, email ? styles.inputBoxFilled : null]}>
                      <Ionicons
                        name={email.includes('@') ? 'mail-outline' : 'call-outline'}
                        size={19}
                        color={email ? '#007D69' : '#94A3B8'}
                        style={styles.inputPrefixIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Email address or 10-digit number"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        keyboardType="email-address"
                        autoComplete="username"
                        textContentType="username"
                        returnKeyType="next"
                        name="username"
                        id="login_web_identity"
                      />
                      {email.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setEmail('')}
                          style={styles.clearBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Clear input"
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
                      <Text style={styles.fieldLabel}>Password</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setErrorMessage('Password reset instructions will be sent to your registered email/phone.');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.forgotPassLink}>Forgot password?</Text>
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
                        style={styles.textInput}
                        placeholder="Enter your password"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        autoComplete="current-password"
                        textContentType="password"
                        returnKeyType="go"
                        onSubmitEditing={handleLogin}
                        name="password"
                        id="login_web_password"
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword((prev) => !prev)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

                  {/* PRIMARY SUBMIT BUTTON */}
                  <TouchableOpacity
                    style={[styles.primarySubmitBtn, isSubmitting && styles.primarySubmitBtnDisabled]}
                    className="ag-login-btn-hover"
                    onPress={handleLogin}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <View style={styles.btnRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primarySubmitBtnText}>Signing in...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primarySubmitBtnText}>Sign In</Text>
                    )}
                  </TouchableOpacity>

                  {/* FOOTER SWITCHER */}
                  <View style={styles.signupFooter}>
                    <Text style={styles.signupFooterText}>Don't have an account? </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => { setAuthTab('register'); setErrorMessage(''); }}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    >
                      <Text style={styles.signupFooterLink}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : authTab === 'register' ? (
                <View style={styles.formBody}>
                  {/* FIELD 1: FULL NAME */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      Full Name <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <View style={[styles.inputBox, regName ? styles.inputBoxFilled : null]}>
                      <Ionicons
                        name="person-outline"
                        size={19}
                        color={regName ? '#007D69' : '#94A3B8'}
                        style={styles.inputPrefixIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter your full name"
                        placeholderTextColor="#94A3B8"
                        value={regName}
                        onChangeText={setRegName}
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="name"
                        textContentType="name"
                        name="name"
                        id="reg_web_name"
                      />
                      {regName.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setRegName('')}
                          style={styles.clearBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={17} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* FIELD 2: MOBILE NUMBER (10 DIGITS) */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>
                        Mobile Number <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      <Text
                        style={[
                          styles.counterText,
                          regPhone.length === 10 ? styles.counterTextSuccess : regPhone.length > 0 ? styles.counterTextWarning : null,
                        ]}
                      >
                        {regPhone.length}/10 digits
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.inputBox,
                        regPhone.length === 10 ? styles.inputBoxValid : regPhone.length > 0 ? styles.inputBoxFilled : null,
                      ]}
                    >
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <Ionicons
                        name="call-outline"
                        size={19}
                        color={regPhone.length === 10 ? '#007D69' : '#94A3B8'}
                        style={styles.inputPrefixIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#94A3B8"
                        value={regPhone}
                        onChangeText={(val) => setRegPhone(val.replace(/[^0-9]/g, '').slice(0, 10))}
                        keyboardType="phone-pad"
                        inputMode="tel"
                        maxLength={10}
                        autoComplete="tel"
                        textContentType="telephoneNumber"
                        name="tel"
                        id="reg_web_phone"
                      />
                      {regPhone.length === 10 ? (
                        <Ionicons name="checkmark-circle" size={20} color="#007D69" />
                      ) : regPhone.length > 0 ? (
                        <TouchableOpacity
                          onPress={() => setRegPhone('')}
                          style={styles.clearBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={17} color="#94A3B8" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* FIELD 3: EMAIL ADDRESS */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      Email Address <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <View style={[styles.inputBox, regEmail ? styles.inputBoxFilled : null]}>
                      <Ionicons
                        name="mail-outline"
                        size={19}
                        color={regEmail ? '#007D69' : '#94A3B8'}
                        style={styles.inputPrefixIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter your email address"
                        placeholderTextColor="#94A3B8"
                        value={regEmail}
                        onChangeText={setRegEmail}
                        keyboardType="email-address"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        name="email"
                        id="reg_web_email"
                      />
                      {regEmail.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setRegEmail('')}
                          style={styles.clearBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={17} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* FIELD 4: CREATE PASSWORD */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>
                        Create Password <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      {regPassword.length > 0 && (
                        <Text
                          style={[
                            styles.counterText,
                            regPassword.length >= 6 ? styles.counterTextSuccess : styles.counterTextWarning,
                          ]}
                        >
                          {regPassword.length >= 6 ? 'Strong' : `${regPassword.length}/6 chars`}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputBox,
                        regPassword.length >= 6 ? styles.inputBoxValid : regPassword.length > 0 ? styles.inputBoxFilled : null,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={19}
                        color={regPassword ? '#007D69' : '#94A3B8'}
                        style={styles.inputPrefixIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Minimum 6 characters"
                        placeholderTextColor="#94A3B8"
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry={!showRegPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        name="password"
                        id="reg_web_password"
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowRegPassword((prev) => !prev)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        <Ionicons
                          name={showRegPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={showRegPassword ? '#007D69' : '#94A3B8'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* FIELD 5: CONFIRM PASSWORD */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>
                        Confirm Password <Text style={styles.requiredMark}>*</Text>
                      </Text>
                      {isPasswordMatch && (
                        <View style={styles.matchedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#007D69" />
                          <Text style={styles.matchedBadgeText}>Passwords Match</Text>
                        </View>
                      )}
                      {isPasswordMismatch && (
                        <Text style={styles.counterTextWarning}>Mismatch</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputBox,
                        isPasswordMatch ? styles.inputBoxValid : isPasswordMismatch ? styles.inputBoxWarning : regConfirmPassword ? styles.inputBoxFilled : null,
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={19}
                        color={regConfirmPassword ? '#007D69' : '#94A3B8'}
                        style={styles.inputPrefixIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Re-enter your password"
                        placeholderTextColor="#94A3B8"
                        value={regConfirmPassword}
                        onChangeText={setRegConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        name="confirm-password"
                        id="reg_web_confirmpassword"
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowConfirmPassword((prev) => !prev)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                      <Text style={styles.fieldLabel}>
                        Referral Code (Optional)
                      </Text>
                      <View style={styles.bonusHintBadge}>
                        <Ionicons name="gift-outline" size={13} color="#007D69" />
                        <Text style={styles.bonusHintBadgeText}>₹250 Bonus</Text>
                      </View>
                    </View>
                    <View style={[styles.inputBox, regReferralCode ? styles.inputBoxFilled : null]}>
                      <Ionicons
                        name="pricetag-outline"
                        size={19}
                        color={regReferralCode ? '#007D69' : '#94A3B8'}
                        style={styles.inputPrefixIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter referral code (e.g. FRIEND250)"
                        placeholderTextColor="#94A3B8"
                        value={regReferralCode}
                        onChangeText={(val) => setRegReferralCode(val.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoComplete="off"
                        name="referral"
                        id="reg_web_referral"
                      />
                      {regReferralCode.length > 0 && (
                        <View style={styles.appliedTag}>
                          <Text style={styles.appliedTagText}>BONUS READY</Text>
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
                      {agreedToTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.
                    </Text>
                  </TouchableOpacity>

                  {/* PRIMARY PROCEED BUTTON */}
                  <TouchableOpacity
                    style={[styles.primarySubmitBtn, isSubmitting && styles.primarySubmitBtnDisabled]}
                    className="ag-login-btn-hover"
                    onPress={handleProceedToOtp}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    <View style={styles.btnRow}>
                      <Text style={styles.primarySubmitBtnText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>

                  {/* FOOTER SWITCHER */}
                  <View style={styles.signupFooter}>
                    <Text style={styles.signupFooterText}>Already have an account? </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => { setAuthTab('login'); setErrorMessage(''); }}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    >
                      <Text style={styles.signupFooterLink}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* OTP VERIFICATION STEP */
                <View style={styles.otpCard}>
                  <View style={styles.otpIconCircle}>
                    <Ionicons name="shield-checkmark" size={28} color="#007D69" />
                  </View>

                  <Text style={styles.otpTitle}>Verify Your Mobile Number</Text>
                  <Text style={styles.otpSubtitle}>
                    Enter the 6-digit OTP code sent to
                  </Text>

                  {/* PHONE NUMBER PILL */}
                  <View style={styles.phonePill}>
                    <Ionicons name="call-outline" size={14} color="#1E3A8A" />
                    <Text style={styles.phonePillText}>+91 {regPhone}</Text>
                    <TouchableOpacity
                      onPress={() => setAuthTab('register')}
                      activeOpacity={0.7}
                      style={styles.changePhonePillBtn}
                    >
                      <Text style={styles.changePhonePillBtnText}>• Change</Text>
                    </TouchableOpacity>
                  </View>

                  {/* DEMO AUTOFILL CHIP */}
                  <TouchableOpacity
                    style={styles.demoChip}
                    onPress={handleAutofillDemoOtp}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash-outline" size={14} color="#007D69" />
                    <Text style={styles.demoChipText}>
                      Tap to autofill Demo OTP: <Text style={{ fontWeight: '900' }}>123456</Text>
                    </Text>
                  </TouchableOpacity>

                  {/* 6 OTP DIGIT INPUT BOXES */}
                  <View style={styles.otpBoxesRow}>
                    {otpDigits.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => (otpRefs.current[index] = ref)}
                        style={[
                          styles.otpBox,
                          digit ? styles.otpBoxFilled : null,
                        ]}
                        className="ag-otp-box"
                        value={digit}
                        onChangeText={(text) => handleOtpDigitChange(text, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* PRIMARY VERIFY BUTTON */}
                  <TouchableOpacity
                    style={[styles.primarySubmitBtn, { width: '100%', marginTop: 4 }, isSubmitting && styles.primarySubmitBtnDisabled]}
                    className="ag-login-btn-hover"
                    onPress={handleVerifyOtp}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <View style={styles.btnRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primarySubmitBtnText}>Verifying OTP...</Text>
                      </View>
                    ) : (
                      <View style={styles.btnRow}>
                        <Text style={styles.primarySubmitBtnText}>Verify & Complete Registration</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* RESEND OTP */}
                  <View style={styles.resendRow}>
                    {otpCountdown > 0 ? (
                      <Text style={styles.resendText}>
                        Resend OTP in <Text style={styles.countdownText}>{otpCountdown}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                        <Text style={styles.resendLink}>Resend OTP Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* BACK TO REGISTRATION */}
                  <TouchableOpacity
                    style={styles.otpBackRow}
                    onPress={() => setAuthTab('register')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={16} color="#64748B" />
                    <Text style={styles.otpBackRowText}>Back to registration details</Text>
                  </TouchableOpacity>
                </View>
              )}

              {Platform.OS !== 'web' && (
                <TouchableOpacity onPress={handleCloseLogin} style={styles.guestBtn} activeOpacity={0.7}>
                  <Text style={styles.guestBtnText}>Continue as Guest →</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AuthGuardContext.Provider>
  );
};

export const useAuthGuard = () => {
  const ctx = useContext(AuthGuardContext);
  if (!ctx) throw new Error('useAuthGuard must be used inside AuthGuardProvider');
  return ctx;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    ...(Platform.OS === 'web' ? { zIndex: 999999 } : {}),
  },
  gateCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { zIndex: 999999 } : {}),
  },
  gateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007D69',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  gateMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 340,
  },
  gateActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  gateCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    alignItems: 'center',
    backgroundColor: '#FAFCFD',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  gateCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  gateOKBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#007D69',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  gateOKText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginContainer: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 48,
    elevation: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    ...(Platform.OS === 'web' ? { zIndex: 999999 } : {}),
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandMedi: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.5,
  },
  brandUnify: {
    fontSize: 21,
    fontWeight: '900',
    color: '#007D69',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#007D69',
    fontWeight: '800',
  },
  formHeaderIntro: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 2,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 380,
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
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 4,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 17,
  },
  modalScrollView: {
    flexGrow: 1,
    ...(Platform.OS === 'web' ? {
      maxHeight: 'calc(92vh - 160px)',
      overflowY: 'auto',
    } : {}),
  },
  formScrollContent: {
    flexGrow: 1,
  },
  formBody: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 20,
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
  inputPrefixIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  eyeBtn: {
    padding: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  forgotPassLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#007D69',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  primarySubmitBtnDisabled: {
    opacity: 0.65,
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' } : {}),
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 4,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#007D69',
  },
  inputBoxWarning: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  bonusHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  bonusHintBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#007D69',
  },
  appliedTag: {
    backgroundColor: '#F0FDF9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  appliedTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#007D69',
    letterSpacing: 0.5,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#007D69',
    borderColor: '#007D69',
  },
  termsText: {
    fontSize: 12.5,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: '#007D69',
    fontWeight: '700',
  },
  otpCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  otpIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F0FDF9',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  otpSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    gap: 6,
  },
  phonePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  changePhonePillBtn: {
    paddingLeft: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  changePhonePillBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#007D69',
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF9',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  demoChipText: {
    fontSize: 12.5,
    color: '#007D69',
    fontWeight: '600',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  otpBox: {
    width: 44,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      userSelect: 'text',
    } : {}),
  },
  otpBoxFilled: {
    borderColor: '#007D69',
    backgroundColor: '#FFFFFF',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 13,
    color: '#64748B',
  },
  countdownText: {
    fontWeight: '800',
    color: '#007D69',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#007D69',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  otpBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    width: '100%',
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  otpBackRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  guestBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  guestBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
