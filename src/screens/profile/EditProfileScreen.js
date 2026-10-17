import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../theme/colors';
import { syncActiveUser } from '../../services/dataSyncService';
import WebFooter from '../../components/web/WebFooter';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const BLOOD_GROUPS = [
  'O+ Positive',
  'O- Negative',
  'A+ Positive',
  'A- Negative',
  'B+ Positive',
  'B- Negative',
  'AB+ Positive',
  'AB- Negative',
];
const GENDERS = ['Male', 'Female', 'Other'];

import { useKeyboardVisibility } from '../../utils/keyboardUtils';

const EditProfileScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const passedUser = route?.params?.user || {};
  const scrollViewRef = useRef(null);
  const isKeyboardVisible = useKeyboardVisibility();

  // Store initial credentials to detect changes requiring OTP verification
  const initialEmail = (passedUser.email || '').trim().toLowerCase();
  const rawInitialPhone = (passedUser.phone || '').replace(/[^0-9]/g, '');
  const initialPhoneDigits = rawInitialPhone.length >= 10 ? rawInitialPhone.slice(-10) : rawInitialPhone;

  // Personal Info Form State
  const [name, setName] = useState(passedUser.name || 'Ramesh Kumar');
  const [email, setEmail] = useState(passedUser.email || 'ramesh.kumar@example.com');
  const [phone, setPhone] = useState(initialPhoneDigits || '9845012345');
  const [dob, setDob] = useState(passedUser.dob || '');
  const [bloodGroup, setBloodGroup] = useState(passedUser.bloodGroup || 'O+ Positive');
  const [gender, setGender] = useState(passedUser.gender || 'Male');
  const [age, setAge] = useState(passedUser.age || '32 Yrs');
  const [emergencyContact, setEmergencyContact] = useState(
    (passedUser.emergencyContact || '').replace(/[^0-9]/g, '').slice(-10) || ''
  );
  const [membership, setMembership] = useState(null);

  // Load Membership from Shared Storage
  useEffect(() => {
    const loadMembershipData = async () => {
      try {
        const memStr = await AsyncStorage.getItem('@mediunify_membership');
        if (memStr) {
          const parsed = JSON.parse(memStr);
          if (parsed && parsed.status === 'active') {
            setMembership(parsed);
          } else {
            setMembership(null);
          }
        } else {
          setMembership(null);
        }
      } catch (e) {}
    };
    loadMembershipData();
  }, []);

  // Helper for consistent membership styling
  const getMembershipStyle = () => {
    if (!membership || membership.status !== 'active') return null;
    const tid = (membership.tierId || membership.tierName || '').toLowerCase();
    if (tid.includes('gold')) {
      return {
        ringColor: '#F59E0B',
        bgColor: '#FEF3C7',
        textColor: '#D97706',
        badgeBg: '#D97706',
        label: 'Gold Member',
      };
    }
    if (tid.includes('plat') || tid.includes('premium')) {
      return {
        ringColor: '#2563EB',
        bgColor: '#EFF6FF',
        textColor: '#1D4ED8',
        badgeBg: '#1D4ED8',
        label: 'Premium Member',
      };
    }
    if (tid.includes('silver')) {
      return {
        ringColor: '#94A3B8',
        bgColor: '#F1F5F9',
        textColor: '#475569',
        badgeBg: '#64748B',
        label: 'Silver Member',
      };
    }
    return {
      ringColor: '#007D69',
      bgColor: '#CCFBF1',
      textColor: '#007D69',
      badgeBg: '#007D69',
      label: 'Prime Member',
    };
  };

  const memStyle = getMembershipStyle();

  // OTP Verification Modal State (when changing Phone or Email)
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [securityOtp, setSecurityOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // Change Password State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper: Calculate age from DOB
  const calculateAgeFromDob = (dobStr) => {
    if (!dobStr) return '';
    const parts = dobStr.replace(/[^0-9/\\-]/g, '').split(/[/\\-]/);
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
        const birthDate = new Date(year, month, day);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge >= 0 && calculatedAge <= 120) {
          return `${calculatedAge} Yrs`;
        }
      }
    }
    return '';
  };

  const handleDobChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDob(formatted);
    const calculated = calculateAgeFromDob(formatted);
    if (calculated) {
      setAge(calculated);
    }
  };

  // Strictly accept only numeric digits and cap at exactly 10 digits
  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(cleaned);
  };

  const handleEmergencyContactChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setEmergencyContact(cleaned);
  };

  // Save Profile Handler
  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone10 = phone.replace(/[^0-9]/g, '').slice(0, 10);

    if (!trimmedName) {
      showAlert('Missing Name', 'Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      showAlert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (cleanPhone10.length < 10) {
      showAlert(
        'Incomplete Mobile Number',
        cleanPhone10.length === 0
          ? 'Please enter your 10-digit mobile number.'
          : `Mobile number must be exactly 10 digits. You entered only ${cleanPhone10.length} digits.`
      );
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone10)) {
      showAlert(
        'Invalid Mobile Number',
        'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
      );
      return;
    }

    // Password validation if user opted to change password
    if (showPasswordSection || currentPassword || newPassword || confirmPassword) {
      if (!currentPassword) {
        showAlert('Current Password Required', 'Please enter your current password to update security credentials.');
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        showAlert('Weak New Password', 'New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showAlert('Password Mismatch', 'New password and confirm password do not match.');
        return;
      }
    }

    // ----------------------------------------------------
    // CHECK DUPLICATE EMAIL, PHONE & NAME WITH OTHER USERS
    // ----------------------------------------------------
    try {
      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) {
        try { registeredCreds = JSON.parse(regCredsStr); } catch (e) {}
      }

      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) {
        try { registeredUsers = JSON.parse(regUsersStr); } catch (e) {}
      }

      // Check if Email changed and already belongs to another user
      if (trimmedEmail !== initialEmail) {
        const existingEmailEntry = registeredCreds[trimmedEmail] || registeredUsers[trimmedEmail];
        if (existingEmailEntry) {
          const entryPhone = (existingEmailEntry.phone || '').replace(/[^0-9]/g, '').slice(-10);
          const entryEmail = (existingEmailEntry.email || '').trim().toLowerCase();
          // If it does not belong to current user
          if (entryPhone !== initialPhoneDigits && entryEmail !== initialEmail) {
            showAlert(
              'Email Already in Use',
              `The email address "${trimmedEmail}" is already registered to another user account. Multiple accounts cannot have the same email address.`
            );
            return;
          }
        }
      }

      // Check if Phone changed and already belongs to another user
      if (cleanPhone10 !== initialPhoneDigits) {
        const existingPhoneEntry = registeredCreds[cleanPhone10] || registeredUsers[cleanPhone10];
        if (existingPhoneEntry) {
          const entryPhone = (existingPhoneEntry.phone || '').replace(/[^0-9]/g, '').slice(-10);
          const entryEmail = (existingPhoneEntry.email || '').trim().toLowerCase();
          // If it does not belong to current user
          if (entryEmail !== initialEmail && entryPhone !== initialPhoneDigits) {
            showAlert(
              'Mobile Number Already Registered',
              `The mobile number "+91 ${cleanPhone10}" is already registered to another user account. Multiple accounts cannot share the same phone number.`
            );
            return;
          }
        }
      }

      // Check if Name changed and is taken by another distinct user
      const currentInitialName = (passedUser.name || '').trim().toLowerCase();
      if (trimmedName.toLowerCase() !== currentInitialName) {
        const otherUserNames = Object.entries(registeredUsers)
          .filter(([key, u]) => {
            const uEmail = (u?.email || '').trim().toLowerCase();
            const uPhone = (u?.phone || '').replace(/[^0-9]/g, '').slice(-10);
            return uEmail !== initialEmail && uPhone !== initialPhoneDigits;
          })
          .map(([_, u]) => (u?.name ? u.name.trim().toLowerCase() : ''))
          .filter(Boolean);

        if (otherUserNames.includes(trimmedName.toLowerCase())) {
          showAlert(
            'Full Name Already Registered',
            `An account under the name "${trimmedName}" already exists. Please use your unique full name.`
          );
          return;
        }
      }
    } catch (err) {
      console.log('Duplicate check warning:', err);
    }

    // Check if Email OR Phone changed from initial credentials
    const isEmailChanged = initialEmail && trimmedEmail !== initialEmail;
    const isPhoneChanged = initialPhoneDigits && cleanPhone10 !== initialPhoneDigits;

    if (isEmailChanged || isPhoneChanged) {
      // Prompt OTP Verification Modal before saving credentials change
      setSecurityOtp('');
      setOtpError('');
      setOtpModalVisible(true);
      return;
    }

    // If contact credentials haven't changed, save directly
    performProfileUpdate();
  };

  // Perform actual profile update in storage
  const performProfileUpdate = async () => {
    setSaving(true);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone10 = phone.replace(/[^0-9]/g, '').slice(0, 10);
    const formattedPhone = `+91 ${cleanPhone10}`;
    const cleanEmergency10 = emergencyContact.replace(/[^0-9]/g, '').slice(0, 10);
    const formattedEmergency = cleanEmergency10 ? `+91 ${cleanEmergency10} (Emergency)` : `${formattedPhone} (Family)`;

    try {
      const calculatedAge = calculateAgeFromDob(dob);
      const finalAge = calculatedAge || age || '28 Yrs';

      const updatedUser = {
        name: trimmedName,
        email: trimmedEmail,
        phone: formattedPhone,
        dob,
        bloodGroup,
        gender,
        age: finalAge,
        emergencyContact: formattedEmergency,
      };

      // Save updated data in AsyncStorage
      await AsyncStorage.setItem('userName', trimmedName);
      await AsyncStorage.setItem('userEmail', trimmedEmail);
      await AsyncStorage.setItem('userPhone', formattedPhone);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('@unnathi_primary_user', JSON.stringify(updatedUser));

      // Keep registered users dictionary in sync (remove old keys if changed)
      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) {
        try {
          registeredUsers = JSON.parse(regUsersStr);
        } catch (e) {}
      }
      if (initialEmail && initialEmail !== trimmedEmail) {
        delete registeredUsers[initialEmail];
      }
      if (initialPhoneDigits && initialPhoneDigits !== cleanPhone10) {
        delete registeredUsers[initialPhoneDigits];
      }
      registeredUsers[trimmedEmail] = updatedUser;
      registeredUsers[cleanPhone10] = updatedUser;
      await AsyncStorage.setItem('@unnathi_registered_users', JSON.stringify(registeredUsers));

      // Keep registered credentials in sync (remove old keys if changed)
      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      if (regCredsStr) {
        try {
          registeredCreds = JSON.parse(regCredsStr);
        } catch (e) {}
      }
      const existingCred = registeredCreds[initialEmail] || registeredCreds[initialPhoneDigits] || registeredCreds[trimmedEmail] || registeredCreds[cleanPhone10] || {};
      const updatedCred = {
        ...existingCred,
        email: trimmedEmail,
        phone: cleanPhone10,
        password: (showPasswordSection && newPassword) ? newPassword.trim() : (existingCred.password || '123456'),
        userData: updatedUser,
        updatedAt: Date.now(),
      };
      if (initialEmail && initialEmail !== trimmedEmail) {
        delete registeredCreds[initialEmail];
      }
      if (initialPhoneDigits && initialPhoneDigits !== cleanPhone10) {
        delete registeredCreds[initialPhoneDigits];
      }
      registeredCreds[trimmedEmail] = updatedCred;
      registeredCreds[cleanPhone10] = updatedCred;
      await AsyncStorage.setItem('@unnathi_registered_credentials', JSON.stringify(registeredCreds));

      // Sync family members self profile
      const userKey = (trimmedEmail || cleanPhone10 || 'default').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const userFamKey = `@unnathi_family_members_${userKey}`;
      const savedFam = (await AsyncStorage.getItem(userFamKey)) || (await AsyncStorage.getItem('@unnathi_family_members'));
      let updatedFam = [];
      if (savedFam) {
        try {
          const parsed = JSON.parse(savedFam);
          if (Array.isArray(parsed) && parsed.length > 0) {
            let foundSelf = false;
            updatedFam = parsed.map((m) => {
              if (m.id === 'self' || m.isPrimary || m.relation === 'Self') {
                foundSelf = true;
                return {
                  ...m,
                  name: `${trimmedName} (Self)`,
                  displayName: `${trimmedName.split(' ')[0]} (Self)`,
                  age: finalAge,
                  gender: gender || m.gender,
                  bloodGroup: bloodGroup ? bloodGroup.split(' ')[0] : m.bloodGroup,
                };
              }
              return m;
            });
            if (!foundSelf) {
              updatedFam.unshift({
                id: 'self',
                name: `${trimmedName} (Self)`,
                displayName: `${trimmedName.split(' ')[0]} (Self)`,
                relation: 'Self',
                age: finalAge,
                gender: gender || 'Male',
                bloodGroup: bloodGroup ? bloodGroup.split(' ')[0] : 'O+',
                allergies: 'None',
                conditions: 'None',
                icon: 'person',
                themeColor: '#00B894',
                bgLight: '#E6F8F4',
                isPrimary: true,
              });
            }
          }
        } catch (e) {}
      }

      if (updatedFam.length === 0) {
        updatedFam = [{
          id: 'self',
          name: `${trimmedName} (Self)`,
          displayName: `${trimmedName.split(' ')[0]} (Self)`,
          relation: 'Self',
          age: finalAge,
          gender: gender || 'Male',
          bloodGroup: bloodGroup ? bloodGroup.split(' ')[0] : 'O+',
          allergies: 'None',
          conditions: 'None',
          icon: 'person',
          themeColor: '#00B894',
          bgLight: '#E6F8F4',
          isPrimary: true,
        }];
      }

      await AsyncStorage.setItem(userFamKey, JSON.stringify(updatedFam));
      await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify(updatedFam));

      // Synchronize updated profile to Central Server (live Web <-> Mobile shared data)
      try {
        await syncActiveUser();
      } catch (syncErr) {
        console.warn('[EditProfileScreen] Sync notice:', syncErr);
      }

      setSaving(false);
      setOtpModalVisible(false);

      showAlert(
        'Profile Saved Successfully',
        'Your profile details have been verified and updated!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Profile', { updatedUser });
            },
          },
        ]
      );
    } catch (error) {
      setSaving(false);
      showAlert('Save Error', 'Could not update profile details. Please try again.');
    }
  };

  const handleVerifyOtpAndSubmit = () => {
    if (securityOtp.trim() === '123456') {
      performProfileUpdate();
    } else {
      setOtpError('Invalid OTP code. Please enter demo OTP 123456.');
    }
  };

  const isEmailChanged = initialEmail && email.trim().toLowerCase() !== initialEmail;
  const isPhoneChanged = initialPhoneDigits && phone.replace(/[^0-9]/g, '').slice(0, 10) !== initialPhoneDigits;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {/* TOP APP BAR */}
      <View style={[styles.header, Platform.OS === 'web' && { alignItems: 'center' }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, Platform.OS === 'web' && styles.webInnerContainer]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={isDarkMode ? theme.text : "#1E293B"} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Personal Information</Text>
          </View>

          <TouchableOpacity
            style={styles.saveHeaderBtn}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.saveHeaderBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top > 0 ? insets.top + 10 : 20) : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === 'web' ? 0 : (isKeyboardVisible ? (Platform.OS === 'ios' ? 240 : 180) : 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
        <View style={Platform.OS === 'web' ? styles.webInnerContainer : null}>
        {/* AVATAR HERO DISPLAY (AUTO-GENERATED FROM NAME + REAL-TIME MEMBERSHIP RING) */}
        <View style={styles.avatarCard}>
          <View
            style={[
              styles.avatarCircle,
              memStyle
                ? {
                    borderColor: memStyle.ringColor,
                    borderWidth: 3.5,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 40,
                  }
                : {
                    borderColor: '#007D69',
                    borderWidth: 2,
                    backgroundColor: '#007D69',
                    borderRadius: 40,
                  },
            ]}
          >
            <View
              style={[
                styles.avatarFallback,
                memStyle
                  ? { backgroundColor: memStyle.bgColor, borderRadius: 35 }
                  : { backgroundColor: '#007D69', borderRadius: 35 },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitialText,
                  memStyle
                    ? { color: memStyle.textColor }
                    : { color: '#FFFFFF' },
                ]}
              >
                {name?.trim() ? name.trim().charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>

            {memStyle && (
              <View style={[styles.membershipCrownBadge, { backgroundColor: memStyle.badgeBg }]}>
                <Ionicons name="star" size={13} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.avatarNameRow}>
            <Text style={styles.avatarName}>{name || 'Patient Name'}</Text>
            <Ionicons name="checkmark-circle" size={16} color="#00B894" />
          </View>

          {memStyle && (
            <View style={[styles.avatarMemberPill, { backgroundColor: memStyle.bgColor, borderColor: memStyle.ringColor }]}>
              <Ionicons name="star" size={11} color={memStyle.textColor} />
              <Text style={[styles.avatarMemberPillText, { color: memStyle.textColor }]}>
                {memStyle.label}
              </Text>
            </View>
          )}
        </View>

        {/* SECTION 1: BASIC DETAILS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Basic Details</Text>
          <Text style={styles.sectionSubtitle}>Personal and medical profile details</Text>
        </View>

        <View style={styles.formCard}>
          {/* FULL NAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={17} color="#0D9488" />
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 60, animated: true });
                  }, 100);
                }}
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* GENDER */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderPillsRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderPill,
                    gender === g && styles.genderPillActive,
                  ]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={g === 'Male' ? 'male-outline' : g === 'Female' ? 'female-outline' : 'person-outline'}
                    size={14}
                    color={gender === g ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.genderPillText,
                      gender === g && styles.genderPillTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DATE OF BIRTH & AGE ROW */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1.2, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Date of Birth</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={17} color="#0D9488" />
                <TextInput
                  style={styles.textInput}
                  value={dob}
                  onChangeText={handleDobChange}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                    }, 100);
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 0.8 }]}>
              <Text style={styles.inputLabel}>Age</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="hourglass-outline" size={17} color="#0D9488" />
                <TextInput
                  style={styles.textInput}
                  value={age}
                  onChangeText={setAge}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                    }, 100);
                  }}
                  placeholder="e.g. 28 Yrs"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>

          {/* BLOOD GROUP */}
          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.inputLabel}>Blood Group</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bloodGroupScroll}
            >
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bloodPill,
                    bloodGroup === bg && styles.bloodPillActive,
                  ]}
                  onPress={() => setBloodGroup(bg)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="water"
                    size={12}
                    color={bloodGroup === bg ? '#FFFFFF' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.bloodPillText,
                      bloodGroup === bg && styles.bloodPillTextActive,
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* SECTION 2: CONTACT INFORMATION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.sectionSubtitle}>For appointments, lab reports & medicine delivery</Text>
        </View>

        <View style={styles.formCard}>
          {/* PHONE (10 DIGITS ONLY) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Mobile Phone</Text>
              <Text
                style={[
                  styles.charCountText,
                  phone.length === 10
                    ? styles.charCountValid
                    : phone.length > 0
                    ? styles.charCountWarning
                    : null,
                ]}
              >
                {phone.length}/10 digits
              </Text>
            </View>
            <View
              style={[
                styles.inputWrap,
                phone.length > 0 && phone.length < 10
                  ? styles.inputWrapWarning
                  : phone.length === 10
                  ? styles.inputWrapValid
                  : null,
                isPhoneChanged && styles.inputWrapHighlight,
              ]}
            >
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 360, animated: true });
                  }, 100);
                }}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
              />
              {phone.length === 10 ? (
                <Ionicons name="checkmark-circle" size={17} color="#10B981" />
              ) : phone.length > 0 ? (
                <Ionicons name="alert-circle" size={17} color="#F59E0B" />
              ) : null}
            </View>
            {phone.length > 0 && phone.length < 10 ? (
              <Text style={styles.inlineWarningText}>
                Please enter all 10 digits ({10 - phone.length} more needed)
              </Text>
            ) : isPhoneChanged ? (
              <Text style={styles.inlineInfoText}>
                Security OTP verification required when saving mobile change
              </Text>
            ) : null}
          </View>

          {/* EMAIL */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Email Address</Text>
              {isEmailChanged ? (
                <View style={styles.otpBadgeTag}>
                  <Ionicons name="key-outline" size={11} color="#0284C7" />
                  <Text style={styles.otpBadgeTagText}>OTP Required to change</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.inputWrap, isEmailChanged && styles.inputWrapHighlight]}>
              <Ionicons name="mail-outline" size={17} color="#0D9488" />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 440, animated: true });
                  }, 100);
                }}
                placeholder="Enter email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* EMERGENCY CONTACT (10 DIGITS ONLY) */}
          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Emergency Contact</Text>
              {emergencyContact.length > 0 ? (
                <Text
                  style={[
                    styles.charCountText,
                    emergencyContact.length === 10
                      ? styles.charCountValid
                      : styles.charCountWarning,
                  ]}
                >
                  {emergencyContact.length}/10 digits
                </Text>
              ) : null}
            </View>
            <View style={styles.inputWrap}>
              <View style={[styles.countryCodeBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.countryCodeText, { color: '#DC2626' }]}>+91</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={emergencyContact}
                onChangeText={handleEmergencyContactChange}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 520, animated: true });
                  }, 100);
                }}
                placeholder="10-digit emergency contact"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
              />
              {emergencyContact.length === 10 ? (
                <Ionicons name="checkmark-circle" size={17} color="#10B981" />
              ) : null}
            </View>
          </View>
        </View>

          <View style={{ height: 40 }} />
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ==========================================
          SECURITY OTP VERIFICATION MODAL
      ========================================== */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setOtpModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKbdAvoid}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={() => {}}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                contentContainerStyle={{ paddingBottom: 6 }}
              >
                {/* MODAL HEADER */}
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name="shield-checkmark" size={24} color={colors.teal} />
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => {
                      Keyboard.dismiss();
                      setOtpModalVisible(false);
                    }}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>Security Verification</Text>
                <Text style={styles.modalSubtitle}>
                  You are updating sensitive contact credentials. Please verify with OTP to complete the change.
                </Text>

                {/* CHANGED CREDENTIALS SUMMARY */}
                <View style={styles.changedItemsBox}>
                  {isEmailChanged ? (
                    <View style={styles.changedRow}>
                      <Ionicons name="mail" size={16} color="#0284C7" />
                      <Text style={styles.changedRowLabel}>New Email:</Text>
                      <Text style={styles.changedRowVal} numberOfLines={1}>
                        {email}
                      </Text>
                    </View>
                  ) : null}

                  {isPhoneChanged ? (
                    <View style={styles.changedRow}>
                      <Ionicons name="call" size={16} color="#16A34A" />
                      <Text style={styles.changedRowLabel}>New Mobile:</Text>
                      <Text style={styles.changedRowVal}>+91 {phone}</Text>
                    </View>
                  ) : null}
                </View>

                {/* DEMO OTP HINT */}
                <View style={styles.demoOtpBox}>
                  <Ionicons name="information-circle" size={16} color="#0284C7" />
                  <Text style={styles.demoOtpText}>
                    Demo Verification OTP: <Text style={styles.demoOtpBold}>123456</Text>
                  </Text>
                </View>

                {/* OTP INPUT */}
                <View style={styles.otpInputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.otpInputLabel}>Enter 6-Digit Verification Code</Text>
                    <TouchableOpacity
                      onPress={Keyboard.dismiss}
                      style={styles.dismissKbdBadge}
                    >
                      <Ionicons name="chevron-down-circle-outline" size={13} color={colors.teal} />
                      <Text style={styles.dismissKbdText}>Hide Keyboard</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="123456"
                    placeholderTextColor="#94A3B8"
                    value={securityOtp}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, '').slice(0, 6);
                      setSecurityOtp(cleaned);
                      setOtpError('');
                      if (cleaned.length === 6) {
                        Keyboard.dismiss();
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
                </View>

                {/* MODAL ACTION BUTTONS */}
                <TouchableOpacity
                  style={styles.modalVerifyBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleVerifyOtpAndSubmit();
                  }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={styles.modalVerifyBtnText}>Verify & Save Changes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    setOtpModalVisible(false);
                  }}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  webInnerContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 3,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    borderWidth: 3.5,
    borderColor: '#CCFBF1',
  },
  avatarFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  membershipCrownBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#007D69',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  avatarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  avatarMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarMemberPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  charCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  charCountWarning: {
    color: '#D97706',
  },
  charCountValid: {
    color: '#10B981',
  },
  countryCodeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  otpBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  otpBadgeTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  inputWrapHighlight: {
    borderColor: '#38BDF8',
    backgroundColor: '#F0F9FF',
  },
  inputWrapWarning: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  inputWrapValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  inlineWarningText: {
    fontSize: 10.5,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 3,
  },
  inlineInfoText: {
    fontSize: 10.5,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 3,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  rowInputs: {
    flexDirection: 'row',
  },
  genderPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  genderPillActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  genderPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  genderPillTextActive: {
    color: '#FFFFFF',
  },
  bloodGroupScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  bloodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bloodPillActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  bloodPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  bloodPillTextActive: {
    color: '#FFFFFF',
  },
  passwordToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 4,
  },
  passwordToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  passwordCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginTop: 4,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 10,
  },
  securityPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    marginHorizontal: 16,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },

  // SECURITY OTP MODAL STYLES
  modalKbdAvoid: {
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dismissKbdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dismissKbdText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teal,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  changedItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 12,
  },
  changedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changedRowLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  changedRowVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  demoOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  demoOtpText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  demoOtpBold: {
    fontWeight: '800',
    color: '#1D4ED8',
  },
  otpInputGroup: {
    marginBottom: 18,
  },
  otpInputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: 14,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 6,
    paddingVertical: 10,
  },
  otpErrorText: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  modalVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.teal,
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalVerifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default EditProfileScreen;