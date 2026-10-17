import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../theme/colors';
import { saveTransaction } from '../../services/transactionService';
import WebFooter from '../../components/web/WebFooter';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-1',
    title: 'Referral Bonus Credited',
    subtitle: 'From friend Sneha R. first booking',
    amount: '+₹250',
    type: 'credit',
    date: 'Today, 2:15 PM',
    icon: 'gift-outline',
  },
  {
    id: 'tx-2',
    title: 'Cashback on Complete Health Package',
    subtitle: '10% Lab test booking cashback',
    amount: '+₹150',
    type: 'credit',
    date: 'Yesterday, 6:40 PM',
    icon: 'arrow-down-circle-outline',
  },
  {
    id: 'tx-3',
    title: 'Paid for Pharmacy Medicine Order',
    subtitle: 'Order #ORD-772184',
    amount: '-₹420',
    type: 'debit',
    date: '28 Aug 2026',
    icon: 'arrow-up-circle-outline',
  },
  {
    id: 'tx-4',
    title: 'Wallet Top-Up via UPI',
    subtitle: 'Google Pay Transaction #UPI9984',
    amount: '+₹1,000',
    type: 'credit',
    date: '24 Aug 2026',
    icon: 'add-circle-outline',
  },
];

const WalletScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const [walletBalance, setWalletBalance] = useState(1250);
  const [carePoints, setCarePoints] = useState(500);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  // Top Up Modal
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState('500');

  useEffect(() => {
    loadWalletBalance();
  }, []);

  const loadWalletBalance = async () => {
    try {
      const stored = await AsyncStorage.getItem('@unnathi_wallet_balance');
      if (stored) {
        setWalletBalance(parseInt(stored, 10) || 1250);
      }
      const storedTx = await AsyncStorage.getItem('@unnathi_wallet_transactions');
      if (storedTx) {
        setTransactions(JSON.parse(storedTx));
      }
    } catch (e) {
      console.log('Error loading wallet balance:', e);
    }
  };

  const handleAddMoney = async (amt) => {
    const num = parseInt(amt, 10);
    if (isNaN(num) || num <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid top-up amount.');
      return;
    }

    const newBal = walletBalance + num;
    setWalletBalance(newBal);
    await AsyncStorage.setItem('@unnathi_wallet_balance', newBal.toString());

    const newTx = {
      id: `tx-${Date.now()}`,
      title: 'Wallet Top-Up Added',
      subtitle: 'Added via Instant UPI Payment',
      amount: `+₹${num.toLocaleString('en-IN')}`,
      type: 'credit',
      date: 'Just now',
      icon: 'add-circle-outline',
    };

    const updatedTxList = [newTx, ...transactions];
    setTransactions(updatedTxList);
    await AsyncStorage.setItem('@unnathi_wallet_transactions', JSON.stringify(updatedTxList));

    try {
      await saveTransaction({
        id:          `TXN-WLT-${Date.now()}`,
        refId:       `WLT-${Date.now()}`,
        service:     'Wallet Top-Up',
        serviceType: 'other',
        title:       'Care Wallet Recharge',
        facility:    'MediUnify Wallet',
        date:        'Today, Just now',
        rawDate:     new Date().toISOString(),
        amount:      num,
        mrp:         num,
        status:      'Paid',
        paymentMode: 'Instant UPI',
        items:       [{ name: 'Wallet Balance Top-Up', qty: 1, price: num }],
      });
    } catch (_txErr) {}

    setTopUpModalVisible(false);
    showAlert('Top-Up Successful', `₹${num.toLocaleString('en-IN')} has been added to your MediUnify Wallet.`);
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
            <Text style={styles.headerTitle}>MediUnify Health Wallet</Text>
            <Text style={styles.headerSubtitle}>
              Cashback, Care Points & Instant Payments
            </Text>
          </View>

          <TouchableOpacity
            style={styles.referIconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ReferEarn')}
          >
            <Ionicons name="gift-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={Platform.OS === 'web' ? styles.webInnerContainer : null}>
        {/* ==================================================
            MAIN WALLET BALANCE CARD
        ================================================== */}
        <View style={styles.walletCard}>
          <View style={styles.walletCardTop}>
            <View>
              <Text style={styles.walletLabel}>TOTAL HEALTH CASH BALANCE</Text>
              <Text style={styles.walletBalanceText}>
                ₹{walletBalance.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.pointsPill}>
              <Ionicons name="sparkles" size={14} color="#F59E0B" />
              <Text style={styles.pointsPillText}>{carePoints} Care Pts</Text>
            </View>
          </View>

          <Text style={styles.walletTagline}>
            100% usable on Doctor Bookings, Lab Tests, Pharmacy, Home Nurse & Surgeries.
          </Text>

          {/* DUAL ACTION BUTTONS */}
          <View style={styles.walletActionsRow}>
            <TouchableOpacity
              style={styles.addMoneyBtn}
              activeOpacity={0.88}
              onPress={() => setTopUpModalVisible(true)}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={styles.addMoneyBtnText}>Add Money (+)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.referCardBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ReferEarn')}
            >
              <Ionicons name="gift" size={15} color={colors.secondary} />
              <Text style={styles.referCardBtnText}>Earn ₹250 (Refer)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            WALLET PERKS 3-COLUMN ROW
        ================================================== */}
        <View style={styles.perksRow}>
          <View style={styles.perkCol}>
            <Ionicons name="flash" size={18} color="#059669" />
            <Text style={styles.perkTitle}>1-Tap Payment</Text>
            <Text style={styles.perkSub}>Zero OTP wait</Text>
          </View>
          <View style={styles.perkCol}>
            <Ionicons name="arrow-undo" size={18} color={colors.primary} />
            <Text style={styles.perkTitle}>Instant Refunds</Text>
            <Text style={styles.perkSub}>Auto-credited</Text>
          </View>
          <View style={styles.perkCol}>
            <Ionicons name="cash" size={18} color="#D97706" />
            <Text style={styles.perkTitle}>5% Extra Cash</Text>
            <Text style={styles.perkSub}>On top-ups</Text>
          </View>
        </View>

        {/* ==================================================
            TRANSACTION HISTORY
        ================================================== */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Wallet Passbook & History</Text>
            <Text style={styles.transactionsCount}>{transactions.length} Transactions</Text>
          </View>

          {transactions.map((item) => {
            const isCredit = item.type === 'credit';
            return (
              <View key={item.id} style={styles.txCard}>
                <View
                  style={[
                    styles.txIconBox,
                    isCredit ? styles.txIconBoxCredit : styles.txIconBoxDebit,
                  ]}
                >
                  <Ionicons
                    name={item.icon || (isCredit ? 'arrow-down' : 'arrow-up')}
                    size={18}
                    color={isCredit ? '#059669' : '#DC2626'}
                  />
                </View>

                <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>{item.title}</Text>
                  <Text style={styles.txSubtitle}>{item.subtitle}</Text>
                  <Text style={styles.txDate}>{item.date}</Text>
                </View>

                <Text
                  style={[
                    styles.txAmount,
                    isCredit ? styles.txAmountCredit : styles.txAmountDebit,
                  ]}
                >
                  {item.amount}
                </Text>
              </View>
            );
          })}
        </View>
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* ==================================================
          ADD MONEY / TOP-UP MODAL
      ================================================== */}
      <Modal
        visible={topUpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTopUpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Add Money to Health Wallet</Text>
                <Text style={styles.modalSub}>Instant Top-Up with Zero Transaction Fees</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setTopUpModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter Amount (₹):</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="number-pad"
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="e.g. 500"
            />

            {/* QUICK AMOUNT CHIPS */}
            <Text style={styles.inputLabel}>Or Select Quick Amount:</Text>
            <View style={styles.quickAmountsRow}>
              {['500', '1000', '2000', '5000'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.quickAmtPill,
                    customAmount === amt && styles.quickAmtPillActive,
                  ]}
                  onPress={() => setCustomAmount(amt)}
                >
                  <Text
                    style={[
                      styles.quickAmtText,
                      customAmount === amt && styles.quickAmtTextActive,
                    ]}
                  >
                    +₹{parseInt(amt, 10).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.confirmTopUpBtn}
              activeOpacity={0.88}
              onPress={() => handleAddMoney(customAmount)}
            >
              <Text style={styles.confirmTopUpBtnText}>
                Pay ₹{parseInt(customAmount || '0', 10).toLocaleString('en-IN')} via UPI
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  referIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 70,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  webInnerContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 0,
  },

  // MAIN WALLET CARD
  walletCard: {
    backgroundColor: colors.secondary,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  walletCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#93C5FD',
  },
  walletBalanceText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  pointsPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  walletTagline: {
    fontSize: 11.5,
    color: '#DCE8FF',
    lineHeight: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  walletActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addMoneyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 5,
  },
  addMoneyBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  referCardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 5,
  },
  referCardBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.secondary,
  },

  // PERKS ROW
  perksRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  perkCol: {
    flex: 1,
    alignItems: 'center',
  },
  perkTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    marginTop: 4,
  },
  perkSub: {
    fontSize: 9.5,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // TRANSACTIONS
  transactionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.secondary,
  },
  transactionsCount: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconBoxCredit: {
    backgroundColor: '#ECFDF5',
  },
  txIconBoxDebit: {
    backgroundColor: '#FEF2F2',
  },
  txInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  txTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.secondary,
  },
  txSubtitle: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  txDate: {
    fontSize: 9.5,
    color: colors.slate,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  txAmountCredit: {
    color: '#059669',
  },
  txAmountDebit: {
    color: '#DC2626',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 35,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.secondary,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 6,
    marginTop: 4,
  },
  amountInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.lightTeal,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 18,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 12,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickAmtPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmtPillActive: {
    backgroundColor: colors.lightTeal,
    borderColor: colors.primary,
  },
  quickAmtText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.secondary,
  },
  quickAmtTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  confirmTopUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  confirmTopUpBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

export default WalletScreen;
