import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Share,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import WebFooter from '../../components/web/WebFooter';

// ─────────────────────────────────────────────
// DEFAULT TRANSACTIONS (Includes Completed & Refunded)
// ─────────────────────────────────────────────
const DEFAULT_TRANSACTIONS = [
  {
    id: 'TXN-892140',
    refId: 'RAD-739201',
    service: 'Radiology Scan',
    serviceType: 'radiology',
    title: '3.0T MRI Brain',
    facility: 'MediUnify Diagnostics',
    date: 'Today, 02:45 PM',
    rawDate: new Date().toISOString(),
    amount: 3200,
    mrp: 4500,
    status: 'Paid',
    paymentMode: 'Google Pay (UPI)',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: '3.0T MRI Brain with Contrast', qty: 1, price: 3200 },
      { name: 'Radiologist Digital Film & CD', qty: 1, price: 0 },
    ],
  },
  {
    id: 'TXN-REF-812044',
    refId: 'REF-812044',
    service: 'Video Consultation Refund',
    serviceType: 'consultation',
    title: 'Dr. Rahul Sharma (Cancelled by Patient)',
    facility: 'MediUnify TeleHealth',
    date: 'Yesterday, 06:15 PM',
    rawDate: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString(); })(),
    amount: 450,
    mrp: 450,
    status: 'Refunded',
    paymentMode: 'Refunded to Google Pay (UPI)',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: 'Tele-Consultation Fee (100% Refund)', qty: 1, price: 450 },
    ],
  },
  {
    id: 'TXN-845129',
    refId: 'VID-492100',
    service: 'Video Consultation',
    serviceType: 'consultation',
    title: 'Dr. Ananya Rao',
    facility: 'MediUnify TeleHealth',
    date: 'Yesterday, 04:30 PM',
    rawDate: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString(); })(),
    amount: 450,
    mrp: 650,
    status: 'Paid',
    paymentMode: 'PhonePe (UPI)',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: 'Tele-Consultation (15 Mins)', qty: 1, price: 450 },
      { name: 'Digital e-Prescription', qty: 1, price: 0 },
    ],
  },
  {
    id: 'TXN-791022',
    refId: 'LAB-510293',
    service: 'Lab Test',
    serviceType: 'lab',
    title: 'CBC + Thyroid Profile',
    facility: 'MediUnify Pathology',
    date: '28 Aug 2026',
    rawDate: '2026-08-28T08:00:00',
    amount: 748,
    mrp: 1150,
    status: 'Paid',
    paymentMode: 'UPI',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: 'Complete Blood Count (CBC + ESR)', qty: 1, price: 349 },
      { name: 'Thyroid Profile (T3, T4, TSH)', qty: 1, price: 399 },
      { name: 'Home Sample Collection', qty: 1, price: 0 },
    ],
  },
  {
    id: 'TXN-REF-709123',
    refId: 'REF-709123',
    service: 'Lab Test Refund',
    serviceType: 'lab',
    title: 'Lipid Profile Test (Cancelled)',
    facility: 'MediUnify Central Pathology',
    date: '26 Aug 2026',
    rawDate: '2026-08-26T14:30:00',
    amount: 499,
    mrp: 499,
    status: 'Refunded',
    paymentMode: 'Refunded to Source Account (UPI)',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: 'Sample Collection Cancelled (Full Refund)', qty: 1, price: 499 },
    ],
  },
  {
    id: 'TXN-723901',
    refId: 'DOC-190284',
    service: 'Doctor Visit',
    serviceType: 'consultation',
    title: 'Dr. Rahul Sharma',
    facility: 'MediCare Heart Institute',
    date: '25 Aug 2026',
    rawDate: '2026-08-25T17:15:00',
    amount: 800,
    mrp: 800,
    status: 'Paid',
    paymentMode: 'Card (POS)',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: 'In-Person Specialist Consultation', qty: 1, price: 800 },
    ],
  },
  {
    id: 'TXN-692110',
    refId: 'MED-902184',
    service: 'Pharmacy',
    serviceType: 'pharmacy',
    title: 'Medicine Order',
    facility: 'MediUnify Express Pharmacy',
    date: '22 Aug 2026',
    rawDate: '2026-08-22T11:30:00',
    amount: 385,
    mrp: 520,
    status: 'Paid',
    paymentMode: 'Paytm (UPI)',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: 'Dolo 650 Tablets (x2)', qty: 2, price: 110 },
      { name: 'Azithromycin 500mg', qty: 1, price: 145 },
      { name: 'Zincovit Multivitamin', qty: 1, price: 130 },
      { name: 'Express Delivery', qty: 1, price: 0 },
    ],
  },
  {
    id: 'TXN-581903',
    refId: 'LAB-881920',
    service: 'Lab Package',
    serviceType: 'lab',
    title: 'Full Body Package',
    facility: 'MediUnify Central Pathology',
    date: '18 Aug 2026',
    rawDate: '2026-08-18T07:30:00',
    amount: 1299,
    mrp: 2800,
    status: 'Paid',
    paymentMode: 'BHIM UPI',
    gstin: '29AABCU9603R1ZX',
    items: [
      { name: 'Executive Master Health Package (68 Tests)', qty: 1, price: 1299 },
    ],
  },
];

// ─────────────────────────────────────────────
// FILTER TABS WITH REFUND FILTER
// ─────────────────────────────────────────────
const FILTER_TABS = [
  { id: 'all',          label: 'All' },
  { id: 'consultation', label: 'Consult' },
  { id: 'radiology',    label: 'Scan' },
  { id: 'lab',          label: 'Lab' },
  { id: 'pharmacy',     label: 'Pharmacy' },
  { id: 'refund',       label: 'Refund' },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getServiceConfig(type) {
  switch (type) {
    case 'radiology':    return { icon: 'scan-outline',           bg: '#E0F7FA', color: '#00838F' };
    case 'consultation': return { icon: 'person-outline',         bg: '#EEF4FF', color: '#1976D2' };
    case 'lab':          return { icon: 'flask-outline',          bg: '#ECFDF5', color: '#059669' };
    case 'pharmacy':     return { icon: 'medkit-outline',         bg: '#FFF0F1', color: '#E53E3E' };
    case 'nursing':      return { icon: 'home-outline',           bg: '#FEF9C3', color: '#D97706' };
    case 'surgery':      return { icon: 'medical-outline',        bg: '#F3E8FF', color: '#7C3AED' };
    case 'equipment':    return { icon: 'accessibility-outline',  bg: '#FFF7ED', color: '#C2410C' };
    case 'refund':       return { icon: 'arrow-undo-outline',     bg: '#EDE9FE', color: '#7C3AED' };
    default:             return { icon: 'receipt-outline',        bg: '#F1F5F9', color: '#64748B' };
  }
}

function getStatusConfig(status, t = (k) => k) {
  const s = (status || '').toLowerCase();
  if (s === 'refunded' || s.includes('refund')) {
    return { label: `↩ ${t('Refunded')}`, color: '#7C3AED', bg: '#EDE9FE' };
  }
  if (s === 'paid' || s === 'success') {
    return { label: `✓ ${t('Paid')}`, color: '#059669', bg: '#ECFDF5' };
  }
  if (s === 'pending') {
    return { label: t('Pending'), color: '#D97706', bg: '#FEF3C7' };
  }
  if (s === 'failed') {
    return { label: t('Failed'), color: '#DC2626', bg: '#FEF2F2' };
  }
  return { label: t(status || 'Paid'), color: '#059669', bg: '#ECFDF5' };
}

function groupTransactions(list) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yday  = new Date(today.getTime() - 86400000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const groups = { Today: [], Yesterday: [], 'This Month': [], Older: [] };

  list.forEach((txn) => {
    const dateStr = txn.date || '';
    let d = null;
    if (txn.rawDate) {
      const parsed = new Date(txn.rawDate);
      if (!isNaN(parsed.getTime())) d = parsed;
    } else if (txn._savedAt) {
      const parsed = new Date(txn._savedAt);
      if (!isNaN(parsed.getTime())) d = parsed;
    }

    if (!d) {
      if (dateStr.toLowerCase().startsWith('today'))     { groups['Today'].push(txn); return; }
      if (dateStr.toLowerCase().startsWith('yesterday')) { groups['Yesterday'].push(txn); return; }
      groups['Older'].push(txn);
      return;
    }
    const txnDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (txnDay.getTime() === today.getTime())       groups['Today'].push(txn);
    else if (txnDay.getTime() === yday.getTime())   groups['Yesterday'].push(txn);
    else if (d >= thisMonthStart)                   groups['This Month'].push(txn);
    else                                            groups['Older'].push(txn);
  });

  return Object.entries(groups)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const TransactionHistoryScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const S = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [search,       setSearch]       = useState('');
  const [selectedTab,  setSelectedTab]  = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [selectedTxn,  setSelectedTxn]  = useState(null);

  // Reload every time screen comes into focus (picks up new payments)
  useFocusEffect(
    useCallback(() => {
      loadTransactionsFromStorage();
    }, [])
  );

  const loadTransactionsFromStorage = async () => {
    try {
      const dynamicList = [];

      // ── 1. PRIMARY: unified transaction store ──────────────────────
      const txnJson = await AsyncStorage.getItem('@mediunify_transactions');
      if (txnJson) {
        try {
          const txnList = JSON.parse(txnJson);
          if (Array.isArray(txnList)) {
            txnList.forEach((txn) => {
              if (txn && (txn.id || txn.refId)) dynamicList.push(txn);
            });
          }
        } catch (e) {}
      }

      // ── 2. BOOKED TESTS & SCANS (ImagingScreen & Lab) ──────────────
      const bookedTestsJson = await AsyncStorage.getItem('@mediunify_patient_booked_tests');
      if (bookedTestsJson) {
        try {
          const parsed = JSON.parse(bookedTestsJson);
          if (Array.isArray(parsed)) {
            parsed.forEach((bt) => {
              const refId = bt.id || bt.bookingId || '';
              if (!refId) return;
              const isRefund = (bt.paymentStatus || '').toLowerCase().includes('refund') || (bt.status || '').toLowerCase() === 'cancelled';
              const isRadiology = bt.type === 'radiology' || (bt.bookingType || '').toLowerCase().includes('radiology') || (bt.serviceType || '').toLowerCase().includes('radiology');
              dynamicList.push({
                id:          `TXN-${refId.replace(/\D/g, '') || Date.now()}`,
                refId,
                service:     isRadiology ? 'Radiology Scan' : 'Lab Test',
                serviceType: isRadiology ? 'radiology' : 'lab',
                title:       bt.tests ? bt.tests.map((t) => t.name).join(', ') : (bt.testName || 'Diagnostic Test'),
                facility:    bt.diagnosticCentre?.name || bt.centreName || bt.facilityName || bt.labName || 'MediUnify Diagnostics',
                date:        `${bt.date || bt.bookingDate || 'Recent'}${bt.time || bt.timeSlot ? ', ' + (bt.time || bt.timeSlot) : ''}`,
                rawDate:     bt.rawDate || (bt.date ? new Date(bt.date).toISOString() : (bt.bookingDate ? new Date(bt.bookingDate).toISOString() : null)),
                amount:      Number(bt.paidAmount || bt.totalAmount || bt.testPrice || bt.price || 0),
                mrp:         Number(bt.mrpAmount || bt.testPrice || bt.paidAmount || bt.price || 0),
                status:      isRefund ? 'Refunded' : 'Paid',
                paymentMode: bt.paymentMethod || bt.paymentStatus || 'Online UPI',
                gstin:       '29AABCU9603R1ZX',
                items:       bt.tests
                  ? bt.tests.map((t) => ({ name: t.name, qty: 1, price: t.price || 0 }))
                  : [{ name: bt.testName || 'Diagnostic Test', qty: 1, price: Number(bt.paidAmount || bt.testPrice || 0) }],
              });
            });
          }
        } catch (e) {}
      }

      // ── 3. RADIOLOGY BOOKINGS ──────────────────────────────────────
      const radJson = await AsyncStorage.getItem('@radiologyBookings');
      if (radJson) {
        try {
          const parsed = JSON.parse(radJson);
          if (Array.isArray(parsed)) {
            parsed.forEach((rad) => {
              const refId = rad.bookingId || rad.id || '';
              if (!refId) return;
              const isRefund = (rad.paymentStatus || '').toLowerCase().includes('refund') || (rad.status || '').toLowerCase() === 'cancelled';
              dynamicList.push({
                id:          `TXN-${refId.replace(/\D/g, '') || Date.now()}`,
                refId,
                service:     'Radiology Scan',
                serviceType: 'radiology',
                title:       rad.tests ? rad.tests.map((t) => t.name).join(', ') : (rad.testName || 'Radiology Scan'),
                facility:    rad.labName || rad.centerName || 'MediUnify Diagnostics',
                date:        `${rad.date || 'Recent'}${rad.slot || rad.timeSlot ? ', ' + (rad.slot || rad.timeSlot) : ''}`,
                rawDate:     rad.rawDate || (rad.date ? new Date(rad.date).toISOString() : null),
                amount:      Number(rad.totalAmount || rad.paidAmount || rad.amount || 0),
                mrp:         Number(rad.mrpAmount || rad.totalAmount || rad.paidAmount || 0),
                status:      isRefund ? 'Refunded' : (rad.paymentMethod === 'LAB_COUNTER' ? 'Pending' : 'Paid'),
                paymentMode: rad.paymentMethod === 'LAB_COUNTER' ? 'Pay at Lab Counter' : (rad.paymentMethod || 'Online UPI'),
                gstin:       '29AABCU9603R1ZX',
                items:       rad.tests
                  ? rad.tests.map((t) => ({ name: t.name, qty: 1, price: t.price || 0 }))
                  : [{ name: rad.testName || 'Radiology Scan', qty: 1, price: Number(rad.totalAmount || rad.paidAmount || 0) }],
              });
            });
          }
        } catch (e) {}
      }

      // ── 4. LAB BOOKINGS ────────────────────────────────────────────
      const labJson = await AsyncStorage.getItem('@labBookings');
      if (labJson) {
        try {
          const parsed = JSON.parse(labJson);
          if (Array.isArray(parsed)) {
            parsed.forEach((lab) => {
              const refId = lab.id || '';
              if (!refId) return;
              const isRefund = (lab.paymentStatus || '').toLowerCase().includes('refund');
              dynamicList.push({
                id:          `TXN-${refId.replace(/\D/g, '') || Date.now()}`,
                refId,
                service:     'Lab Test',
                serviceType: 'lab',
                title:       lab.tests ? lab.tests.map((t) => t.name).join(', ') : (lab.testName || 'Lab Tests'),
                facility:    lab.labCenter?.name || lab.labName || 'MediUnify Pathology',
                date:        `${lab.date || 'Recent'}${lab.time ? ', ' + lab.time : ''}`,
                rawDate:     lab.rawDate || (lab.date ? new Date(lab.date).toISOString() : null),
                amount:      Number(lab.paidAmount || lab.totalAmount || 0),
                mrp:         Number(lab.mrpAmount || lab.totalAmount || 0),
                status:      isRefund ? 'Refunded' : 'Paid',
                paymentMode: lab.paymentMode || lab.paymentStatus || 'Online UPI',
                gstin:       '29AABCU9603R1ZX',
                items:       lab.tests
                  ? lab.tests.map((t) => ({ name: t.name, qty: 1, price: t.price || 0 }))
                  : [{ name: lab.testName || 'Lab Test', qty: 1, price: Number(lab.paidAmount || 0) }],
              });
            });
          }
        } catch (e) {}
      }

      // ── 5. VIDEO CONSULTATIONS ─────────────────────────────────────
      const vidJson = await AsyncStorage.getItem('@videoBookings');
      const vidOnlineJson = await AsyncStorage.getItem('@mediunify_patient_online_consultations');
      const allVidRaw = [
        ...(vidJson ? JSON.parse(vidJson) : []),
        ...(vidOnlineJson ? JSON.parse(vidOnlineJson) : []),
      ];
      allVidRaw.forEach((vid) => {
        const refId = vid.id || '';
        if (!refId) return;
        const isRefund = (vid.paymentStatus || '').toLowerCase().includes('refund') || (vid.status || '').toLowerCase() === 'cancelled';
        dynamicList.push({
          id:          `TXN-${refId.replace(/\D/g, '') || Date.now()}`,
          refId,
          service:     'Video Consultation',
          serviceType: 'consultation',
          title:       vid.doctor?.name || vid.doctorName || 'Video Consultation',
          facility:    vid.doctor?.clinicName || vid.facilityName || 'MediUnify TeleHealth',
          date:        `${vid.date || 'Recent'}${vid.time ? ', ' + vid.time : ''}`,
          rawDate:     vid.rawDate || (vid.date ? new Date(vid.date).toISOString() : null),
          amount:      Number(vid.paidAmount || vid.totalAmount || vid.fee || 0),
          mrp:         Number(vid.mrpAmount || vid.paidAmount || vid.fee || 0),
          status:      isRefund ? 'Refunded' : 'Paid',
          paymentMode: vid.paymentMethod || vid.paymentStatus || 'Online UPI',
          gstin:       '29AABCU9603R1ZX',
          items:       [{ name: 'Video Consultation', qty: 1, price: Number(vid.paidAmount || vid.fee || 0) }],
        });
      });

      // ── 6. IN-PERSON CLINIC APPOINTMENTS ───────────────────────────
      const apptJson = await AsyncStorage.getItem('@unnathi_appointments');
      const apptPhysJson = await AsyncStorage.getItem('@mediunify_patient_physical_appointments');
      const allApptRaw = [
        ...(apptJson ? JSON.parse(apptJson) : []),
        ...(apptPhysJson ? JSON.parse(apptPhysJson) : []),
      ];
      allApptRaw.forEach((appt) => {
        const refId = appt.id || '';
        if (!refId) return;
        const isRefund = (appt.paymentStatus || '').toLowerCase().includes('refund') || (appt.status || '').toLowerCase() === 'cancelled';
        dynamicList.push({
          id:          `TXN-${refId.replace(/\D/g, '') || Date.now()}`,
          refId,
          service:     appt.type || appt.serviceType || 'Doctor Visit',
          serviceType: 'consultation',
          title:       appt.doctor?.name || appt.doctorName || 'Doctor Visit',
          facility:    appt.doctor?.clinicName || appt.facilityName || 'Specialty Clinic',
          date:        `${appt.date || 'Recent'}${appt.time ? ', ' + appt.time : ''}`,
          rawDate:     appt.rawDate || (appt.date ? new Date(appt.date).toISOString() : null),
          amount:      Number(appt.paidAmount || appt.totalAmount || appt.amount || appt.fee || 0),
          mrp:         Number(appt.mrpAmount || appt.paidAmount || appt.fee || 0),
          status:      isRefund ? 'Refunded' : (appt.paymentStatus === 'Pay at Clinic Reception' ? 'Pending' : 'Paid'),
          paymentMode: appt.paymentMethod || appt.paymentStatus || 'Online UPI',
          gstin:       '29AABCU9603R1ZX',
          items:       [{ name: appt.type || 'Consultation', qty: 1, price: Number(appt.paidAmount || appt.fee || 0) }],
        });
      });

      // ── 7. PHARMACY ORDERS ─────────────────────────────────────────
      const pharmJson = await AsyncStorage.getItem('@unnathi_pharmacy_orders');
      const medOrdersJson = await AsyncStorage.getItem('@mediunify_patient_medicine_orders');
      const ordersJson = await AsyncStorage.getItem('@orders');
      const allPharmRaw = [
        ...(pharmJson ? JSON.parse(pharmJson) : []),
        ...(medOrdersJson ? JSON.parse(medOrdersJson) : []),
        ...(ordersJson ? JSON.parse(ordersJson) : []),
      ];
      allPharmRaw.forEach((ord) => {
        const refId = ord.id || ord.orderId || '';
        if (!refId) return;
        const isRefund = (ord.paymentStatus || ord.status || '').toLowerCase().includes('refund');
        dynamicList.push({
          id:          `TXN-${refId.replace(/\D/g, '') || Date.now()}`,
          refId,
          service:     'Pharmacy',
          serviceType: 'pharmacy',
          title:       'Medicine Order',
          facility:    ord.pharmacyName || 'MediUnify Pharmacy',
          date:        ord.date || ord.orderDate || 'Recent',
          rawDate:     ord.createdAt || ord.orderDate ? new Date(ord.createdAt || ord.orderDate).toISOString() : null,
          amount:      Number(ord.total || ord.totalAmount || 0),
          mrp:         Number(ord.subtotal || ord.total || 0),
          status:      isRefund ? 'Refunded' : (ord.paymentMethod === 'COD' ? 'Pending' : 'Paid'),
          paymentMode: ord.paymentMethod || 'Online',
          gstin:       '29AABCU9603R1ZX',
          items:       (ord.items || []).map((i) => ({ name: i.name, qty: i.quantity || 1, price: i.price || 0 })),
        });
      });

      // ── 8. NURSING & HOME CARE ─────────────────────────────────────
      const nurseJson = await AsyncStorage.getItem('@unnathi_nurse_bookings');
      if (nurseJson) {
        try {
          const parsed = JSON.parse(nurseJson);
          if (Array.isArray(parsed)) {
            parsed.forEach((n) => {
              const refId = n.id || '';
              if (!refId) return;
              const isRefund = (n.paymentStatus || '').toLowerCase().includes('refund');
              dynamicList.push({
                id:          `TXN-${refId.replace(/\D/g, '') || Date.now()}`,
                refId,
                service:     'Home Nursing',
                serviceType: 'nursing',
                title:       n.serviceName || n.assignedNurse?.name || 'Home Nursing',
                facility:    n.facility || 'MediUnify Home Care',
                date:        `${n.date || 'Recent'}${n.time ? ', ' + n.time : ''}`,
                rawDate:     n.date ? new Date(n.date).toISOString() : null,
                amount:      Number(n.paidAmount || n.totalAmount || n.fee || 0),
                mrp:         Number(n.mrpAmount || n.paidAmount || 0),
                status:      isRefund ? 'Refunded' : 'Paid',
                paymentMode: n.paymentMethod || 'Online UPI',
                gstin:       '29AABCU9603R1ZX',
                items:       [{ name: n.serviceName || 'Home Nursing', qty: 1, price: Number(n.paidAmount || 0) }],
              });
            });
          }
        } catch (e) {}
      }

      // ── COMBINE DYNAMIC + DEFAULTS ─────────────────────────────────
      // Dynamic real transactions come first so they take top priority
      const allCandidates = [...dynamicList, ...DEFAULT_TRANSACTIONS];

      // Robust deduplication by both id and refId
      const seenKeys = new Set();
      const unifiedList = [];

      allCandidates.forEach((item) => {
        if (!item) return;
        const idKey = item.id ? String(item.id).trim() : null;
        const refKey = item.refId ? String(item.refId).trim() : null;

        if (idKey && seenKeys.has(idKey)) return;
        if (refKey && seenKeys.has(refKey)) return;

        if (idKey) seenKeys.add(idKey);
        if (refKey) seenKeys.add(refKey);

        unifiedList.push(item);
      });

      // Safe sorting newest-first using timestamps
      const sorted = unifiedList.sort((a, b) => {
        const getT = (item) => {
          if (item.rawDate) {
            const t = new Date(item.rawDate).getTime();
            if (!isNaN(t)) return t;
          }
          if (item._savedAt) {
            const t = new Date(item._savedAt).getTime();
            if (!isNaN(t)) return t;
          }
          return 0;
        };
        return getT(b) - getT(a);
      });

      setTransactions(sorted);
    } catch (e) {
      console.log('Error loading transactions:', e);
      setTransactions(DEFAULT_TRANSACTIONS);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (txn.id || '').toLowerCase().includes(q) ||
        (txn.title || '').toLowerCase().includes(q) ||
        (txn.service || '').toLowerCase().includes(q) ||
        (txn.facility || '').toLowerCase().includes(q);

      let matchesTab = false;
      if (selectedTab === 'all') {
        matchesTab = true;
      } else if (selectedTab === 'refund') {
        const s = (txn.status || '').toLowerCase();
        matchesTab =
          s === 'refunded' ||
          s.includes('refund') ||
          txn.serviceType === 'refund' ||
          txn.isRefund === true;
      } else {
        matchesTab = txn.serviceType === selectedTab;
      }

      return matchesSearch && matchesTab;
    });
  }, [transactions, search, selectedTab]);

  const sections = useMemo(() => groupTransactions(filteredTransactions), [filteredTransactions]);

  const totalSpent = useMemo(
    () => filteredTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [filteredTransactions]
  );

  const handleShare = async (txn) => {
    try {
      await Share.share({
        message: `MediUnify Payment Receipt\nService: ${txn.service}\n${txn.title}\nAmount: ₹${txn.amount}\nStatus: ${txn.status}\nDate: ${txn.date}\nTxn ID: ${txn.id}`,
      });
    } catch {}
  };

  // ─────────────────────────────────────────────
  // CARD
  // ─────────────────────────────────────────────
  const renderCard = (item, isTabletCol = false) => {
    const isRefund = (item.status || '').toLowerCase().includes('refund') || item.serviceType === 'refund';
    const svc    = getServiceConfig(isRefund ? 'refund' : item.serviceType);
    const status = getStatusConfig(item.status, t);
    return (
      <TouchableOpacity
        key={item.id}
        style={[S.card, isTabletCol && S.cardTablet]}
        onPress={() => setSelectedTxn(item)}
        activeOpacity={0.82}
      >
        {/* Icon */}
        <View style={[S.cardIcon, { backgroundColor: svc.bg }]}>
          <Ionicons name={svc.icon} size={20} color={svc.color} />
        </View>

        {/* Middle */}
        <View style={S.cardMid}>
          <Text style={S.cardService} numberOfLines={1}>{t(item.service)}</Text>
          <Text style={S.cardTitle}   numberOfLines={1}>{item.title}</Text>
          <Text style={S.cardDate}    numberOfLines={1}>{item.date}</Text>
        </View>

        {/* Right */}
        <View style={S.cardRight}>
          <Text style={[S.cardAmount, isRefund && S.cardAmountRefund]}>
            {isRefund ? `+ ₹${item.amount.toLocaleString('en-IN')}` : `₹${item.amount.toLocaleString('en-IN')}`}
          </Text>
          <View style={[S.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[S.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    if (isTablet) return null;
    return renderCard(item, false);
  };

  const renderSectionHeader = ({ section }) => (
    <View style={S.sectionHeader}>
      <Text style={S.sectionLabel}>{t(section.title)}</Text>
    </View>
  );

  // ─────────────────────────────────────────────
  // MAIN
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={S.safe}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {/* ── HEADER ── */}
      <View style={S.header}>
        <View style={S.webHeaderInner}>
          <TouchableOpacity style={S.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>{t('Payment History')}</Text>
          <TouchableOpacity style={S.headerBtn} onPress={loadTransactionsFromStorage} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={20} color={isDarkMode ? theme.textSecondary : "#64748B"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SUMMARY STRIP ── */}
      <View style={[S.summary, selectedTab === 'refund' && S.summaryRefund]}>
        <View style={S.summaryInner}>
          <View>
            <Text style={S.summaryLabel}>
              {selectedTab === 'refund' ? t('Total Refunded') : t('Total Spent')}
            </Text>
            <Text style={S.summaryAmount}>₹{totalSpent.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={S.summaryCount}>
            {filteredTransactions.length} {selectedTab === 'refund' ? t('refunds') : t('payments')}
          </Text>
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={S.searchWrap}>
        <View style={S.searchBox}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={S.searchInput}
            placeholder={t('Search transactions, doctors, medicines...')}
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── FILTER PILLS (With Refund filter) ── */}
      <View style={S.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.filterScroll}
          keyboardShouldPersistTaps="handled"
        >
          {FILTER_TABS.map((tab) => {
            const active = selectedTab === tab.id;
            const isRefundTab = tab.id === 'refund';
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  S.pill,
                  active && S.pillActive,
                  active && isRefundTab && S.pillRefundActive,
                ]}
                onPress={() => setSelectedTab(tab.id)}
                activeOpacity={0.8}
              >
                {isRefundTab && (
                  <Ionicons
                    name="arrow-undo"
                    size={12}
                    color={active ? '#FFFFFF' : '#7C3AED'}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    S.pillText,
                    active && S.pillTextActive,
                    !active && isRefundTab && S.pillTextRefund,
                  ]}
                >
                  {t(tab.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── LIST ── */}
      {isTablet ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[S.listContent, S.listContentTablet]}>
          <View style={Platform.OS === 'web' ? S.webInnerContainer : null}>
            {sections.length === 0
              ? <EmptyState onExplore={() => navigation.goBack()} isRefund={selectedTab === 'refund'} t={t} />
              : sections.map((sec) => (
                  <View key={sec.title}>
                    {renderSectionHeader({ section: sec })}
                    <View style={S.tabletGrid}>
                      {sec.data.map((item) => renderCard(item, true))}
                    </View>
                  </View>
                ))
            }
          </View>
          {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={S.listContent}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<EmptyState onExplore={() => navigation.goBack()} isRefund={selectedTab === 'refund'} t={t} />}
          ListFooterComponent={Platform.OS === 'web' ? <WebFooter navigation={navigation} /> : null}
        />
      )}

      {/* ── RECEIPT / INVOICE BOTTOM SHEET ── */}
      <Modal
        visible={!!selectedTxn}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <View style={S.overlay}>
          <TouchableOpacity style={S.overlayTap} activeOpacity={1} onPress={() => setSelectedTxn(null)} />
          <View style={[S.sheet, isTablet && S.sheetTablet]}>
            {/* Handle */}
            <View style={S.handle} />

            {selectedTxn && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header row */}
                <View style={S.detailHead}>
                  <View style={[S.detailIcon, { backgroundColor: getServiceConfig(selectedTxn.status?.toLowerCase().includes('refund') ? 'refund' : selectedTxn.serviceType).bg }]}>
                    <Ionicons
                      name={getServiceConfig(selectedTxn.status?.toLowerCase().includes('refund') ? 'refund' : selectedTxn.serviceType).icon}
                      size={22}
                      color={getServiceConfig(selectedTxn.status?.toLowerCase().includes('refund') ? 'refund' : selectedTxn.serviceType).color}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={S.detailService} numberOfLines={1}>{t(selectedTxn.service)}</Text>
                    <Text style={S.detailTitle}   numberOfLines={1}>{selectedTxn.title}</Text>
                  </View>
                  <TouchableOpacity style={S.closeBtn} onPress={() => setSelectedTxn(null)}>
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Amount + Status */}
                <View style={S.amountRow}>
                  <Text style={[S.amountBig, selectedTxn.status?.toLowerCase().includes('refund') && S.cardAmountRefund]}>
                    {selectedTxn.status?.toLowerCase().includes('refund') ? `+ ₹${selectedTxn.amount.toLocaleString('en-IN')}` : `₹${selectedTxn.amount.toLocaleString('en-IN')}`}
                  </Text>
                  <View style={[S.statusBadge, { backgroundColor: getStatusConfig(selectedTxn.status, t).bg, paddingHorizontal: 10, paddingVertical: 4 }]}>
                    <Text style={[S.statusText, { color: getStatusConfig(selectedTxn.status, t).color, fontSize: 13, fontWeight: '800' }]}>
                      {getStatusConfig(selectedTxn.status, t).label}
                    </Text>
                  </View>
                </View>

                {/* Info rows */}
                <View style={S.infoBox}>
                  <InfoRow label={t('Date')}           value={selectedTxn.date} />
                  <InfoRow label={t('Transaction ID')} value={selectedTxn.id} mono />
                  <InfoRow label={t('Payment Mode')}   value={selectedTxn.paymentMode} />
                  <InfoRow label={t('Facility')}       value={selectedTxn.facility} />
                  {selectedTxn.mrp > selectedTxn.amount && !selectedTxn.status?.toLowerCase().includes('refund') && (
                    <InfoRow label={t('You saved')} value={`₹${(selectedTxn.mrp - selectedTxn.amount).toLocaleString('en-IN')}`} green />
                  )}
                </View>

                {/* Items */}
                {selectedTxn.items?.length > 0 && (
                  <View style={S.itemsBox}>
                    <Text style={S.itemsTitle}>{t('Itemized Details')}</Text>
                    {selectedTxn.items.map((it, i) => (
                      <View key={i} style={S.itemRow}>
                        <Text style={S.itemName} numberOfLines={2}>{it.name}</Text>
                        <Text style={S.itemPrice}>{it.price === 0 ? t('Free') : `₹${it.price}`}</Text>
                      </View>
                    ))}
                    <View style={S.divider} />
                    <View style={S.itemRow}>
                      <Text style={[S.itemName, { fontWeight: '800', color: '#0F172A' }]}>
                        {selectedTxn.status?.toLowerCase().includes('refund') ? t('Total Refund') : t('Total Paid')}
                      </Text>
                      <Text style={[S.itemPrice, { color: selectedTxn.status?.toLowerCase().includes('refund') ? '#7C3AED' : '#059669', fontSize: 14 }]}>
                        ₹{selectedTxn.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View style={S.actions}>
                  <TouchableOpacity style={S.shareBtn} onPress={() => handleShare(selectedTxn)} activeOpacity={0.85}>
                    <Ionicons name="share-social-outline" size={15} color="#0F766E" />
                    <Text style={S.shareBtnText}>{t('Share')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={S.dlBtn}
                    onPress={() => {
                      setSelectedTxn(null);
                      showAlert('Downloaded', `Receipt for ${selectedTxn.id} saved.`);
                    }}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                    <Text style={S.dlBtnText}>{t('Download PDF')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────
const InfoRow = ({ label, value, mono, green }) => (
  <View style={S.infoRow}>
    <Text style={S.infoLabel}>{label}</Text>
    <Text
      style={[S.infoValue, mono && S.infoMono, green && { color: '#059669' }]}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────
const EmptyState = ({ onExplore, isRefund, t = (k) => k }) => (
  <View style={S.empty}>
    <Ionicons name={isRefund ? 'arrow-undo-outline' : 'receipt-outline'} size={46} color="#CBD5E1" />
    <Text style={S.emptyTitle}>
      {isRefund ? t('No refund records found') : t('No transactions yet')}
    </Text>
    <TouchableOpacity style={S.exploreBtn} onPress={onExplore} activeOpacity={0.85}>
      <Text style={S.exploreBtnText}>{t('Explore Healthcare Services')}</Text>
    </TouchableOpacity>
  </View>
);

export default TransactionHistoryScreen;

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  // HEADER
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderInner: {
    maxWidth: 1080,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 10,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, marginLeft: 12, fontSize: 17, fontWeight: '800', color: '#0F172A' },

  // SUMMARY
  summary: {
    backgroundColor: '#0F766E',
    width: '100%',
    paddingVertical: 14,
  },
  summaryInner: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  summaryRefund: {
    backgroundColor: '#6D28D9',
  },
  summaryLabel:  { fontSize: 11, color: '#A7F3D0', fontWeight: '600', marginBottom: 2 },
  summaryAmount: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  summaryCount:  { fontSize: 12, color: '#A7F3D0', fontWeight: '600' },

  // SEARCH
  searchWrap: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1, borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },

  // FILTER PILLS
  filterRow: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    height: 46,
    paddingTop: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingRight: 16,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  pillActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  pillRefundActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  pillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pillTextActive: { color: '#FFFFFF' },
  pillTextRefund: { color: '#7C3AED' },

  // LIST
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: Platform.OS === 'web' ? 0 : (Platform.OS === 'ios' ? 145 : 130) },
  listContentTablet: { paddingHorizontal: 0, paddingBottom: Platform.OS === 'web' ? 0 : 145 },
  webInnerContainer: { maxWidth: 1080, width: '100%', alignSelf: 'center', paddingHorizontal: 16 },

  // SECTION HEADER
  sectionHeader: { paddingTop: 14, paddingBottom: 6 },
  sectionLabel:  { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6 },

  // TABLET GRID
  tabletGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // CARD
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTablet:  { width: Platform.OS === 'web' ? 'calc(50% - 6px)' : '48.5%', marginBottom: 12 },
  cardIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardMid:     { flex: 1, paddingHorizontal: 10 },
  cardService: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 1 },
  cardTitle:   { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  cardDate:    { fontSize: 11, color: '#94A3B8' },
  cardRight:   { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  cardAmount:  { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  cardAmountRefund: { color: '#7C3AED' },

  // STATUS BADGE
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  statusText:  { fontSize: 10.5, fontWeight: '800' },

  // EMPTY
  empty:        { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyTitle:   { fontSize: 15, fontWeight: '800', color: '#94A3B8', marginTop: 12, marginBottom: 20 },
  exploreBtn:   { backgroundColor: '#0F766E', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12 },
  exploreBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // MODAL OVERLAY
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  overlayTap: { ...StyleSheet.absoluteFillObject },

  // BOTTOM SHEET
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    maxHeight: '88%',
  },
  sheetTablet: { maxWidth: 540, alignSelf: 'center', borderRadius: 24, marginBottom: 40, width: '100%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },

  // DETAIL HEAD
  detailHead:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailService: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  detailTitle:   { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  closeBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

  // AMOUNT ROW
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  amountBig: { fontSize: 26, fontWeight: '900', color: '#0F172A' },

  // INFO BOX
  infoBox:   { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 16, gap: 10 },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  infoLabel: { fontSize: 12.5, color: '#64748B', fontWeight: '500', flexShrink: 0 },
  infoValue: { fontSize: 12.5, color: '#0F172A', fontWeight: '700', textAlign: 'right', flex: 1 },
  infoMono:  { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11.5 },

  // ITEMS
  itemsBox:   { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 20 },
  itemsTitle: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  itemRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName:   { fontSize: 13, color: '#334155', flex: 1, paddingRight: 8 },
  itemPrice:  { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  divider:    { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },

  // ACTIONS
  actions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  shareBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: '#0F766E' },
  shareBtnText: { color: '#0F766E', fontSize: 14, fontWeight: '700' },
  dlBtn:        { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, backgroundColor: '#0F766E' },
  dlBtnText:    { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
