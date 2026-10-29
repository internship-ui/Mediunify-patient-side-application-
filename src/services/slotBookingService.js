import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const BOOKED_SLOTS_STORAGE_KEY = '@mediunify_booked_slots';
const TICK_INTERVAL_MS = 30000; // 30 seconds real-time tick

// In-memory cache for ultra-fast synchronous lookup
let bookedSlotsCache = new Map();
let isInitialized = false;
let initPromise = null;
const listeners = new Set();
let tickTimer = null;

// =============================================================================
// 1. DATE & TIME PARSING UTILITIES
// =============================================================================

/**
 * Extracts 24-hour time { hours, minutes } from various slot string representations
 * Handles: "09:00 AM", "6:30 AM – 7:30 AM", "07:00 AM - 08:00 AM (Fasting Ideal)", "Within 10-15 Mins"
 */
export const parseSlotTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  // Handle instant slot (valid if today during daytime)
  if (/instant|within\s+\d+/i.test(timeStr)) {
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes() };
  }

  // Extract start time from strings like "6:30 AM – 7:30 AM" or "09:30 AM"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
};

/**
 * Normalizes any date format (Date object, ISO string, "Today", "Tomorrow", "30 Sep", etc.)
 * to a Date object set to midnight (00:00:00) local time.
 */
export const parseDateToMidnight = (dateInput) => {
  if (!dateInput) return null;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0);
  }

  if (typeof dateInput === 'object') {
    if (dateInput.fullDate) {
      const parts = dateInput.fullDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
      }
    }
    if (dateInput.isoDate) {
      const parts = dateInput.isoDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
      }
    }
    if (dateInput.id === 'today' || dateInput.offset === 0) {
      return todayMidnight;
    }
    if (dateInput.id === 'tomorrow' || dateInput.offset === 1) {
      const tmrw = new Date(todayMidnight);
      tmrw.setDate(tmrw.getDate() + 1);
      return tmrw;
    }
    if (typeof dateInput.offset === 'number') {
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + dateInput.offset);
      return d;
    }
    if (dateInput.dateStr) {
      return parseDateToMidnight(dateInput.dateStr);
    }
    if (dateInput.date) {
      return parseDateToMidnight(dateInput.date);
    }
    if (dateInput.label) {
      return parseDateToMidnight(dateInput.label);
    }
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^today/i.test(trimmed)) {
      return todayMidnight;
    }
    if (/^tomorrow/i.test(trimmed)) {
      const tmrw = new Date(todayMidnight);
      tmrw.setDate(tmrw.getDate() + 1);
      return tmrw;
    }
    if (/in\s*(\d+)\s*days/i.test(trimmed)) {
      const match = trimmed.match(/in\s*(\d+)\s*days/i);
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + parseInt(match[1], 10));
      return d;
    }

    // Check ISO format YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 0, 0, 0, 0);
    }

    // Check DD Mon YYYY or DD Mon e.g. "30 Sep 2026" or "30 Sep"
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const parts = trimmed.match(/(\d{1,2})\s+([a-zA-Z]{3,4})(?:\s+(\d{4}))?/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const monthIdx = months.indexOf(parts[2].toLowerCase().slice(0, 3));
      const year = parts[3] ? parseInt(parts[3], 10) : now.getFullYear();
      if (monthIdx !== -1) {
        return new Date(year, monthIdx, day, 0, 0, 0, 0);
      }
    }

    // Try standard Date parsing
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      const pd = new Date(parsed);
      return new Date(pd.getFullYear(), pd.getMonth(), pd.getDate(), 0, 0, 0, 0);
    }
  }

  return todayMidnight;
};

/**
 * Checks if the target date is in the past (before today's calendar date)
 */
export const isDatePast = (dateInput) => {
  const target = parseDateToMidnight(dateInput);
  if (!target) return false;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return target.getTime() < todayMidnight.getTime();
};

/**
 * Checks if the target date is today's calendar date
 */
export const isDateToday = (dateInput) => {
  const target = parseDateToMidnight(dateInput);
  if (!target) return false;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return target.getTime() === todayMidnight.getTime();
};

/**
 * Formats a date to normalized YYYY-MM-DD string
 */
export const formatDateKey = (dateInput) => {
  const d = parseDateToMidnight(dateInput);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats time string to canonical key component (e.g. "09:30_am" or "02:45_pm")
 */
export const formatTimeKey = (timeStr) => {
  const parsed = parseSlotTime(timeStr);
  if (!parsed) return String(timeStr || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const hours12 = parsed.hours % 12 || 12;
  const modifier = parsed.hours >= 12 ? 'pm' : 'am';
  return `${String(hours12).padStart(2, '0')}_${String(parsed.minutes).padStart(2, '0')}_${modifier}`;
};

/**
 * Determines whether a time slot has already passed given the date and time
 */
export const isSlotPassed = (dateInput, timeStr, bufferMinutes = 0) => {
  // 1. If date is past, slot has passed
  if (isDatePast(dateInput)) {
    return true;
  }

  // 2. If date is in the future, slot has not passed
  if (!isDateToday(dateInput)) {
    return false;
  }

  // 3. Date is today: compare against current real time
  const time = parseSlotTime(timeStr);
  if (!time) return false;

  const now = new Date();
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();
  const slotTotalMins = time.hours * 60 + time.minutes;

  return slotTotalMins <= (currentTotalMins + bufferMinutes);
};

/**
 * Generates a canonical unique slot key for conflict detection
 */
export const generateSlotKey = (serviceType = 'general', providerId = 'default', dateInput, timeStr) => {
  const dateKey = formatDateKey(dateInput);
  const timeKey = formatTimeKey(timeStr);
  const cleanService = String(serviceType || 'general').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanProvider = String(providerId || 'any').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanService}_${cleanProvider}_${dateKey}_${timeKey}`;
};

// =============================================================================
// 2. REAL-TIME BOOKED SLOTS REGISTRY & STORAGE
// =============================================================================

/**
 * Broadcast update to all active React component subscribers
 */
const notifyListeners = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('[SlotBookingService] Listener error:', e);
    }
  });
};

/**
 * Start the singleton ticker that updates today's passed slots every 30 seconds
 */
const startRealtimeTicker = () => {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    notifyListeners();
  }, TICK_INTERVAL_MS);
};

/**
 * Initialize slot registry from AsyncStorage and existing appointments
 */
export const initSlotRegistry = async () => {
  if (isInitialized) return bookedSlotsCache;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Read existing booked slots registry
      const stored = await AsyncStorage.getItem(BOOKED_SLOTS_STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            if (item && item.slotKey) {
              bookedSlotsCache.set(item.slotKey, item);
            }
          });
        }
      }

      // 2. Also harvest slots from stored user appointments to prevent duplicate bookings
      const apptKeys = ['@unnathi_appointments', '@labBookings', '@radiologyBookings', '@videoBookings', '@unnathi_nurse_bookings'];
      for (const k of apptKeys) {
        try {
          const raw = await AsyncStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((apt) => {
                if (apt && apt.status !== 'CANCELLED' && apt.status !== 'Cancelled') {
                  const sType = apt.type || apt.serviceType || 'general';
                  const provId = apt.doctorId || apt.doctor?.id || apt.labId || apt.diagnosticCentre?.id || apt.centerId || 'any';
                  const d = apt.date || apt.appointmentDate || apt.bookingDate;
                  const t = apt.time || apt.timeSlot || apt.selectedTime;
                  if (d && t) {
                    const key = generateSlotKey(sType, provId, d, t);
                    if (!bookedSlotsCache.has(key)) {
                      bookedSlotsCache.set(key, {
                        slotKey: key,
                        serviceType: sType,
                        providerId: provId,
                        date: formatDateKey(d),
                        time: t,
                        bookingId: apt.id,
                        patientName: apt.patientName,
                        bookedAt: Date.now(),
                      });
                    }
                  }
                }
              });
            }
          }
        } catch (e) {}
      }

      // 3. Listen to window storage events on Web for cross-tab real-time sync
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('storage', (e) => {
          if (e.key === BOOKED_SLOTS_STORAGE_KEY && e.newValue) {
            try {
              const updated = JSON.parse(e.newValue);
              bookedSlotsCache.clear();
              updated.forEach((item) => bookedSlotsCache.set(item.slotKey, item));
              notifyListeners();
            } catch (err) {}
          }
        });
      }

      startRealtimeTicker();
      isInitialized = true;
    } catch (err) {
      console.warn('[SlotBookingService] Init error:', err);
    }
    return bookedSlotsCache;
  })();

  return initPromise;
};

// Pre-trigger initialization
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  initSlotRegistry();
}

/**
 * Persist current in-memory cache to AsyncStorage
 */
const persistBookedSlots = async () => {
  try {
    const list = Array.from(bookedSlotsCache.values());
    await AsyncStorage.setItem(BOOKED_SLOTS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[SlotBookingService] Persist error:', err);
  }
};

/**
 * Check if a slot is currently booked
 */
export const isSlotBooked = (serviceType, providerId, dateInput, timeStr) => {
  const key = generateSlotKey(serviceType, providerId, dateInput, timeStr);
  return bookedSlotsCache.has(key);
};

/**
 * Get comprehensive slot status: 'AVAILABLE' | 'PASSED' | 'BOOKED'
 */
export const getSlotStatus = ({ date, time, serviceType = 'general', providerId = 'default', slotId = null, bufferMinutes = 0 }) => {
  // 1. Check if date or time has passed
  if (isSlotPassed(date, time, bufferMinutes)) {
    return {
      status: 'PASSED',
      available: false,
      reason: 'Time has already passed',
      message: 'This slot is no longer available because the time has passed.',
    };
  }

  // 2. Check if already booked
  if (isSlotBooked(serviceType, providerId, date, time)) {
    return {
      status: 'BOOKED',
      available: false,
      reason: 'Slot already booked',
      message: 'This slot is already booked by another user.',
    };
  }

  return {
    status: 'AVAILABLE',
    available: true,
    reason: null,
    message: 'Slot is available for booking.',
  };
};

/**
 * ATOMIC VALIDATION & BOOKING
 * Re-checks availability immediately. If passed or booked, rejects with the required message.
 * If valid, records booking in registry, broadcasts update, and returns success.
 */
export const validateAndBookSlot = async ({
  date,
  time,
  serviceType = 'general',
  providerId = 'default',
  slotId = null,
  patientName = 'Self',
  bookingId = null,
  bufferMinutes = 0,
}) => {
  await initSlotRegistry();

  const slotStatus = getSlotStatus({
    date,
    time,
    serviceType,
    providerId,
    slotId,
    bufferMinutes,
  });

  if (!slotStatus.available) {
    return {
      success: false,
      status: slotStatus.status,
      message: 'This slot is no longer available. Please select another time.',
    };
  }

  // Atomically claim the slot
  const slotKey = generateSlotKey(serviceType, providerId, date, time);
  const entry = {
    slotKey,
    serviceType,
    providerId,
    date: formatDateKey(date),
    time,
    slotId,
    patientName,
    bookingId: bookingId || `BOOK-${Date.now()}`,
    bookedAt: Date.now(),
  };

  bookedSlotsCache.set(slotKey, entry);
  await persistBookedSlots();
  notifyListeners();

  return {
    success: true,
    slotKey,
    entry,
  };
};

/**
 * Frees a previously booked slot (e.g. on cancellation or reschedule)
 */
export const cancelBookedSlot = async ({ date, time, serviceType, providerId, slotKey = null }) => {
  await initSlotRegistry();
  const key = slotKey || generateSlotKey(serviceType, providerId, date, time);

  if (bookedSlotsCache.has(key)) {
    bookedSlotsCache.delete(key);
    await persistBookedSlots();
    notifyListeners();
    return true;
  }
  return false;
};

/**
 * Subscribes to real-time slot state changes (clock tick or slot booking)
 */
export const subscribeToSlotChanges = (callback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

// =============================================================================
// 3. REUSABLE REACT HOOK FOR REAL-TIME AVAILABILITY
// =============================================================================

/**
 * React hook that automatically keeps slots updated in real-time.
 * Continuously checks for passed time and newly booked slots.
 *
 * @param {string|Date|object} selectedDate - The currently selected date
 * @param {Array} rawSlots - The list of raw slots to validate
 * @param {object} options - { serviceType, providerId, filterOutUnavailable, bufferMinutes }
 */
export const useRealTimeSlotValidation = (selectedDate, rawSlots = [], options = {}) => {
  const {
    serviceType = 'general',
    providerId = 'default',
    filterOutUnavailable = false,
    bufferMinutes = 0,
  } = options;

  const [tick, setTick] = useState(0);

  // Subscribe to real-time slot updates and clock ticks
  useEffect(() => {
    const unsubscribe = subscribeToSlotChanges(() => {
      setTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Compute processed slots with real-time status
  const processedSlots = useMemo(() => {
    if (!Array.isArray(rawSlots)) return [];

    return rawSlots
      .map((slot) => {
        // Extract time label regardless of object structure or plain string
        const timeLabel = typeof slot === 'string' ? slot : slot.time || slot.label || slot.fullLabel;
        const slotId = typeof slot === 'object' ? slot.id : null;

        const { status, available, message } = getSlotStatus({
          date: selectedDate,
          time: timeLabel,
          serviceType,
          providerId,
          slotId,
          bufferMinutes,
        });

        if (typeof slot === 'string') {
          return {
            time: slot,
            label: slot,
            status,
            available,
            isPassed: status === 'PASSED',
            isBooked: status === 'BOOKED',
            message,
          };
        }

        return {
          ...slot,
          status,
          available,
          isPassed: status === 'PASSED',
          isBooked: status === 'BOOKED',
          message,
        };
      })
      .filter((slot) => {
        if (filterOutUnavailable) {
          return slot.available;
        }
        return true;
      });
  }, [selectedDate, rawSlots, serviceType, providerId, filterOutUnavailable, bufferMinutes, tick]);

  // Quick helper to check if a specific time is currently valid
  const checkAvailability = useCallback(
    (timeStr) => {
      return getSlotStatus({
        date: selectedDate,
        time: timeStr,
        serviceType,
        providerId,
        bufferMinutes,
      });
    },
    [selectedDate, serviceType, providerId, bufferMinutes, tick]
  );

  return {
    slots: processedSlots,
    hasAvailableSlots: processedSlots.some((s) => s.available),
    checkAvailability,
    refreshSlots: () => setTick((p) => p + 1),
  };
};

export default {
  parseSlotTime,
  parseDateToMidnight,
  isDatePast,
  isDateToday,
  isSlotPassed,
  isSlotBooked,
  getSlotStatus,
  validateAndBookSlot,
  cancelBookedSlot,
  subscribeToSlotChanges,
  useRealTimeSlotValidation,
};
