import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../theme/colors';
import WebFooter from '../../components/web/WebFooter';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const REFERRAL_FRIENDS = [
  {
    id: 'f-1',
    name: 'Sneha Ramesh',
    phone: '+91 98450 XXXXX',
    status: 'Completed',
    reward: '+₹250 Credited',
    date: 'Today, 2:15 PM',
  },
  {
    id: 'f-2',
    name: 'Deepak Mohan',
    phone: '+91 98861 XXXXX',
    status: 'Completed',
    reward: '+₹250 Credited',
    date: '28 Aug 2026',
  },
  {
    id: 'f-3',
    name: 'Vijay Kumar',
    phone: '+91 94480 XXXXX',
    status: 'Completed',
    reward: '+₹250 Credited',
    date: '21 Aug 2026',
  },
  {
    id: 'f-4',
    name: 'Priya Sharma',
    phone: '+91 99001 XXXXX',
    status: 'Pending First Booking',
    reward: '₹250 on 1st order',
    date: 'Invited yesterday',
  },
];

const ReferEarnScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const [referralCode, setReferralCode] = useState('MEDI250');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadUserReferralCode();
  }, []);

  const loadUserReferralCode = async () => {
    try {
      const savedCode = await AsyncStorage.getItem('@unnathi_user_referral_code');
      if (savedCode && savedCode.trim()) {
        setReferralCode(savedCode.trim());
        return;
      }
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName && storedName.trim()) {
        const cleanName = storedName.trim().split(' ')[0].toUpperCase();
        setReferralCode(`${cleanName}250`);
      }
    } catch (e) {
      console.log('Error loading user code:', e);
    }
  };

  const handleCopyCode = () => {
    setCopied(true);
    showAlert(
      'Referral Code Copied',
      `Your code "${referralCode}" has been copied. Share it with friends & family to earn ₹250 each!`
    );
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const message = `Hey! Download the MediUnify App for Doctor Consultations, 3T MRI Scans, Surgeries & Medicines. Use my referral code "${referralCode}" to get an instant ₹250 OFF on your first booking!`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      handleNativeShare();
    });
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `Use my invite code "${referralCode}" on MediUnify App to get ₹250 OFF on Doctor visits, Lab tests & Medicines! Download now.`,
        title: 'Join MediUnify',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {/* HEADER */}
      <View style={[styles.header, Platform.OS === 'web' && { alignItems: 'center' }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, Platform.OS === 'web' && styles.webInnerContainer]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : colors.secondary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Refer & Earn ₹250</Text>
            <Text style={styles.headerSubtitle}>
              Share with friends & get ₹250 Health Cash
            </Text>
          </View>

          <TouchableOpacity
            style={styles.walletIconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Wallet')}
          >
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={Platform.OS === 'web' ? styles.webInnerContainer : null}>
        {/* ==================================================
            REFERRAL HERO CARD
        ================================================== */}
        <View style={styles.heroCard}>
          <View style={styles.giftIconBox}>
            <Ionicons name="gift" size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Earn ₹250 for Every Friend!</Text>
          <Text style={styles.heroSub}>
            Your friend gets <Text style={{ fontWeight: '800', color: '#FDE68A' }}>₹250 OFF</Text> on their first booking, and you get <Text style={{ fontWeight: '800', color: '#FDE68A' }}>₹250 Health Cash</Text> in your wallet.
          </Text>

          {/* REFERRAL CODE BOX */}
          <View style={styles.codeBox}>
            <View>
              <Text style={styles.codeLabel}>YOUR UNIQUE REFERRAL CODE</Text>
              <Text style={styles.codeText}>{referralCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.copyBtn}
              activeOpacity={0.85}
              onPress={handleCopyCode}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy Code'}</Text>
            </TouchableOpacity>
          </View>

          {/* SHARE ON WHATSAPP & SHARE SHEET */}
          <View style={styles.shareButtonsRow}>
            <TouchableOpacity
              style={styles.whatsappShareBtn}
              activeOpacity={0.88}
              onPress={handleShareWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsappShareBtnText}>Share on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreShareBtn}
              activeOpacity={0.85}
              onPress={handleNativeShare}
            >
              <Ionicons name="share-social-outline" size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            HOW IT WORKS 3-STEP GUIDE
        ================================================== */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>How Referral Works</Text>

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBox}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Invite Friends & Family</Text>
              <Text style={styles.stepDesc}>
                Share your referral code via WhatsApp, SMS, or social apps.
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBox}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Friend Gets ₹250 Discount</Text>
              <Text style={styles.stepDesc}>
                They use your code and receive instant ₹250 off on their first consultation or medicine order.
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBox}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>You Get ₹250 in Your Wallet</Text>
              <Text style={styles.stepDesc}>
                ₹250 Health Cash is instantly credited to your MediUnify Wallet once their booking is completed.
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            YOUR EARNINGS SUMMARY
        ================================================== */}
        <View style={styles.earningsSummaryRow}>
          <View style={styles.earningsCol}>
            <Text style={styles.earningsLabel}>TOTAL EARNED</Text>
            <Text style={styles.earningsVal}>₹750</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsCol}>
            <Text style={styles.earningsLabel}>FRIENDS JOINED</Text>
            <Text style={[styles.earningsVal, { color: colors.secondary }]}>3</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsCol}>
            <Text style={styles.earningsLabel}>PENDING</Text>
            <Text style={[styles.earningsVal, { color: '#D97706' }]}>1</Text>
          </View>
        </View>

        {/* ==================================================
            REFERRAL PASSBOOK / INVITED FRIENDS
        ================================================== */}
        <View style={styles.friendsCard}>
          <Text style={styles.friendsCardTitle}>Referral Activity</Text>

          {REFERRAL_FRIENDS.map((friend) => {
            const isCompleted = friend.status === 'Completed';
            return (
              <View key={friend.id} style={styles.friendRow}>
                <View style={styles.friendAvatarBox}>
                  <Ionicons name="person" size={16} color={colors.primary} />
                </View>

                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendPhone}>{friend.phone} • {friend.date}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.friendReward,
                      isCompleted ? { color: '#059669' } : { color: '#D97706' },
                    ]}
                  >
                    {friend.reward}
                  </Text>
                  <Text style={styles.friendStatusText}>{friend.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>
    </SafeAreaView>
  );
};

// ==================================================
// STYLES
// ==================================================

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  walletIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 40,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  webInnerContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 0,
  },

  // HERO CARD
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  giftIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroSub: {
    fontSize: 12,
    color: '#E6FFFA',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 14,
  },

  // CODE BOX
  codeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.slate,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.secondary,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightTeal,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  copyBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primary,
  },

  // SHARE BUTTONS
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  whatsappShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  whatsappShareBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  moreShareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // HOW IT WORKS
  howItWorksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  howItWorksTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumberBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.secondary,
  },
  stepDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
    marginLeft: 36,
  },

  // EARNINGS SUMMARY
  earningsSummaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  earningsCol: {
    flex: 1,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.slate,
  },
  earningsVal: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 3,
  },
  earningsDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },

  // FRIENDS PASSBOOK
  friendsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  friendsCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 10,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  friendAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 10,
  },
  friendName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.secondary,
  },
  friendPhone: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 1,
  },
  friendReward: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  friendStatusText: {
    fontSize: 9.5,
    color: colors.slate,
    marginTop: 1,
  },
});

export default ReferEarnScreen;
