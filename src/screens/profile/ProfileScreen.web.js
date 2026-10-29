import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  useWindowDimensions,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { syncActiveUser } from '../../services/dataSyncService';
import { promptLoginRequired } from '../../utils/authHelper';
import WebFooter from '../../components/web/WebFooter';
import ProfileScreenMobile from './ProfileScreen.js';
import { isDesktopLayout, isDesktopSiteRequested } from '../../utils/responsiveLayoutHelper';

const ProfileScreenWeb = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const { isDarkMode, language, changeLanguage, LANGUAGES, t } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 992;
  const isTablet = !desktopSiteMode && (width >= 640 && width < 992);

  // User Profile State - loaded dynamically from storage
  const [user, setUser] = useState({
    name: route?.params?.updatedUser?.name || 'Hemanth Gowda T N',
    email: route?.params?.updatedUser?.email || 'hemanthtn808@gmail.com',
    phone: route?.params?.updatedUser?.phone || '+91 98450 12345',
    location: 'Hassan, Karnataka',
    address: 'Hassan, Karnataka',
    photo: route?.params?.updatedUser?.photo || '',
    photoUri: route?.params?.updatedUser?.photoUri || '',
    bloodGroup: 'B+',
    age: '28 Yrs',
    gender: 'Male',
    dob: '02/07/2003',
    emergencyContact: '+91 8861492468 (Emergency)',
    uhid: 'MU-84920',
  });

  const [familyCount, setFamilyCount] = useState(2);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isGuest, setIsGuest] = useState(false);
  const [userMembership, setUserMembership] = useState(null);

  // Modals state
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressCity, setAddressCity] = useState('Hassan');

  // Load Saved Data on Mount & Screen Focus
  useEffect(() => {
    loadProfileData();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadProfileData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route?.params?.updatedUser) {
      const u = route.params.updatedUser;
      setUser((prev) => ({
        ...prev,
        name: u.name || prev.name,
        email: u.email || prev.email,
        phone: u.phone || prev.phone,
        location: u.location || u.address || prev.location,
        address: u.address || u.location || prev.address,
        photo: u.photo !== undefined ? u.photo : prev.photo,
        photoUri: u.photoUri !== undefined ? u.photoUri : prev.photoUri,
        bloodGroup: u.bloodGroup || prev.bloodGroup,
        gender: u.gender || prev.gender,
        age: u.age || prev.age,
        emergencyContact: u.emergencyContact || prev.emergencyContact,
        dob: u.dob || prev.dob,
      }));
    }
  }, [route?.params?.updatedUser]);

  const loadProfileData = async () => {
    try {
      const storedIsLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const storedIsGuest = await AsyncStorage.getItem('@unnathi_is_guest');
      const isGuestMode = storedIsGuest === 'true' || storedIsLoggedIn !== 'true';
      setIsGuest(isGuestMode);

      if (isGuestMode) {
        setUser({
          name: 'Guest User',
          email: '',
          phone: '',
          location: 'Mysuru, Karnataka',
          address: 'Mysuru, Karnataka',
          photo: '',
          photoUri: '',
          bloodGroup: '',
          age: '',
          gender: '',
          emergencyContact: '',
          uhid: '',
          dob: '',
        });
        setUserMembership(null);
        setFamilyCount(0);
        setFamilyMembers([]);
        return;
      }

      const storedPrimary = await AsyncStorage.getItem('@unnathi_primary_user');
      const storedUser = await AsyncStorage.getItem('user');
      const storedName = await AsyncStorage.getItem('userName');
      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedPhone = await AsyncStorage.getItem('userPhone');
      const storedLoc = await AsyncStorage.getItem('@unnathi_user_location');
      const storedCity = await AsyncStorage.getItem('@mediunify_selected_city');
      const storedPhoto = await AsyncStorage.getItem('@unnathi_user_photo');
      const storedAddress = await AsyncStorage.getItem('@unnathi_user_address');

      let parsedUser = null;
      if (storedPrimary) {
        try {
          parsedUser = JSON.parse(storedPrimary);
        } catch (e) {}
      } else if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
        } catch (e) {}
      }

      const regUsersStr = await AsyncStorage.getItem('@unnathi_registered_users');
      let registeredUsers = {};
      if (regUsersStr) {
        try {
          registeredUsers = JSON.parse(regUsersStr);
        } catch (e) {}
      }

      const activeEmail = (parsedUser?.email || storedEmail || '').toLowerCase().trim();
      const regUser = registeredUsers[activeEmail];

      let resolvedFullName = '';
      if (parsedUser?.name && !parsedUser.name.includes('@') && parsedUser.name.trim()) {
        resolvedFullName = parsedUser.name.trim();
      } else if (regUser?.name && !regUser.name.includes('@') && regUser.name.trim()) {
        resolvedFullName = regUser.name.trim();
      } else if (storedName && !storedName.includes('@') && storedName.trim()) {
        resolvedFullName = storedName.trim();
      } else if (parsedUser?.name) {
        const clean =
          parsedUser.name.split('@')[0].replace(/[._-]/g, ' ').replace(/[0-9]/g, '').trim() ||
          parsedUser.name.split('@')[0].replace(/[._-]/g, ' ').trim();
        resolvedFullName =
          clean
            .split(' ')
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ') || '';
      }

      const resolvedLocation =
        storedAddress ||
        storedLoc ||
        parsedUser?.location ||
        parsedUser?.address ||
        (storedCity ? `${storedCity}, Karnataka` : 'Hassan, Karnataka');

      const resolvedPhoto =
        parsedUser?.photo ||
        parsedUser?.photoUri ||
        regUser?.photo ||
        storedPhoto ||
        '';

      setUser((prev) => ({
        ...prev,
        name: resolvedFullName || prev.name || 'Hemanth Gowda T N',
        email: parsedUser?.email || (storedEmail && storedEmail.trim() ? storedEmail.trim() : prev.email),
        phone: parsedUser?.phone || (storedPhone && storedPhone.trim() ? storedPhone.trim() : prev.phone),
        location: resolvedLocation,
        address: resolvedLocation,
        photo: resolvedPhoto || prev.photo,
        photoUri: resolvedPhoto || prev.photoUri,
        bloodGroup: parsedUser?.bloodGroup || regUser?.bloodGroup || prev.bloodGroup || 'B+',
        age: parsedUser?.age || regUser?.age || prev.age || '28 Yrs',
        gender: parsedUser?.gender || regUser?.gender || prev.gender || 'Male',
        emergencyContact: parsedUser?.emergencyContact || regUser?.emergencyContact || prev.emergencyContact || '+91 8861492468 (Emergency)',
        dob: parsedUser?.dob || regUser?.dob || prev.dob || '02/07/2003',
        uhid: parsedUser?.uhid || prev.uhid || 'MU-84920',
      }));

      setAddressInput(storedAddress || resolvedLocation);
      setAddressCity(storedCity || 'Hassan');

      try {
        const famStr = await AsyncStorage.getItem('@unnathi_family_members');
        if (famStr) {
          const parsedFam = JSON.parse(famStr);
          if (Array.isArray(parsedFam) && parsedFam.length > 0) {
            setFamilyMembers(parsedFam);
            setFamilyCount(parsedFam.length);
          }
        }
      } catch (e) {}

      try {
        const memStr = await AsyncStorage.getItem('@mediunify_membership');
        if (memStr) {
          setUserMembership(JSON.parse(memStr));
        } else {
          setUserMembership(null);
        }
      } catch (e) {}

      try {
        syncActiveUser().then((latest) => {
          if (latest) {
            setUser((prev) => ({
              ...prev,
              name: latest.name || prev.name,
              email: latest.email || prev.email,
              phone: latest.phone || prev.phone,
              location: latest.location || latest.address || prev.location,
              address: latest.address || latest.location || prev.address,
              photo: latest.photo || latest.photoUri || prev.photo,
              photoUri: latest.photoUri || latest.photo || prev.photoUri,
              bloodGroup: latest.bloodGroup || prev.bloodGroup,
              age: latest.age || prev.age,
              gender: latest.gender || prev.gender,
              emergencyContact: latest.emergencyContact || prev.emergencyContact,
              dob: latest.dob || prev.dob || '',
              uhid: latest.uhid || prev.uhid,
            }));
            if (latest.familyMembers && Array.isArray(latest.familyMembers) && latest.familyMembers.length > 0) {
              setFamilyMembers(latest.familyMembers);
              setFamilyCount(latest.familyMembers.length);
            }
          }
        });
      } catch (syncErr) {}
    } catch (e) {
      console.log('Error loading profile data:', e);
    }
  };

  // The ONLY Edit Profile handler
  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { user });
  };

  const handleSaveAddress = async () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      showAlert('Address Required', 'Please enter your complete address.');
      return;
    }
    try {
      await AsyncStorage.setItem('@unnathi_user_address', trimmed);
      await AsyncStorage.setItem('@unnathi_user_location', trimmed);
      setUser((prev) => ({ ...prev, location: trimmed, address: trimmed }));
      setShowAddressModal(false);
      showAlert('Address Updated', 'Your delivery & service address has been saved.');
    } catch (e) {
      showAlert('Error', 'Could not save address. Please try again.');
    }
  };

  const handleOpenMapAddress = () => {
    setShowAddressModal(false);
    navigation.navigate('PharmacyLocation');
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

      if (!navigated && Platform.OS === 'web' && typeof window !== 'undefined' && window?.location) {
        const path = window.location.pathname || '';
        const basePath = path.includes('mediunify-patient')
          ? '/mediunify-patient/'
          : path.includes('Mediunify-patient-side-application-')
          ? '/Mediunify-patient-side-application-/'
          : '/';
        window.location.href = basePath;
      }
    };

    showAlert(
      'Logout from MediUnify',
      'Are you sure you want to securely log out of your healthcare account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  const userInitial = isGuest ? 'G' : (user.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : 'U');

  // Membership Style Logic
  const getMembershipInfo = () => {
    if (isGuest || !userMembership || userMembership.status !== 'active') {
      return null;
    }
    const tid = (userMembership.tierId || userMembership.tierName || '').toLowerCase();
    if (tid.includes('gold')) {
      return {
        tierName: 'Gold Membership',
        tierLabel: 'Gold Member',
        ringColor: '#F59E0B',
        bgColor: '#FEF3C7',
        textColor: '#D97706',
        badgeBg: '#D97706',
        cardBg: '#FFFBEB',
        cardBorder: '#FDE68A',
        iconColor: '#D97706',
      };
    }
    if (tid.includes('plat') || tid.includes('premium')) {
      return {
        tierName: tid.includes('plat') ? 'Family Platinum Membership' : 'Premium Membership',
        tierLabel: tid.includes('plat') ? 'Platinum Member' : 'Premium Member',
        ringColor: '#1E3A8A',
        bgColor: '#EFF6FF',
        textColor: '#1E3A8A',
        badgeBg: '#1E3A8A',
        cardBg: '#EFF6FF',
        cardBorder: '#BFDBFE',
        iconColor: '#1E3A8A',
      };
    }
    if (tid.includes('silver')) {
      return {
        tierName: 'Silver Membership',
        tierLabel: 'Silver Member',
        ringColor: '#94A3B8',
        bgColor: '#F1F5F9',
        textColor: '#475569',
        badgeBg: '#647488',
        cardBg: '#F8FAFC',
        cardBorder: '#CBD5E1',
        iconColor: '#647488',
      };
    }
    return {
      tierName: 'Prime Membership',
      tierLabel: 'Prime Member',
      ringColor: '#00B894',
      bgColor: '#CCFBF1',
      textColor: '#00B894',
      badgeBg: '#00B894',
      cardBg: '#F0FDFA',
      cardBorder: '#99F6E4',
      iconColor: '#00B894',
    };
  };

  const memInfo = getMembershipInfo();

  const formatValidityDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return null;
    }
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: isDarkMode ? '#080E1A' : '#F5FEFB', backgroundImage: isDarkMode ? 'none' : undefined }]}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0B0F19' : '#FFFFFF'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.webContainer}>
          {/* ============================================================
              2. REDESIGNED PROFILE HERO BANNER
              Unified, modern web profile hero card that houses:
              - Patient avatar with membership tier ring & star
              - Full name, active membership badge, UHID, verified pill
              - Contact information (phone, email, location)
              - EXACTLY ONE "Edit Profile" button on the entire screen!
          ============================================================ */}
          <View style={[styles.profileHeroBanner, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}>
            <View style={styles.profileHeroInner}>
              {/* Left Group: Avatar + Details */}
              <View style={styles.heroLeftGroup}>
                {/* Avatar with membership ring */}
                <View
                  style={[
                    styles.avatarWrapper,
                    memInfo
                      ? {
                          borderColor: memInfo.ringColor,
                          borderWidth: 3.5,
                          backgroundColor: '#FFFFFF',
                        }
                      : {
                          borderColor: '#13BE9C',
                          borderWidth: 2.5,
                          backgroundColor: '#13BE9C',
                        },
                  ]}
                >
                  <View
                    style={[
                      styles.avatarFallback,
                      memInfo
                        ? { backgroundColor: memInfo.bgColor }
                        : { backgroundColor: '#13BE9C' },
                    ]}
                  >
                    {user.photo || user.photoUri ? (
                      <Image source={{ uri: user.photo || user.photoUri }} style={styles.avatarImage} />
                    ) : (
                      <Text
                        style={[
                          styles.avatarInitial,
                          memInfo ? { color: memInfo.textColor } : { color: '#FFFFFF' },
                        ]}
                      >
                        {userInitial}
                      </Text>
                    )}
                  </View>

                  {memInfo && (
                    <View style={[styles.profileMembershipCrownBadge, { backgroundColor: memInfo.badgeBg }]}>
                      <Ionicons name="star" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                {/* Patient Information Column */}
                <View style={styles.heroInfoColumn}>
                  {/* Name and Badges Row */}
                  <View style={styles.heroNameBadgesRow}>
                    <Text style={[styles.heroPatientName, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                      {isGuest ? (t('guest_user') || 'Guest User') : user.name}
                    </Text>

                    {/* Active Membership Badge */}
                    {!isGuest && memInfo && (
                      <TouchableOpacity
                        style={[
                          styles.membershipBadgePill,
                          { backgroundColor: memInfo.bgColor, borderColor: memInfo.ringColor },
                        ]}
                        onPress={() => navigation.navigate('Membership')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="star" size={12} color={memInfo.textColor} />
                        <Text style={[styles.membershipBadgeText, { color: memInfo.textColor }]}>
                          {memInfo.tierLabel}
                        </Text>
                        <Ionicons name="chevron-forward" size={11} color={memInfo.textColor} />
                      </TouchableOpacity>
                    )}

                    {/* UHID Pill */}
                    {!isGuest && user.uhid ? (
                      <View style={styles.uhidPillHero}>
                        <Ionicons name="finger-print" size={12} color="#13BE9C" />
                        <Text style={styles.uhidPillHeroText}>UHID: {user.uhid}</Text>
                      </View>
                    ) : null}

                    {/* Verified Identity Badge */}
                    {!isGuest && (
                      <View style={styles.verifiedPillHero}>
                        <Ionicons name="checkmark-circle" size={13} color="#13BE9C" />
                        <Text style={styles.verifiedPillHeroText}>Verified Patient</Text>
                      </View>
                    )}
                  </View>

                  {/* Subtitle for Guest */}
                  {isGuest && (
                    <Text style={styles.guestSubtitleText}>
                      {t('guest_subtitle') || 'Login to access your profile'}
                    </Text>
                  )}

                  {/* Patient Contact Details Row */}
                  {!isGuest && (
                    <View style={styles.heroContactRow}>
                      {user.phone ? (
                        <View style={styles.heroContactItem}>
                          <Ionicons name="call-outline" size={14} color="#647488" />
                          <Text style={styles.heroContactText}>{user.phone}</Text>
                        </View>
                      ) : null}

                      {user.email ? (
                        <View style={styles.heroContactItem}>
                          <Ionicons name="mail-outline" size={14} color="#647488" />
                          <Text style={styles.heroContactText}>{user.email}</Text>
                        </View>
                      ) : null}

                      <View style={styles.heroContactItem}>
                        <Ionicons name="location-outline" size={14} color="#13BE9C" />
                        <Text style={styles.heroContactText}>{user.location || 'Hassan, Karnataka'}</Text>
                      </View>

                      <View style={styles.heroContactItem}>
                        <Ionicons name="people-outline" size={14} color="#1E3A8A" />
                        <Text style={[styles.heroContactText, { color: '#1E3A8A', fontWeight: '700' }]}>
                          {familyCount} Family Members
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Group: THE ONLY "EDIT PROFILE" BUTTON ON THIS ENTIRE SCREEN */}
              <View style={styles.heroActionArea}>
                {isGuest ? (
                  <TouchableOpacity
                    style={styles.organicHeroBtn}
                    onPress={() => {
                      const parent = navigation.getParent?.();
                      if (parent?.navigate) {
                        try { parent.navigate('Auth', { screen: 'Login' }); return; } catch (e) {}
                      }
                      navigation.navigate('Login');
                    }}
                    activeOpacity={0.88}
                  >
                    <View style={styles.organicHeroArrowCircle}>
                      <Ionicons name="log-in-outline" size={13} color="#13BE9C" />
                    </View>
                    <Text style={styles.organicHeroBtnText}>
                      {t('login_sign_in') || 'Login / Sign In'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.organicHeroBtn}
                    onPress={handleEditProfile}
                    activeOpacity={0.88}
                  >
                    <View style={styles.organicHeroArrowCircle}>
                      <Ionicons name="create-outline" size={13} color="#13BE9C" />
                    </View>
                    <Text style={styles.organicHeroBtnText}>
                      {t('edit_profile') || 'Edit Profile'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* ============================================================
              3. MAIN CONTENT: CLEAN 2-COLUMN RESPONSIVE LAYOUT
              Left Column: Active Membership, Quick Access, Settings, Logout
              Right Column: Personal Information, Family Members, Data Security
          ============================================================ */}
          <View style={[styles.mainLayoutGrid, isDesktop ? styles.mainLayoutGridDesktop : null]}>
            {/* ----------------------------------------------------
                LEFT COLUMN
            ---------------------------------------------------- */}
            <View style={[styles.leftColumn, isDesktop ? styles.leftColumnDesktop : null]}>
              {/* ACTIVE MEMBERSHIP CARD (Matches Mobile Section 4) */}
              {memInfo && (
                <TouchableOpacity
                  style={[
                    styles.activeMembershipCard,
                    {
                      backgroundColor: isDarkMode ? '#1E293B' : memInfo.cardBg,
                      borderColor: memInfo.cardBorder,
                    },
                  ]}
                  onPress={() => navigation.navigate('Membership')}
                  activeOpacity={0.85}
                >
                  <View style={styles.membershipCardHeader}>
                    <View style={styles.membershipCardLeft}>
                      <View style={[styles.membershipCardStarIconWrap, { backgroundColor: memInfo.ringColor }]}>
                        <Ionicons name="star" size={16} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={[styles.membershipCardTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                          {memInfo.tierName}
                        </Text>
                        <View style={styles.membershipActiveStatusRow}>
                          <View style={styles.activeDot} />
                          <Text style={styles.membershipActiveText}>{t('active') || 'Active'}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.membershipViewManageWrap}>
                      <Text style={[styles.membershipManageText, { color: memInfo.textColor }]}>View</Text>
                      <Ionicons name="chevron-forward" size={14} color={memInfo.textColor} />
                    </View>
                  </View>

                  {userMembership?.expiresAt && formatValidityDate(userMembership.expiresAt) ? (
                    <View style={styles.membershipValidityDivider}>
                      <Ionicons name="calendar-outline" size={13} color={isDarkMode ? '#94A3B8' : '#647488'} />
                      <Text style={[styles.membershipValidityText, { color: isDarkMode ? '#94A3B8' : '#647488' }]}>
                        {t('valid_until') || 'Valid until'}: {formatValidityDate(userMembership.expiresAt)}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )}

              {/* QUICK ACCESS (Matches Mobile Quick Access 4-Card Grid) */}
              <View style={[styles.cardContainer, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>{t('quick_access') || 'Quick Access'}</Text>
                </View>

                <View style={styles.quickAccessGrid}>
                  {/* 1. Family Members */}
                  <TouchableOpacity
                    style={[styles.quickAccessCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC' }]}
                    onPress={() => {
                      if (isGuest) {
                        promptLoginRequired(navigation, { service: 'family' });
                      } else {
                        navigation.navigate('FamilyProfiles');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickAccessIconWrap, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="people" size={22} color="#1E3A8A" />
                    </View>
                    <Text
                      style={[styles.quickAccessTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}
                      numberOfLines={1}
                    >
                      {t('family_members') || 'Family Members'}
                    </Text>
                    <Text style={styles.quickAccessSub}>{familyCount} Linked</Text>
                  </TouchableOpacity>

                  {/* 2. Health Records */}
                  <TouchableOpacity
                    style={[styles.quickAccessCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC' }]}
                    onPress={() => {
                      if (isGuest) {
                        promptLoginRequired(navigation, { service: 'profile', message: 'Please login to access your health records.' });
                      } else {
                        navigation.navigate('HealthRecords');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickAccessIconWrap, { backgroundColor: '#F0FDFA' }]}>
                      <Ionicons name="folder-open" size={22} color="#00B894" />
                    </View>
                    <Text
                      style={[styles.quickAccessTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}
                      numberOfLines={1}
                    >
                      {t('health_records') || 'Health Records'}
                    </Text>
                    <Text style={styles.quickAccessSub}>Digital Vault</Text>
                  </TouchableOpacity>

                  {/* 3. Payment History */}
                  <TouchableOpacity
                    style={[styles.quickAccessCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC' }]}
                    onPress={() => {
                      if (isGuest) {
                        promptLoginRequired(navigation, { service: 'payment', message: 'Please login to view payment history.' });
                      } else {
                        navigation.navigate('TransactionHistory');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickAccessIconWrap, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="receipt-outline" size={22} color="#059669" />
                    </View>
                    <Text
                      style={[styles.quickAccessTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}
                      numberOfLines={1}
                    >
                      {t('payment_history') || 'Payment History'}
                    </Text>
                    <Text style={styles.quickAccessSub}>Invoices</Text>
                  </TouchableOpacity>

                  {/* 4. Settings */}
                  <TouchableOpacity
                    style={[styles.quickAccessCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC' }]}
                    onPress={() => navigation.navigate('Settings')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickAccessIconWrap, { backgroundColor: '#F1F5F9' }]}>
                      <Ionicons name="settings-outline" size={22} color="#647488" />
                    </View>
                    <Text
                      style={[styles.quickAccessTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}
                      numberOfLines={1}
                    >
                      {t('settings') || 'Settings'}
                    </Text>
                    <Text style={styles.quickAccessSub}>Preferences</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ACCOUNT & PREFERENCES CARD */}
              <View style={[styles.cardContainer, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF', marginTop: 16 }]}>
                <View style={styles.menuOptionsList}>
                  {/* Address */}
                  <TouchableOpacity
                    style={styles.menuOptionRow}
                    onPress={() => {
                      if (isGuest) {
                        promptLoginRequired(navigation, { service: 'profile', message: 'Please login to manage your delivery address.' });
                      } else {
                        setShowAddressModal(true);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDFA' }]}>
                      <Ionicons name="location-outline" size={17} color="#13BE9C" />
                    </View>
                    <View style={styles.menuTitleCol}>
                      <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {t('address') || 'Delivery Address'}
                      </Text>
                      <Text style={styles.menuOptionSub} numberOfLines={1}>
                        {user.address || user.location || 'Hassan, Karnataka'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  <View style={[styles.menuDivider, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]} />

                  {/* Membership */}
                  <TouchableOpacity
                    style={styles.menuOptionRow}
                    onPress={() => navigation.navigate('Membership')}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="ribbon-outline" size={17} color="#D97706" />
                    </View>
                    <View style={styles.menuTitleCol}>
                      <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {t('membership') || 'Membership'}
                      </Text>
                      <Text style={styles.menuOptionSub}>VIP health benefits & discounts</Text>
                    </View>
                    {userMembership?.status === 'active' ? (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>{userMembership.tierName} {t('active') || 'Active'}</Text>
                      </View>
                    ) : (
                      <View style={styles.organicActionBtn}>
                        <View style={styles.organicActionIconCircle}>
                          <Ionicons name="sparkles" size={10} color="#13BE9C" />
                        </View>
                        <Text style={styles.organicActionText}>{t('explore_plans') || 'Explore Plans'}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  <View style={[styles.menuDivider, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]} />

                  {/* Notifications */}
                  <TouchableOpacity
                    style={styles.menuOptionRow}
                    onPress={() => navigation.navigate('Notifications')}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="notifications-outline" size={17} color="#D97706" />
                    </View>
                    <View style={styles.menuTitleCol}>
                      <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {t('notifications') || 'Notifications'}
                      </Text>
                      <Text style={styles.menuOptionSub}>Alerts & appointment updates</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  <View style={[styles.menuDivider, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]} />

                  {/* Language */}
                  <TouchableOpacity
                    style={styles.menuOptionRow}
                    onPress={() => setShowLanguageModal(true)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIconCircle, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="globe-outline" size={17} color="#1E3A8A" />
                    </View>
                    <View style={styles.menuTitleCol}>
                      <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {t('language') || 'Language'}
                      </Text>
                      <Text style={styles.menuOptionSub}>App display language</Text>
                    </View>
                    <View style={styles.langPill}>
                      <Text style={styles.langPillText}>{currentLang?.native || 'English'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  <View style={[styles.menuDivider, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]} />

                  {/* Help & Support */}
                  <TouchableOpacity
                    style={styles.menuOptionRow}
                    onPress={() => navigation.navigate('HelpSupport')}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="help-circle-outline" size={17} color="#00B894" />
                    </View>
                    <View style={styles.menuTitleCol}>
                      <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {t('help_support') || 'Help & Support'}
                      </Text>
                      <Text style={styles.menuOptionSub}>Clinical helpline & FAQs</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  <View style={[styles.menuDivider, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]} />

                  {/* About MediUnify */}
                  <TouchableOpacity
                    style={styles.menuOptionRow}
                    onPress={() => setShowAboutModal(true)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIconCircle, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="information-circle-outline" size={17} color="#1E3A8A" />
                    </View>
                    <View style={styles.menuTitleCol}>
                      <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {t('about_app') || 'About MediUnify'}
                      </Text>
                      <Text style={styles.menuOptionSub}>Version, licenses & trust info</Text>
                    </View>
                    <View style={styles.versionPill}>
                      <Text style={styles.versionPillText}>v2.4.0</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* LOGOUT BUTTON */}
              {isGuest ? (
                <TouchableOpacity
                  style={[styles.logoutBtn, { borderColor: '#00B894', backgroundColor: '#E6F8F4' }]}
                  onPress={() => {
                    const parent = navigation.getParent?.();
                    if (parent?.navigate) {
                      try { parent.navigate('Auth', { screen: 'Login' }); return; } catch (e) {}
                    }
                    navigation.navigate('Login');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-in-outline" size={18} color="#00B894" />
                  <Text style={[styles.logoutBtnText, { color: '#00B894' }]}>
                    {t('login_sign_in') || 'Sign In / Login'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  <Text style={styles.logoutBtnText}>{t('logout') || 'Log Out of Account'}</Text>
                </TouchableOpacity>
              )}

              {/* SECURITY NOTE */}
              <View style={styles.securityNoteWrap}>
                <Ionicons name="shield-checkmark" size={13} color="#00B894" />
                <Text style={styles.securityNoteText}>
                  MediUnify Healthcare • 256-Bit SSL Encrypted
                </Text>
              </View>
            </View>

            {/* ----------------------------------------------------
                RIGHT COLUMN
            ---------------------------------------------------- */}
            <View style={[styles.rightColumn, isDesktop ? styles.rightColumnDesktop : null]}>
              {/* ============================================================
                  SECTION 1: PERSONAL INFORMATION
                  NO DUPLICATE EDIT BUTTON HERE! (Only the Hero Edit Profile button)
              ============================================================ */}
              <View style={[styles.cardContainer, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleGroup}>
                    <View style={[styles.iconCircleHeader, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="person-outline" size={18} color="#1E3A8A" />
                    </View>
                    <View>
                      <Text style={[styles.cardHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {t('personal_info') || 'Personal Information'}
                      </Text>
                      <Text style={styles.cardHeaderSubtitle}>
                        Clinical identity & contact details
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Personal Info Grid - Clean 2-column key-value tiles */}
                <View style={styles.detailsGrid}>
                  {/* Full Name */}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Full Name</Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                      {user.name || 'Hemanth Gowda T N'}
                    </Text>
                  </View>

                  {/* Phone Number */}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Mobile Phone</Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                      {user.phone || '+91 98450 12345'}
                    </Text>
                  </View>

                  {/* Email Address */}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={[styles.detailValue, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]} numberOfLines={1}>
                      {user.email || 'hemanthtn808@gmail.com'}
                    </Text>
                  </View>

                  {/* Blood Group */}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Blood Group</Text>
                    <View style={styles.pillValueWrap}>
                      <Ionicons name="water" size={13} color="#FF7F50" />
                      <Text style={[styles.detailValuePill, { color: '#FF7F50' }]}>
                        {user.bloodGroup || 'B+'}
                      </Text>
                    </View>
                  </View>

                  {/* Age & Gender */}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Age & Gender</Text>
                    <View style={styles.pillValueWrap}>
                      <Ionicons name="person" size={13} color="#1E3A8A" />
                      <Text style={[styles.detailValuePill, { color: '#1E3A8A' }]}>
                        {user.age || '28 Yrs'} • {user.gender || 'Male'}
                      </Text>
                    </View>
                  </View>

                  {/* Date of Birth */}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Date of Birth</Text>
                    <View style={styles.pillValueWrap}>
                      <Ionicons name="calendar-outline" size={13} color="#00C2CB" />
                      <Text style={[styles.detailValuePill, { color: '#008B94' }]}>
                        {user.dob || '02/07/2003'}
                      </Text>
                    </View>
                  </View>

                  {/* Emergency SOS Contact */}
                  <View style={[styles.detailItem, { width: '100%' }]}>
                    <Text style={styles.detailLabel}>Emergency Contact (SOS)</Text>
                    <View style={styles.pillValueWrap}>
                      <Ionicons name="alert-circle" size={14} color="#FF7F50" />
                      <Text style={[styles.detailValue, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                        {user.emergencyContact || '+91 8861492468 (Emergency)'}
                      </Text>
                    </View>
                  </View>

                  {/* Delivery & Health Address */}
                  <View style={[styles.detailItem, { width: '100%' }]}>
                    <Text style={styles.detailLabel}>Registered Address</Text>
                    <View style={styles.addressSummaryRow}>
                      <Ionicons name="location-outline" size={16} color="#13BE9C" />
                      <Text style={[styles.addressSummaryText, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                        {user.address || user.location || 'Hassan, Karnataka'}
                      </Text>
                      <TouchableOpacity
                        style={styles.organicActionBtn}
                        onPress={() => setShowAddressModal(true)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.organicActionIconCircle}>
                          <Ionicons name="create-outline" size={11} color="#13BE9C" />
                        </View>
                        <Text style={styles.organicActionText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* ============================================================
                  SECTION 2: FAMILY MEMBERS
              ============================================================ */}
              <View style={[styles.cardContainer, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF', marginTop: 16 }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleGroup}>
                    <View style={[styles.iconCircleHeader, { backgroundColor: '#F0FDFA' }]}>
                      <Ionicons name="people" size={18} color="#13BE9C" />
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.cardHeaderTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                          {t('family_members') || 'Family Members'}
                        </Text>
                        <View style={styles.counterPill}>
                          <Text style={styles.counterPillText}>{familyCount}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardHeaderSubtitle}>
                        Linked family profiles
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.organicActionBtn}
                    onPress={() => {
                      if (isGuest) {
                        promptLoginRequired(navigation, { service: 'family' });
                      } else {
                        navigation.navigate('FamilyProfiles');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.organicActionIconCircle}>
                      <Ionicons name="people-outline" size={11} color="#13BE9C" />
                    </View>
                    <Text style={styles.organicActionText}>Manage Family</Text>
                  </TouchableOpacity>
                </View>

                {/* Family Members Grid */}
                {familyMembers.length > 0 ? (
                  <View style={styles.familyMembersGrid}>
                    {familyMembers.map((member, idx) => (
                      <TouchableOpacity
                        key={member.id || idx}
                        style={[
                          styles.familyCard,
                          {
                            backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC',
                            borderColor: isDarkMode ? '#374151' : '#E2E8F0',
                          },
                        ]}
                        onPress={() => navigation.navigate('FamilyProfiles')}
                        activeOpacity={0.85}
                      >
                        <View style={styles.familyCardHeader}>
                          <View style={styles.familyAvatar}>
                            <Text style={styles.familyAvatarText}>
                              {(member.name || 'M').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.familyMemberName, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}
                              numberOfLines={1}
                            >
                              {member.name}
                            </Text>
                            <View style={styles.familyRelationPill}>
                              <Text style={styles.familyRelationText}>
                                {member.relation || 'Member'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.familyDetailsRow}>
                          {member.age ? (
                            <View style={styles.familyTagItem}>
                              <Ionicons name="calendar-outline" size={12} color="#647488" />
                              <Text style={styles.familyTagText}>{member.age}</Text>
                            </View>
                          ) : null}
                          {member.gender ? (
                            <View style={styles.familyTagItem}>
                              <Ionicons name="person-outline" size={12} color="#647488" />
                              <Text style={styles.familyTagText}>{member.gender}</Text>
                            </View>
                          ) : null}
                          {member.bloodGroup ? (
                            <View style={styles.familyTagItem}>
                              <Ionicons name="water" size={12} color="#13BE9C" />
                              <Text style={[styles.familyTagText, { color: '#13BE9C', fontWeight: '700' }]}>
                                {member.bloodGroup}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyFamilyWrap}>
                    <Ionicons name="people-outline" size={32} color="#94A3B8" />
                    <Text style={styles.emptyFamilyTitle}>No Family Members Linked</Text>
                    <Text style={styles.emptyFamilySub}>
                      Add family members to book doctor visits, diagnostic tests, and manage prescriptions together.
                    </Text>
                    <TouchableOpacity
                      style={styles.organicActionBtn}
                      onPress={() => {
                        if (isGuest) {
                          promptLoginRequired(navigation, { service: 'family' });
                        } else {
                          navigation.navigate('FamilyProfiles');
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.organicActionIconCircle}>
                        <Ionicons name="person-add-outline" size={12} color="#13BE9C" />
                      </View>
                      <Text style={styles.organicActionText}>+ Add Family Member</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ============================================================
                  SECTION 3: SECURITY & DATA PRIVACY NOTE
              ============================================================ */}
              <View style={[styles.privacyCard, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF', marginTop: 16 }]}>
                <View style={styles.privacyCardInner}>
                  <View style={styles.privacyIconWrap}>
                    <Ionicons name="shield-checkmark" size={18} color="#13BE9C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.privacyCardTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                      Clinical Data Privacy & HIPAA Compliance
                    </Text>
                    <Text style={styles.privacyCardDesc}>
                      256-Bit Encrypted & HIPAA Compliant Healthcare Vault.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 4. APPLICATION FOOTER */}
        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* ============================================================
          LANGUAGE SELECTION MODAL
      ============================================================ */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View
            style={[styles.modalCard, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="globe-outline" size={22} color="#00B894" />
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                  {t('language') || 'Select Language'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#647488" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContentList}>
              {LANGUAGES.map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <TouchableOpacity
                    key={langItem.id || langItem.code}
                    style={[
                      styles.langOptionItem,
                      isSelected && styles.langOptionSelected,
                      { borderColor: isSelected ? '#00B894' : isDarkMode ? '#1F2937' : '#E2E8F0' },
                    ]}
                    onPress={async () => {
                      await changeLanguage(langItem.code);
                      setShowLanguageModal(false);
                      showAlert(
                        t('lang_updated_title') || 'Language Updated',
                        `${t('lang_updated_desc') || 'App language set to'} ${langItem.name}.`
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.langOptionLeft}>
                      <View
                        style={[
                          styles.langBadge,
                          { backgroundColor: isSelected ? '#CCFBF1' : '#F1F5F9' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.langBadgeText,
                            { color: isSelected ? '#008B94' : '#475569' },
                          ]}
                        >
                          {langItem.flag || langItem.code.toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.langNameText,
                            { color: isDarkMode ? '#F8FAFC' : '#1E3A8A', fontWeight: isSelected ? '800' : '600' },
                          ]}
                        >
                          {langItem.name}
                        </Text>
                        <Text style={styles.langNativeText}>{langItem.native}</Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#00B894" />
                    ) : (
                      <View style={styles.langRadioUnchecked} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          ADDRESS MANAGEMENT MODAL
      ============================================================ */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddressModal(false)}
        >
          <View
            style={[styles.modalCard, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="location-outline" size={22} color="#00B894" />
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                  {t('address') || 'My Address'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#647488" />
              </TouchableOpacity>
            </View>

            <View style={styles.addressModalBody}>
              <Text style={styles.addressInputLabel}>Delivery & Healthcare Address</Text>
              <TextInput
                style={[
                  styles.addressTextInput,
                  {
                    backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC',
                    color: isDarkMode ? '#F8FAFC' : '#1E3A8A',
                    borderColor: isDarkMode ? '#374151' : '#E2E8F0',
                  },
                ]}
                value={addressInput}
                onChangeText={setAddressInput}
                placeholder="Enter house/flat, street, area, city, pincode"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.mapPinpointBtn}
                onPress={handleOpenMapAddress}
                activeOpacity={0.8}
              >
                <Ionicons name="map-outline" size={17} color="#00B894" />
                <Text style={styles.mapPinpointBtnText}>Pick Location on Map</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveAddressBtn}
                onPress={handleSaveAddress}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveAddressBtnText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          ABOUT MEDIUNIFY MODAL
      ============================================================ */}
      <Modal
        visible={showAboutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAboutModal(false)}
        >
          <View
            style={[styles.modalCard, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={22} color="#00B894" />
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                  {t('about_app') || 'About MediUnify'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAboutModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#647488" />
              </TouchableOpacity>
            </View>

            <View style={styles.aboutModalBody}>
              <View style={styles.aboutBrandCircle}>
                <Ionicons name="medical" size={32} color="#00B894" />
              </View>
              <Text style={[styles.aboutBrandTitle, { color: isDarkMode ? '#F8FAFC' : '#1E3A8A' }]}>
                MediUnify Healthcare
              </Text>
              <Text style={styles.aboutVersionText}>
                Version 2.4.0 (Build 120) • Unified Healthcare Platform
              </Text>

              <View style={styles.aboutTrustBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#00B894" />
                <Text style={styles.aboutTrustText}>
                  NABH & NABL Partnered • HIPAA Compliant Security
                </Text>
              </View>

              <Text style={[styles.aboutDesc, { color: isDarkMode ? '#CBD5E1' : '#475569' }]}>
                MediUnify brings together top doctors, certified diagnostic labs, verified pharmacies, and emergency services into one unified healthcare platform.
              </Text>

              <TouchableOpacity
                style={styles.aboutDoneBtn}
                onPress={() => setShowAboutModal(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.aboutDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FEFB',
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
  },

  // MAIN CONTAINER
  webContainer: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // REDESIGNED UNIFIED PROFILE HERO BANNER
  profileHeroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  profileHeroInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  heroLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
    minWidth: 320,
  },
  avatarWrapper: {
    width: 82,
    height: 82,
    borderRadius: 41,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileMembershipCrownBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
  heroInfoColumn: {
    flex: 1,
  },
  heroNameBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  heroPatientName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  membershipBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  membershipBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  uhidPillHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  uhidPillHeroText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00B894',
  },
  verifiedPillHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  verifiedPillHeroText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  guestSubtitleText: {
    fontSize: 13,
    color: '#647488',
    marginBottom: 6,
    fontWeight: '500',
  },
  heroContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  heroContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroContactText: {
    fontSize: 13,
    color: '#647488',
    fontWeight: '500',
  },

  // THE ONLY EDIT PROFILE BUTTON ON THE SCREEN (Image 2 approved design)
  heroActionArea: {
    alignItems: 'flex-end',
  },
  organicHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 24,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  organicHeroArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organicHeroBtnText: {
    color: '#13BE9C',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Organic Action Button (Circular Outline Icon Ring + Bold #13BE9C Text)
  organicActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  organicActionIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organicActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#13BE9C',
  },

  // MAIN LAYOUT GRID (TWO COLUMNS)
  mainLayoutGrid: {
    flexDirection: 'column',
    gap: 20,
    marginTop: 20,
  },
  mainLayoutGridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftColumn: {
    width: '100%',
  },
  leftColumnDesktop: {
    width: 360,
  },
  rightColumn: {
    flex: 1,
    width: '100%',
  },
  rightColumnDesktop: {
    flex: 1,
  },

  // ACTIVE MEMBERSHIP CARD
  activeMembershipCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  membershipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membershipCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  membershipCardStarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  membershipActiveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  membershipActiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  membershipViewManageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  membershipManageText: {
    fontSize: 12,
    fontWeight: '700',
  },
  membershipValidityDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  membershipValidityText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // CARD CONTAINER
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#647488',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  cardHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircleHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#647488',
    marginTop: 1,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  cardActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00B894',
  },

  // QUICK ACCESS GRID
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAccessCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAccessIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickAccessTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  quickAccessSub: {
    fontSize: 11,
    color: '#647488',
    marginTop: 2,
    fontWeight: '500',
  },

  // ACCOUNT & SETTINGS MENU
  menuOptionsList: {
    gap: 0,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitleCol: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  menuOptionSub: {
    fontSize: 11.5,
    color: '#647488',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  langPill: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  activePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  explorePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  explorePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  versionPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginRight: 6,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#647488',
  },

  // LOGOUT BUTTON
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  securityNoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  securityNoteText: {
    fontSize: 11.5,
    color: '#647488',
    fontWeight: '500',
  },

  // DETAILS GRID (RIGHT COLUMN)
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#647488',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  pillValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  detailValuePill: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  addressSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addressSummaryText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 18,
  },
  changeAddressLink: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  changeAddressLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00B894',
  },

  // FAMILY MEMBERS SECTION
  counterPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  counterPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  familyMembersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  familyCard: {
    width: '48%',
    minWidth: 260,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  familyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  familyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  familyMemberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  familyRelationPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  familyRelationText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  familyDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  familyTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  familyTagText: {
    fontSize: 11.5,
    color: '#647488',
    fontWeight: '500',
  },
  emptyFamilyWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyFamilyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 6,
  },
  emptyFamilySub: {
    fontSize: 12,
    color: '#647488',
    textAlign: 'center',
    maxWidth: 400,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 17,
  },
  addFamilyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addFamilyBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // PRIVACY CARD
  privacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  privacyCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  privacyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  privacyCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  privacyCardDesc: {
    fontSize: 12,
    color: '#647488',
    marginTop: 2,
    lineHeight: 17,
  },

  // MODAL SHARED STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalContentList: {
    gap: 10,
  },
  langOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  langOptionSelected: {
    backgroundColor: '#F0FDFA',
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  langNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  langNativeText: {
    fontSize: 12,
    color: '#647488',
  },
  langRadioUnchecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },

  // ADDRESS MODAL BODY
  addressModalBody: {
    gap: 14,
  },
  addressInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  addressTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E3A8A',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  mapPinpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  mapPinpointBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#00B894',
  },
  saveAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00B894',
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveAddressBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ABOUT MODAL BODY
  aboutModalBody: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  aboutBrandCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  aboutBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  aboutVersionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#647488',
    marginBottom: 12,
    textAlign: 'center',
  },
  aboutTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 14,
  },
  aboutTrustText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00B894',
  },
  aboutDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 18,
  },
  aboutDoneBtn: {
    width: '100%',
    backgroundColor: '#00B894',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutDoneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

const ProfileScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  if (!isDesktopLayout(width)) {
    return <ProfileScreenMobile {...props} />;
  }
  return <ProfileScreenWeb {...props} />;
};

export default ProfileScreenResponsive;
