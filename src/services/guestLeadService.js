import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isGuestUser } from '../utils/authHelper';

const STORAGE_KEY_LEADS = '@mediunify_guest_leads';
const SESSION_KEY_SUBMITTED = '@mediunify_lead_session_submitted_v2';
const SESSION_KEY_DISMISSED = '@mediunify_lead_session_dismissed_v2';

// In-memory fallback flags for non-web environments or private browsing
let memorySubmittedInSession = false;
let memoryDismissedInSession = false;

// Clear any stale legacy dismissal keys from previous buggy runs
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
  try {
    window.sessionStorage.removeItem('@mediunify_lead_session_dismissed');
  } catch (e) {}
}

/**
 * Check if the guest has already submitted valid lead details during this session
 */
export const isLeadSubmittedInSession = () => {
  if (memorySubmittedInSession) return true;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return window.sessionStorage.getItem(SESSION_KEY_SUBMITTED) === 'true';
    } catch (e) {
      return memorySubmittedInSession;
    }
  }
  return memorySubmittedInSession;
};

/**
 * Check if the guest has already dismissed the popup during this session
 */
export const isLeadDismissedInSession = () => {
  if (memoryDismissedInSession) return true;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return window.sessionStorage.getItem(SESSION_KEY_DISMISSED) === 'true';
    } catch (e) {
      return memoryDismissedInSession;
    }
  }
  return memoryDismissedInSession;
};

/**
 * Mark lead as submitted for the current session
 */
export const markLeadSubmittedInSession = () => {
  memorySubmittedInSession = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SESSION_KEY_SUBMITTED, 'true');
    } catch (e) {}
  }
};

/**
 * Mark lead popup as dismissed for the current session (user clicked close icon)
 */
export const markLeadDismissedInSession = () => {
  memoryDismissedInSession = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SESSION_KEY_DISMISSED, 'true');
    } catch (e) {}
  }
};

export const clearLeadDismissedForTesting = () => {
  memoryDismissedInSession = false;
  memorySubmittedInSession = false;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(SESSION_KEY_DISMISSED);
      window.sessionStorage.removeItem(SESSION_KEY_SUBMITTED);
      window.sessionStorage.removeItem('@mediunify_lead_session_dismissed');
    } catch (e) {}
  }
};

// Expose reset on window for easy developer verification in browser console
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.__resetMediunifyLeadModal = clearLeadDismissedForTesting;
}

/**
 * Determine if the guest lead-generation popup should appear
 */
export const shouldShowGuestLeadPopup = async () => {
  try {
    const isGuest = await isGuestUser();
    if (!isGuest) {
      console.log('[GuestLead] User is registered/logged in. Suppressing popup.');
      return false;
    }

    // If guest already submitted details in this session, do not show
    if (isLeadSubmittedInSession()) {
      console.log('[GuestLead] Lead already submitted this session. Suppressing popup.');
      return false;
    }

    // If guest already dismissed popup in this session, do not show
    if (isLeadDismissedInSession()) {
      console.log('[GuestLead] Lead popup already dismissed this session. Suppressing popup.');
      return false;
    }

    console.log('[GuestLead] Eligible guest search detected. Showing lead generation popup.');
    return true;
  } catch (e) {
    console.warn('[GuestLead] Error checking eligibility:', e);
    return false;
  }
};

/**
 * Validate lead form inputs
 */
export const validateLeadInput = ({ name, phone }) => {
  const errors = {};

  // Name validation: required, non-empty, reasonable characters
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    errors.name = 'Please enter your name';
  } else if (trimmedName.length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
    errors.name = 'Please enter a valid name (letters only)';
  }

  // Phone validation: Indian mobile number exactly 10 digits
  const rawDigits = (phone || '').replace(/\D/g, '');
  // If user pasted with 91 prefix and 12 digits, extract last 10 digits
  const cleanDigits = rawDigits.length === 12 && rawDigits.startsWith('91')
    ? rawDigits.slice(2)
    : rawDigits;

  if (!cleanDigits) {
    errors.phone = 'Please enter your mobile number';
  } else if (cleanDigits.length !== 10) {
    errors.phone = 'Mobile number must be exactly 10 digits';
  } else if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
    errors.phone = 'Please enter a valid 10-digit Indian mobile number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    cleanDigits,
    trimmedName,
  };
};

/**
 * Save guest lead details safely to persistent storage
 * Structures data ready for future Node.js backend integration
 */
export const saveGuestLead = async ({ name, phone, query, city }) => {
  const validation = validateLeadInput({ name, phone });
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  try {
    const formattedPhone = `+91${validation.cleanDigits}`;
    const timestamp = new Date().toISOString();

    const newLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: validation.trimmedName,
      phone: formattedPhone,
      query: (query || '').trim(),
      city: (city || '').trim(),
      timestamp,
      consent: true,
    };

    // Retrieve existing leads to prevent duplicates
    let existingLeads = [];
    const stored = await AsyncStorage.getItem(STORAGE_KEY_LEADS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) existingLeads = parsed;
      } catch (e) {}
    }

    // Check if this lead was already saved in this session/hour
    const isDuplicate = existingLeads.some(
      (l) => l.phone === formattedPhone && l.query === newLead.query && (Date.now() - new Date(l.timestamp).getTime()) < 3600000
    );

    if (!isDuplicate) {
      existingLeads.unshift(newLead);
      // Keep up to 200 recent leads locally
      if (existingLeads.length > 200) {
        existingLeads = existingLeads.slice(0, 200);
      }
      await AsyncStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(existingLeads));
    }

    // Mark session as submitted & dismissed so popup never interrupts again this session
    markLeadSubmittedInSession();
    markLeadDismissedInSession();

    return {
      success: true,
      lead: newLead,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save details. Please try again.',
    };
  }
};

/**
 * Get all stored guest leads (for administrative review / mock backend export)
 */
export const getStoredGuestLeads = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_LEADS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};
