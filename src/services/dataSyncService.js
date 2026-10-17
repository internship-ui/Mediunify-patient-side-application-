/**
 * dataSyncService.js
 *
 * MediUnify Patient Data Synchronization Service
 * 
 * Note: Legacy mock server (syncServer.js / database.json) has been decoupled.
 * This service operates reliably on local storage (AsyncStorage) with zero network
 * timeouts, ready to be wired up to your upcoming Node.js + MongoDB/PostgreSQL backend.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveTransaction } from './transactionService';

// Target backend URL configuration (to be configured when the new Node.js backend is active)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || null;

/**
 * Returns the configured backend URL if available
 */
export const getBackendUrl = () => API_BASE_URL;

export const getCandidateUrls = () => {
  return API_BASE_URL ? [API_BASE_URL] : [];
};

/**
 * Pre-seeded accounts for instant local authentication
 */
const PRE_SEEDED_CREDENTIALS = {
  'user@mediunify.com': {
    password: 'password123',
    userData: {
      id: 'PAT-1002',
      name: 'Demo Patient',
      email: 'user@mediunify.com',
      phone: '+91 98765 43210',
      gender: 'Male',
      bloodGroup: 'O+ Positive',
      age: '29 Yrs',
      city: 'Mysore',
      walletBalance: 1250,
      walletTransactions: [
        { id: 'TXN-001', title: 'Welcome Bonus', type: 'credit', amount: 1000, date: '2026-10-01', status: 'Success' },
        { id: 'TXN-002', title: 'Cashback', type: 'credit', amount: 250, date: '2026-10-05', status: 'Success' },
      ],
      familyMembers: [
        { id: 'self', name: 'Demo Patient (Self)', displayName: 'Demo', relation: 'Self', age: '29 Yrs', gender: 'Male', bloodGroup: 'O+', allergies: 'None', conditions: 'None', icon: 'person', themeColor: '#00B894', bgLight: '#E6F8F4', isPrimary: true },
      ],
    },
  },
  '9876543210': {
    password: 'password123',
    userData: {
      id: 'PAT-1002',
      name: 'Demo Patient',
      email: 'user@mediunify.com',
      phone: '+91 98765 43210',
      gender: 'Male',
      bloodGroup: 'O+ Positive',
      age: '29 Yrs',
      city: 'Mysore',
      walletBalance: 1250,
      walletTransactions: [
        { id: 'TXN-001', title: 'Welcome Bonus', type: 'credit', amount: 1000, date: '2026-10-01', status: 'Success' },
        { id: 'TXN-002', title: 'Cashback', type: 'credit', amount: 250, date: '2026-10-05', status: 'Success' },
      ],
      familyMembers: [
        { id: 'self', name: 'Demo Patient (Self)', displayName: 'Demo', relation: 'Self', age: '29 Yrs', gender: 'Male', bloodGroup: 'O+', allergies: 'None', conditions: 'None', icon: 'person', themeColor: '#00B894', bgLight: '#E6F8F4', isPrimary: true },
      ],
    },
  },
  'admin@unnathi.com': {
    password: 'password123',
    userData: {
      id: 'PAT-1001',
      name: 'Dr. Unnathi Admin',
      email: 'admin@unnathi.com',
      phone: '+91 98450 12345',
      gender: 'Female',
      bloodGroup: 'A+ Positive',
      age: '34 Yrs',
      city: 'Mysore',
      walletBalance: 2500,
    },
  },
  '9845012345': {
    password: 'password123',
    userData: {
      id: 'PAT-1001',
      name: 'Dr. Unnathi Admin',
      email: 'admin@unnathi.com',
      phone: '+91 98450 12345',
      gender: 'Female',
      bloodGroup: 'A+ Positive',
      age: '34 Yrs',
      city: 'Mysore',
      walletBalance: 2500,
    },
  },
};

/**
 * Synchronize full user object to local AsyncStorage
 */
export const saveUserToLocalStorage = async (user) => {
  if (!user) return;

  try {
    const primaryData = {
      id: user.id || `PAT-${Date.now().toString().slice(-4)}`,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      age: user.age,
      bloodGroup: user.bloodGroup,
      dob: user.dob,
      emergencyContact: user.emergencyContact,
      address: user.address,
    };

    // 1. Primary profile keys
    await AsyncStorage.setItem('@unnathi_primary_user', JSON.stringify(primaryData));
    await AsyncStorage.setItem('user', JSON.stringify(primaryData));
    if (user.name) await AsyncStorage.setItem('userName', user.name);
    if (user.email) await AsyncStorage.setItem('userEmail', user.email);
    if (user.phone) {
      await AsyncStorage.setItem('userPhone', user.phone);
      await AsyncStorage.setItem('@unnathi_user_phone', user.phone);
    }
    if (user.id) await AsyncStorage.setItem('userId', user.id);

    // 2. Wallet
    if (user.walletBalance !== undefined) {
      await AsyncStorage.setItem('@unnathi_wallet_balance', String(user.walletBalance));
    }
    if (user.walletTransactions) {
      await AsyncStorage.setItem('@unnathi_wallet_transactions', JSON.stringify(user.walletTransactions));
    }

    // 3. Appointments & Bookings
    if (user.appointments && Array.isArray(user.appointments)) {
      let localAppts = [];
      try {
        const localApptStr = await AsyncStorage.getItem('@unnathi_appointments');
        if (localApptStr) localAppts = JSON.parse(localApptStr);
      } catch (e) {}

      const apptMap = new Map();
      user.appointments.forEach((a) => {
        if (a && a.id) apptMap.set(a.id, a);
      });
      localAppts.forEach((a) => {
        if (a && a.id && !apptMap.has(a.id)) {
          apptMap.set(a.id, a);
        }
      });
      const consolidatedAppts = Array.from(apptMap.values());

      // Video Consultations
      const vidAppts = consolidatedAppts.filter(
        (a) =>
          a.serviceType === 'video' ||
          a.type === 'Video Consultation' ||
          a.type === 'Video' ||
          a.type === 'TeleConsultation' ||
          Boolean(a.videoRoomLink) ||
          (typeof a.type === 'string' && a.type.toLowerCase().includes('video'))
      );
      if (vidAppts.length > 0) {
        await AsyncStorage.setItem('@videoBookings', JSON.stringify(vidAppts));
        await AsyncStorage.setItem('@mediunify_patient_online_consultations', JSON.stringify(vidAppts));
      }

      // Physical Clinic Appointments
      const physAppts = consolidatedAppts.filter(
        (a) =>
          !(
            a.serviceType === 'video' ||
            a.type === 'Video Consultation' ||
            a.type === 'Video' ||
            a.type === 'TeleConsultation' ||
            Boolean(a.videoRoomLink) ||
            (typeof a.type === 'string' && a.type.toLowerCase().includes('video'))
          )
      );
      await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify(physAppts));
      await AsyncStorage.setItem('@mediunify_patient_physical_appointments', JSON.stringify(physAppts));

      // Lab Tests
      const labAppts = consolidatedAppts.filter(
        (a) =>
          a.serviceType === 'lab' ||
          a.type === 'Lab Test' ||
          a.type === 'Diagnostic Lab Test' ||
          a.type === 'Lab' ||
          (Array.isArray(a.tests) && a.tests.length > 0 && a.type !== 'Radiology')
      );
      if (labAppts.length > 0) {
        await AsyncStorage.setItem('@labBookings', JSON.stringify(labAppts));
      }

      // Radiology Scans
      const radAppts = consolidatedAppts.filter(
        (a) =>
          a.serviceType === 'radiology' ||
          a.type === 'Radiology' ||
          a.type === 'Radiology Scan' ||
          a.bookingType === 'Radiology'
      );
      if (radAppts.length > 0) {
        await AsyncStorage.setItem('@radiologyBookings', JSON.stringify(radAppts));
      }

      // Home Nurse Care
      const nurseAppts = consolidatedAppts.filter(
        (a) =>
          a.serviceType === 'nurse' ||
          a.type === 'Home Nurse Care' ||
          a.type === 'Nurse' ||
          a.assignedNurse !== undefined ||
          (typeof a.serviceName === 'string' && a.serviceName.includes('Staff'))
      );
      if (nurseAppts.length > 0) {
        await AsyncStorage.setItem('@unnathi_nurse_bookings', JSON.stringify(nurseAppts));
      }
    }

    // 4. Family Members
    if (user.familyMembers && Array.isArray(user.familyMembers)) {
      await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify(user.familyMembers));
      const effectiveName = user.name || 'User';
      const userKey = (user.email || user.phone || effectiveName).toLowerCase().replace(/[^a-z0-9]/g, '_');
      await AsyncStorage.setItem(`@unnathi_family_members_${userKey}`, JSON.stringify(user.familyMembers));
    }

    // 5. Orders & Prescriptions
    if (user.orders && Array.isArray(user.orders)) {
      await AsyncStorage.setItem('@orders', JSON.stringify(user.orders));
      await AsyncStorage.setItem('@unnathi_pharmacy_orders', JSON.stringify(user.orders));
    }
    if (user.prescriptions && Array.isArray(user.prescriptions)) {
      await AsyncStorage.setItem('@unnathi_prescriptions', JSON.stringify(user.prescriptions));
    }

    // 6. Save credentials locally
    if (user.phone || user.email) {
      const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
      let registeredCreds = {};
      try {
        if (regCredsStr) registeredCreds = JSON.parse(regCredsStr);
      } catch (e) {}

      const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const emailKey = (user.email || '').toLowerCase().trim();

      const credObj = {
        password: user.password || 'password123',
        userData: primaryData,
      };

      if (cleanPhone.length === 10) registeredCreds[cleanPhone] = credObj;
      if (emailKey) registeredCreds[emailKey] = credObj;

      await AsyncStorage.setItem('@unnathi_registered_credentials', JSON.stringify(registeredCreds));
    }
  } catch (err) {
    console.warn('[DataSync] Error saving user to AsyncStorage:', err);
  }
};

/**
 * Authenticates against local credential stores
 */
export const syncLogin = async (identifier, password) => {
  try {
    const inputVal = (identifier || '').trim();
    const cleanPhone = inputVal.replace(/[^0-9]/g, '');
    const cleanPhone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    const lowerEmail = inputVal.toLowerCase();

    // Check registered credentials
    const regCredsStr = await AsyncStorage.getItem('@unnathi_registered_credentials');
    let registeredCreds = {};
    if (regCredsStr) {
      try {
        registeredCreds = JSON.parse(regCredsStr);
      } catch (e) {}
    }

    const allCreds = { ...PRE_SEEDED_CREDENTIALS, ...registeredCreds };
    const matchingCred = allCreds[lowerEmail] || (cleanPhone10.length === 10 ? allCreds[cleanPhone10] : null);

    if (matchingCred) {
      if (matchingCred.password && matchingCred.password !== password) {
        return { success: false, status: 401, message: 'Incorrect password' };
      }
      const user = matchingCred.userData || {
        name: lowerEmail.includes('@') ? lowerEmail.split('@')[0] : `Patient ${cleanPhone10.slice(-4)}`,
        email: lowerEmail.includes('@') ? lowerEmail : 'patient@mediunify.com',
        phone: cleanPhone10.length === 10 ? `+91 ${cleanPhone10}` : '+91 98765 43210',
      };
      await saveUserToLocalStorage(user);
      return { success: true, user, source: 'local' };
    }

    return { success: false, status: 404, message: 'Account not found. Please register.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Registers user into local storage
 */
export const syncRegister = async (userData, password) => {
  try {
    if (!userData) return { success: false, message: 'No user data provided' };

    await saveUserToLocalStorage({ ...userData, password });
    return { success: true, user: userData, source: 'local' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Pull latest user data from local storage
 */
export const pullUserData = async (userId) => {
  try {
    const userStr = await AsyncStorage.getItem('@unnathi_primary_user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Synchronize local user state across stores
 */
export const syncActiveUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem('@unnathi_primary_user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Add a new appointment to local storage with automated categorization
 */
export const pushAppointment = async (appointmentData) => {
  if (!appointmentData || !appointmentData.id) return { success: false, error: 'Invalid appointment' };

  try {
    const isVid =
      appointmentData.type === 'Video Consultation' ||
      appointmentData.type === 'Video' ||
      appointmentData.serviceType === 'video' ||
      Boolean(appointmentData.videoRoomLink);

    if (isVid) {
      const vStr = await AsyncStorage.getItem('@videoBookings');
      const vList = vStr ? JSON.parse(vStr).filter((a) => a.id !== appointmentData.id) : [];
      const updatedV = [appointmentData, ...vList];
      await AsyncStorage.setItem('@videoBookings', JSON.stringify(updatedV));
      await AsyncStorage.setItem('@mediunify_patient_online_consultations', JSON.stringify(updatedV));

      const existingStr = await AsyncStorage.getItem('@unnathi_appointments');
      if (existingStr) {
        const existing = JSON.parse(existingStr).filter((a) => a.id !== appointmentData.id);
        await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify(existing));
        await AsyncStorage.setItem('@mediunify_patient_physical_appointments', JSON.stringify(existing));
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('mediunify_consultations_updated', { detail: { consultation: appointmentData } }));
      }
    } else {
      const existingStr = await AsyncStorage.getItem('@unnathi_appointments');
      const existing = existingStr ? JSON.parse(existingStr).filter((a) => a.id !== appointmentData.id) : [];
      const updated = [appointmentData, ...existing];
      await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify(updated));
      await AsyncStorage.setItem('@mediunify_patient_physical_appointments', JSON.stringify(updated));

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('mediunify_appointments_updated', { detail: { appointment: appointmentData } }));
      }
    }

    const isLab =
      appointmentData.type === 'Diagnostic Lab Test' ||
      appointmentData.type === 'Lab Test' ||
      appointmentData.serviceType === 'lab' ||
      (Array.isArray(appointmentData.tests) && appointmentData.tests.length > 0 && appointmentData.type !== 'Radiology');
    if (isLab) {
      const lStr = await AsyncStorage.getItem('@labBookings');
      const lList = lStr ? JSON.parse(lStr).filter((a) => a.id !== appointmentData.id) : [];
      await AsyncStorage.setItem('@labBookings', JSON.stringify([appointmentData, ...lList]));
    }

    const isRad =
      appointmentData.type === 'Radiology' ||
      appointmentData.type === 'Radiology Scan' ||
      appointmentData.serviceType === 'radiology';
    if (isRad) {
      const rStr = await AsyncStorage.getItem('@radiologyBookings');
      const rList = rStr ? JSON.parse(rStr).filter((a) => a.id !== appointmentData.id) : [];
      await AsyncStorage.setItem('@radiologyBookings', JSON.stringify([appointmentData, ...rList]));
    }

    const isNurse =
      appointmentData.type === 'Home Nurse Care' ||
      appointmentData.serviceType === 'nurse' ||
      appointmentData.assignedNurse !== undefined;
    if (isNurse) {
      const nStr = await AsyncStorage.getItem('@unnathi_nurse_bookings');
      const nList = nStr ? JSON.parse(nStr).filter((a) => a.id !== appointmentData.id) : [];
      await AsyncStorage.setItem('@unnathi_nurse_bookings', JSON.stringify([appointmentData, ...nList]));
    }

    // Auto-save to payment history
    try {
      const appt = appointmentData;
      const isVidAppt = appt.type === 'Video Consultation' || appt.serviceType === 'video' || Boolean(appt.videoRoomLink);
      const isLabAppt = appt.type === 'Diagnostic Lab Test' || appt.type === 'Lab Test' || appt.serviceType === 'lab';
      const isRadAppt = appt.type === 'Radiology' || appt.type === 'Radiology Scan' || appt.serviceType === 'radiology';
      const isNurseAppt = appt.type === 'Home Nurse Care' || appt.serviceType === 'nurse';

      let svcType = 'consultation';
      let svcName = appt.type || 'Healthcare Service';
      let title = appt.doctor?.name || appt.doctorName || appt.type || 'Appointment';
      let facility = appt.doctor?.clinicName || appt.labCenter?.name || appt.labName || appt.facility || 'MediUnify';

      if (isLabAppt) { svcType = 'lab'; svcName = 'Lab Test'; title = appt.tests?.map((t) => t.name).join(', ') || 'Lab Tests'; }
      if (isRadAppt) { svcType = 'radiology'; svcName = 'Radiology Scan'; title = appt.tests?.map((t) => t.name).join(', ') || 'Radiology Scan'; facility = appt.labName || facility; }
      if (isNurseAppt) { svcType = 'nursing'; svcName = 'Home Nursing'; }
      if (isVidAppt) { svcType = 'consultation'; svcName = 'Video Consultation'; title = appt.doctor?.name || 'Video Consultation'; }

      const paidAmount = Number(appt.paidAmount || appt.totalAmount || appt.amount || 0);

      if (paidAmount > 0 || appt.paymentStatus === 'Paid' || appt.paymentMode === 'Paid') {
        await saveTransaction({
          id: `TXN-${appt.id}`,
          refId: appt.id,
          service: svcName,
          serviceType: svcType,
          title,
          facility,
          date: appt.date ? `${appt.date}${appt.time ? ', ' + appt.time : ''}` : undefined,
          rawDate: appt.date ? new Date(appt.date).toISOString() : new Date().toISOString(),
          amount: paidAmount,
          mrp: Number(appt.mrpAmount || appt.mrp || paidAmount),
          status: 'Paid',
          paymentMode: appt.paymentMethod || appt.paymentMode || appt.paymentStatus || 'Online',
          gstin: '29AABCU9603R1ZX',
          items: Array.isArray(appt.tests)
            ? appt.tests.map((t) => ({ name: t.name, qty: 1, price: t.price || 0 }))
            : [{ name: svcName, qty: 1, price: paidAmount }],
        });
      }
    } catch (_txErr) {
      // Non-blocking
    }

    return { success: true, localOnly: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

/**
 * Migration helper stub
 */
export const autoMigrateLocalAccountsToServer = async () => {
  return { success: true, migrated: 0 };
};

/**
 * Synchronize Family Members list in local storage
 */
export const syncSaveFamilyMembers = async (updatedMembers) => {
  try {
    if (!Array.isArray(updatedMembers)) return false;

    await AsyncStorage.setItem('@unnathi_family_members', JSON.stringify(updatedMembers));

    const userStr = await AsyncStorage.getItem('@unnathi_primary_user');
    let userKey = 'default';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const effectiveName = u.name || 'User';
        userKey = (u.email || u.phone || effectiveName).toLowerCase().replace(/[^a-z0-9]/g, '_');
      } catch (e) {}
    }
    await AsyncStorage.setItem(`@unnathi_family_members_${userKey}`, JSON.stringify(updatedMembers));
    return true;
  } catch (err) {
    console.warn('[DataSync] syncSaveFamilyMembers error:', err.message);
    return false;
  }
};

/**
 * Fetch latest Family Members from local storage
 */
export const syncFetchFamilyMembers = async () => {
  try {
    const stored = await AsyncStorage.getItem('@unnathi_family_members');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Delete a family member from local storage
 */
export const syncDeleteFamilyMember = async (memberId) => {
  try {
    const stored = await AsyncStorage.getItem('@unnathi_family_members');
    const list = stored ? JSON.parse(stored) : [];
    const updated = list.filter((m) => m.id !== memberId);
    await syncSaveFamilyMembers(updated);
    return updated;
  } catch {
    return null;
  }
};

export default {
  getBackendUrl,
  getCandidateUrls,
  syncLogin,
  syncRegister,
  pullUserData,
  syncActiveUser,
  pushAppointment,
  saveUserToLocalStorage,
  autoMigrateLocalAccountsToServer,
  syncSaveFamilyMembers,
  syncFetchFamilyMembers,
  syncDeleteFamilyMember,
};
