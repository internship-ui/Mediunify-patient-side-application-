import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import colors from '../../theme/colors';
import { isGuestUser, promptLoginRequired } from '../../utils/authHelper';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import {
  syncSaveFamilyMembers,
  syncFetchFamilyMembers,
  syncDeleteFamilyMember,
} from '../../services/dataSyncService';
import WebFooter from '../../components/web/WebFooter';

const RELATIONSHIPS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Sibling', 'Grandparent', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

import { useKeyboardVisibility } from '../../utils/keyboardUtils';

const FamilyProfilesScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const modalScrollRef = useRef(null);
  const isKeyboardVisible = useKeyboardVisibility();

  const [members, setMembers] = useState([]);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState('self');
  const [currentUserKey, setCurrentUserKey] = useState('default');

  // Form states
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Spouse');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');

  useEffect(() => {
    loadMembers();
    const unsubscribe = navigation.addListener('focus', () => {
      loadMembers();
    });
    return unsubscribe;
  }, [navigation]);

  const loadMembers = async () => {
    try {
      const isGuest = await isGuestUser();
      if (isGuest) {
        setIsGuestMode(true);
        setMembers([]);
        return;
      }
      setIsGuestMode(false);
      // 1. Get Primary Account Holder Info
      const storedPrimary = await AsyncStorage.getItem('@unnathi_primary_user');
      const storedUser = await AsyncStorage.getItem('user');
      const storedName = await AsyncStorage.getItem('userName');
      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedPhone = await AsyncStorage.getItem('userPhone');

      let primaryOwnerName = '';
      let primaryOwnerAge = '28 Yrs';
      let primaryOwnerGender = 'Male';
      let primaryOwnerBlood = 'O+';
      let primaryOwnerEmail = storedEmail || '';
      let primaryOwnerPhone = storedPhone || '';

      if (storedPrimary) {
        try {
          const p = JSON.parse(storedPrimary);
          if (p?.name && p.name.trim()) primaryOwnerName = p.name.trim();
          if (p?.age) primaryOwnerAge = p.age;
          if (p?.gender) primaryOwnerGender = p.gender;
          if (p?.bloodGroup) primaryOwnerBlood = p.bloodGroup.split(' ')[0];
          if (p?.email) primaryOwnerEmail = p.email;
          if (p?.phone) primaryOwnerPhone = p.phone;
        } catch (e) {}
      }
      if (!primaryOwnerName && storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u?.name && u.name.trim()) primaryOwnerName = u.name.trim();
          if (u?.age) primaryOwnerAge = u.age;
          if (u?.gender) primaryOwnerGender = u.gender;
          if (u?.bloodGroup) primaryOwnerBlood = u.bloodGroup.split(' ')[0];
          if (u?.email) primaryOwnerEmail = u.email;
          if (u?.phone) primaryOwnerPhone = u.phone;
        } catch (e) {}
      }
      if (!primaryOwnerName && storedName && storedName.trim()) {
        primaryOwnerName = storedName.trim();
      }

      const effectiveName = primaryOwnerName || 'User';
      const cleanDisplayName = effectiveName.split(' ')[0];
      const userKey = (primaryOwnerEmail || primaryOwnerPhone || effectiveName).toLowerCase().replace(/[^a-z0-9]/g, '_');
      setCurrentUserKey(userKey);

      const primaryMember = {
        id: 'self',
        name: `${effectiveName} (Self)`,
        displayName: `${cleanDisplayName} (Self)`,
        relation: 'Self',
        age: primaryOwnerAge,
        gender: primaryOwnerGender,
        bloodGroup: primaryOwnerBlood,
        allergies: 'None',
        conditions: 'None',
        icon: 'person',
        themeColor: '#00B894',
        bgLight: '#E6F8F4',
        isPrimary: true,
      };

      // 2. Load account-specific family members
      const userFamKey = `@unnathi_family_members_${userKey}`;
      const savedUserFam = await AsyncStorage.getItem(userFamKey);
      let currentMembers = null;

      if (savedUserFam) {
        try {
          const parsed = JSON.parse(savedUserFam);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentMembers = parsed;
          }
        } catch (e) {}
      }

      // Fallback: check session family members only if it belongs to this user
      if (!currentMembers) {
        const savedGlobalFam = await AsyncStorage.getItem('@unnathi_family_members');
        if (savedGlobalFam) {
          try {
            const parsedG = JSON.parse(savedGlobalFam);
            if (Array.isArray(parsedG) && parsedG.length > 0) {
              const firstMem = parsedG[0];
              // Only reuse if the primary member matches the current account holder
              if (firstMem?.name && firstMem.name.toLowerCase().includes(cleanDisplayName.toLowerCase())) {
                currentMembers = parsedG;
              }
            }
          } catch (e) {}
        }
      }

      // If still no member list for this account, strictly initialize with ONLY the account holder (Self)
      if (!currentMembers || currentMembers.length === 0) {
        currentMembers = [primaryMember];
      } else {
        // Sync primary self profile
        let hasSelf = false;
        currentMembers = currentMembers.map((m) => {
          if (m.id === 'self' || m.isPrimary || m.relation === 'Self') {
            hasSelf = true;
            return {
              ...m,
              name: `${effectiveName} (Self)`,
              displayName: `${cleanDisplayName} (Self)`,
              age: primaryOwnerAge,
              gender: primaryOwnerGender,
              bloodGroup: primaryOwnerBlood,
            };
          }
          return m;
        });

        if (!hasSelf) {
          currentMembers.unshift(primaryMember);
        }
      }

      // Persist isolated lists
      await AsyncStorage.setItem(userFamKey, JSON.stringify(currentMembers));
      await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify(currentMembers));

      setMembers(currentMembers);

      const savedActive = await AsyncStorage.getItem('@unnathi_active_patient');
      let activeFound = false;
      if (savedActive) {
        try {
          const parsedActive = JSON.parse(savedActive);
          if (parsedActive?.id && currentMembers.some((m) => m.id === parsedActive.id)) {
            setActiveMemberId(parsedActive.id);
            activeFound = true;
          }
        } catch (e) {}
      }

      if (!activeFound) {
        setActiveMemberId(currentMembers[0].id);
        await AsyncStorage.setItem('@unnathi_active_patient', JSON.stringify(currentMembers[0]));
      }

      // 3. Background Sync with Central Server (Web <-> Mobile bidirectional sync)
      try {
        syncFetchFamilyMembers().then((serverMembers) => {
          if (serverMembers && Array.isArray(serverMembers) && serverMembers.length > 0) {
            let hasSelf = false;
            let merged = serverMembers.map((m) => {
              if (m.id === 'self' || m.isPrimary || m.relation === 'Self') {
                hasSelf = true;
                return {
                  ...m,
                  name: `${effectiveName} (Self)`,
                  displayName: `${cleanDisplayName} (Self)`,
                  age: primaryOwnerAge,
                  gender: primaryOwnerGender,
                  bloodGroup: primaryOwnerBlood,
                };
              }
              return m;
            });
            if (!hasSelf) {
              merged.unshift(primaryMember);
            }
            setMembers(merged);
          }
        });
      } catch (syncErr) {}
    } catch (e) {
      console.log('Error loading family profiles:', e);
    }
  };

  const handleSelectActiveMember = async (member) => {
    setActiveMemberId(member.id);
    await AsyncStorage.setItem('@unnathi_active_patient', JSON.stringify(member));
    if (member.isPrimary || member.relation === 'Self') {
      const cleanName = (member.displayName || member.name).replace(/\s*\([Ss]elf\)/g, '').split(' ')[0];
      await AsyncStorage.setItem('userName', cleanName);
    }
    if (Platform.OS === 'web') {
      // Non-blocking banner or subtle feedback on web
    } else {
      showAlert('Active Patient Selected', `${member.name} is now selected for appointments & orders.`);
    }
  };

  const handleAddMember = async () => {
    if (!name.trim() || !age.trim()) {
      showAlert('Incomplete Info', 'Please enter member name and age.');
      return;
    }

    const newMember = {
      id: `fam-${Date.now()}`,
      name: name.trim(),
      displayName: name.trim().split(' ')[0],
      relation,
      age: `${age.trim()} yrs`,
      gender,
      bloodGroup,
      allergies: allergies.trim() || 'None',
      conditions: conditions.trim() || 'None',
      icon: relation === 'Spouse' ? 'heart' : relation === 'Father' ? 'shield-checkmark' : relation === 'Mother' ? 'rose' : relation === 'Son' || relation === 'Daughter' ? 'happy' : 'person',
      themeColor: relation === 'Spouse' ? '#FF7F50' : relation === 'Father' ? '#1E3A8A' : relation === 'Mother' ? '#00C2CB' : '#00B894',
      bgLight: relation === 'Spouse' ? '#FFF2ED' : relation === 'Father' ? '#EFF6FF' : relation === 'Mother' ? '#E0F7FA' : '#E6F8F5',
      isPrimary: false,
    };

    const updated = [...members, newMember];
    setMembers(updated);

    const userFamKey = `@unnathi_family_members_${currentUserKey}`;
    await AsyncStorage.setItem(userFamKey, JSON.stringify(updated));
    await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify(updated));
    await AsyncStorage.setItem('@unnathi_active_patient', JSON.stringify(newMember));
    setActiveMemberId(newMember.id);
    setShowAddModal(false);
    setName('');
    setAge('');
    setAllergies('');
    setConditions('');

    // Push live sync to server for instant Web & Mobile availability
    try {
      await syncSaveFamilyMembers(updated);
    } catch (e) {}

    showAlert('Family Member Added', `${newMember.name} is now linked and set as active patient for appointments.`);
  };

  const executeDeleteMember = async (member) => {
    const updated = members.filter((m) => m.id !== member.id);
    setMembers(updated);

    const userFamKey = `@unnathi_family_members_${currentUserKey}`;
    await AsyncStorage.setItem(userFamKey, JSON.stringify(updated));
    await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify(updated));

    if (activeMemberId === member.id) {
      const fallback = updated[0];
      if (fallback) {
        setActiveMemberId(fallback.id);
        await AsyncStorage.setItem('@unnathi_active_patient', JSON.stringify(fallback));
      }
    }

    // Push live delete to Central Server
    try {
      await syncDeleteFamilyMember(member.id);
      await syncSaveFamilyMembers(updated);
    } catch (e) {}

    showAlert('Member Removed', `${member.name} has been removed from family profiles.`);
  };

  const handleDeleteMember = (member) => {
    if (member.isPrimary) {
      showAlert('Cannot Remove', 'Primary account holder profile cannot be deleted.');
      return;
    }

    showAlert('Remove Member', `Do you want to remove ${member.name} from family profiles?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => executeDeleteMember(member),
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.webHeaderInner}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={isDarkMode ? theme.text : "#1E293B"} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Family Profiles</Text>
          </View>

          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={async () => {
              const isGuest = await isGuestUser();
              if (isGuest) {
                promptLoginRequired(navigation, { service: 'family' });
                return;
              }
              setShowAddModal(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addHeaderBtnText}>Add Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={Platform.OS === 'web' ? styles.webInnerContainer : null}>
        {/* BANNER */}
        <View style={styles.banner}>
          <View style={styles.bannerIconCircle}>
            <Ionicons name="people" size={20} color="#0D9488" />
          </View>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>Manage & Book for Family</Text>
            <Text style={styles.bannerSub}>
              Select an active member to book appointments, lab tests, and medicines.
            </Text>
          </View>
        </View>

        {/* MEMBERS LIST */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Family Members</Text>
          <View style={styles.memberCountBadge}>
            <Text style={styles.memberCountBadgeText}>{members.length}</Text>
          </View>
        </View>

        {isGuestMode ? (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F8F4', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="people-outline" size={32} color="#00B894" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1E3A8A', marginBottom: 6 }}>Login Required</Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 19 }}>
              Please login to manage family members.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#00B894', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 }}
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-auth-modal'));
                }
                navigation?.navigate('Login', { openAuthModal: true });
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.membersGrid, isDesktop && styles.membersGridDesktop]}>
            {members.map((member) => {
              const isActive = activeMemberId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberCard,
                    isDesktop && styles.memberCardDesktop,
                    isActive && styles.memberCardActive,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => handleSelectActiveMember(member)}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.avatarCircle, isActive && styles.avatarCircleActive]}>
                      <Ionicons
                        name={
                          member.relation === 'Self'
                            ? 'person'
                            : member.gender === 'Female'
                            ? 'woman'
                            : 'man'
                        }
                        size={20}
                        color={isActive ? '#00B894' : '#0D9488'}
                      />
                    </View>

                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
                        {member.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberMeta}>
                        {member.relation} • {member.age} • {member.gender}
                      </Text>
                    </View>

                    {!member.isPrimary && (
                      <TouchableOpacity
                        onPress={() => handleDeleteMember(member)}
                        style={styles.trashBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* MEDICAL STATS CHIPS */}
                  <View style={styles.statsChipsRow}>
                    <View style={styles.statChip}>
                      <Ionicons name="water" size={11} color="#EF4444" />
                      <Text style={styles.statChipText}>Blood: {member.bloodGroup || 'N/A'}</Text>
                    </View>
                    <View style={styles.statChip}>
                      <Ionicons name="medical-outline" size={11} color="#0D9488" />
                      <Text style={styles.statChipText}>Allergies: {member.allergies || 'None'}</Text>
                    </View>
                  </View>

                  {/* SWITCH / ACTIVE BUTTON */}
                  <View style={styles.cardBottomAction}>
                    <View style={[styles.activeStatusPill, isActive && styles.activeStatusPillActive]}>
                      <Ionicons
                        name={isActive ? 'checkmark-circle' : 'radio-button-off'}
                        size={15}
                        color={isActive ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.activeStatusText,
                          isActive && styles.activeStatusTextActive,
                        ]}
                      >
                        {isActive ? 'Active Booking Patient' : 'Tap to Select as Active'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ADD MEMBER BUTTON */}
        {!isGuestMode && (
          <TouchableOpacity
            style={styles.addBtnLarge}
            activeOpacity={0.88}
            onPress={async () => {
              const isGuest = await isGuestUser();
              if (isGuest) {
                promptLoginRequired(navigation, { service: 'family' });
                return;
              }
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add-circle" size={19} color="#FFFFFF" />
            <Text style={styles.addBtnLargeText}>Add Family Member</Text>
          </TouchableOpacity>
        )}

          <View style={{ height: 30 }} />
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* ADD MEMBER MODAL */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowAddModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={{ flex: 1 }}
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Family Member</Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowAddModal(false);
                  }}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={modalScrollRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 160 : 20 }}
              >
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Priya Kumar"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => {
                    setTimeout(() => {
                      modalScrollRef.current?.scrollTo({ y: 0, animated: true });
                    }, 100);
                  }}
                />

                <Text style={styles.inputLabel}>Relationship</Text>
                {Platform.OS === 'web' ? (
                  <View style={[styles.pillsScroll, { flexWrap: 'wrap', rowGap: 6 }]}>
                    {RELATIONSHIPS.map((rel) => (
                      <TouchableOpacity
                        key={rel}
                        style={[styles.modalPill, relation === rel && styles.modalPillActive]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setRelation(rel);
                        }}
                      >
                        <Text style={[styles.modalPillText, relation === rel && styles.modalPillTextActive]}>
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                    {RELATIONSHIPS.map((rel) => (
                      <TouchableOpacity
                        key={rel}
                        style={[styles.modalPill, relation === rel && styles.modalPillActive]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setRelation(rel);
                        }}
                      >
                        <Text style={[styles.modalPillText, relation === rel && styles.modalPillTextActive]}>
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Age (Years) *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. 28"
                      placeholderTextColor="#94A3B8"
                      value={age}
                      onChangeText={setAge}
                      onFocus={() => {
                        setTimeout(() => {
                          modalScrollRef.current?.scrollTo({ y: 100, animated: true });
                        }, 100);
                      }}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Gender</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      {['Male', 'Female'].map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.genderPill, gender === g && styles.genderPillActive]}
                          onPress={() => {
                            Keyboard.dismiss();
                            setGender(g);
                          }}
                        >
                          <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Blood Group</Text>
                {Platform.OS === 'web' ? (
                  <View style={[styles.pillsScroll, { flexWrap: 'wrap', rowGap: 6 }]}>
                    {BLOOD_GROUPS.map((bg) => (
                      <TouchableOpacity
                        key={bg}
                        style={[styles.modalPill, bloodGroup === bg && styles.modalPillActive]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setBloodGroup(bg);
                        }}
                      >
                        <Text style={[styles.modalPillText, bloodGroup === bg && styles.modalPillTextActive]}>
                          {bg}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                    {BLOOD_GROUPS.map((bg) => (
                      <TouchableOpacity
                        key={bg}
                        style={[styles.modalPill, bloodGroup === bg && styles.modalPillActive]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setBloodGroup(bg);
                        }}
                      >
                        <Text style={[styles.modalPillText, bloodGroup === bg && styles.modalPillTextActive]}>
                          {bg}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Known Allergies (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Penicillin, Peanuts, None"
                  placeholderTextColor="#94A3B8"
                  value={allergies}
                  onChangeText={setAllergies}
                  onFocus={() => {
                    setTimeout(() => {
                      modalScrollRef.current?.scrollTo({ y: 220, animated: true });
                    }, 100);
                  }}
                />

                <TouchableOpacity
                  style={styles.saveBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleAddMember();
                  }}
                >
                  <Text style={styles.saveBtnText}>Save Family Member</Text>
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
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  webHeaderInner: {
    maxWidth: 1080,
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 3,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: Platform.OS === 'web' ? 0 : 30,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 14,
  },
  webInnerContainer: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 0,
  },
  banner: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  bannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  bannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  memberCountBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberCountBadgeText: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '800',
  },
  membersGrid: {
    width: '100%',
  },
  membersGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  memberCardDesktop: {
    width: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
    marginBottom: 0,
  },
  memberCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#FAFFFD',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleActive: {
    backgroundColor: '#CCFBF1',
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  primaryBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    color: '#0D9488',
    fontSize: 9.5,
    fontWeight: '800',
  },
  memberMeta: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  trashBtn: {
    padding: 6,
  },
  statsChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  cardBottomAction: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeStatusPillActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  activeStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  activeStatusTextActive: {
    color: '#FFFFFF',
  },
  addBtnLarge: {
    backgroundColor: '#00B894',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnLargeText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 8,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  pillsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  modalPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  modalPillActive: {
    backgroundColor: '#0D9488',
  },
  modalPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  modalPillTextActive: {
    color: '#FFFFFF',
  },
  genderPill: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillActive: {
    backgroundColor: '#0D9488',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#00B894',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});

export default FamilyProfilesScreen;
