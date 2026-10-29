import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import {
  saveGuestLead,
  validateLeadInput,
  markLeadDismissedInSession,
} from '../../services/guestLeadService';

/**
 * GuestLeadModal
 * Minimal, user-friendly lead generation popup for guest healthcare searches.
 * Displays only Name and Phone Number (+91 prefix).
 */
const GuestLeadModal = ({
  visible,
  searchQuery = '',
  selectedCity = '',
  onSuccess,
  onClose,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const { isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setErrors({});
      setIsSubmitting(false);
      setSuccessMessage(null);
    }
  }, [visible]);

  // Ensure modal portal has top-level z-index on web via injected CSS stylesheet
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'mediunify-guest-lead-css';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        div:has(#mediunify-guest-lead-root),
        div:has(> #mediunify-guest-lead-root),
        #mediunify-guest-lead-root {
          z-index: 9999999 !important;
          position: fixed !important;
          inset: 0 !important;
        }
        #mediunify-guest-lead-card {
          z-index: 10000000 !important;
        }
      `;
    }
  }, []);

  // Clean phone input to allow only numeric characters (max 10 digits)
  const handlePhoneChange = (text) => {
    const numericOnly = text.replace(/\D/g, '').slice(0, 10);
    setPhone(numericOnly);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: null }));
    }
  };

  const handleNameChange = (text) => {
    setName(text);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: null }));
    }
  };

  const handleDismiss = () => {
    // Mark dismissed in current session so it doesn't repeat
    markLeadDismissedInSession();
    if (onClose) {
      onClose();
    }
  };

  const handleContinue = async () => {
    if (isSubmitting) return;

    // Validate inputs
    const validation = validateLeadInput({ name, phone });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await saveGuestLead({
        name,
        phone,
        query: searchQuery,
        city: selectedCity,
      });

      if (result.success) {
        setSuccessMessage('Details saved successfully');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(result.lead);
          }
        }, 500);
      } else {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setErrors({ form: result.error || 'Could not save details. Please try again.' });
        }
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrors({ form: 'An unexpected error occurred. Please try again.' });
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        nativeID="mediunify-guest-lead-root"
      >
        <View style={[styles.modalCard, isMobile && styles.modalCardMobile]} nativeID="mediunify-guest-lead-card">
          {/* Top Close (×) Button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleDismiss}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.headerWrap}>
              <View style={styles.badgeWrap}>
                <Ionicons name="shield-checkmark" size={16} color="#00B894" />
                <Text style={styles.badgeText}>Quick Enquiry</Text>
              </View>
              <Text style={styles.heading}>Let’s Get You Started</Text>
              <Text style={styles.subtitle}>Enter your details to continue.</Text>
            </View>

            {/* Success Feedback Banner */}
            {successMessage && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.successBannerText}>{successMessage}</Text>
              </View>
            )}

            {/* Form Level Error Banner */}
            {errors.form && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorBannerText}>{errors.form}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.fieldsContainer}>
              {/* Field 1: Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
                <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={errors.name ? '#EF4444' : '#64748B'}
                    style={styles.fieldIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={handleNameChange}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                </View>
                {errors.name ? (
                  <Text style={styles.inlineErrorText}>{errors.name}</Text>
                ) : null}
              </View>

              {/* Field 2: Phone Number with fixed +91 */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <View style={styles.countryCodeDivider} />
                  <TextInput
                    style={[styles.textInput, styles.phoneInput]}
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!isSubmitting}
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />
                </View>
                {errors.phone ? (
                  <Text style={styles.inlineErrorText}>{errors.phone}</Text>
                ) : null}
              </View>
            </View>

            {/* Continue Primary Button */}
            <TouchableOpacity
              style={[styles.continueBtn, isSubmitting && styles.continueBtnDisabled]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              {isSubmitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.continueBtnText}>Saving details...</Text>
                </View>
              ) : (
                <View style={styles.submittingRow}>
                  <Text style={styles.continueBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Small Privacy Note */}
            <View style={styles.privacyNoteRow}>
              <Ionicons name="lock-closed-outline" size={13} color="#94A3B8" style={{ marginTop: 1 }} />
              <Text style={styles.privacyNoteText}>
                Your details will only be used to respond to your healthcare enquiry.
              </Text>
            </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const baseStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    maxHeight: '90%',
    zIndex: 1000000,
  },
  modalCardMobile: {
    maxWidth: '100%',
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 18,
  },
  scrollContent: {
    flexGrow: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerWrap: {
    marginBottom: 20,
    paddingRight: 30,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  fieldsContainer: {
    gap: 16,
    marginBottom: 22,
  },
  fieldGroup: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  fieldIcon: {
    marginRight: 8,
  },
  countryCodeBadge: {
    paddingRight: 8,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  countryCodeDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
    minHeight: 44,
    outlineStyle: 'none',
  },
  phoneInput: {
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  inlineErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
  continueBtn: {
    backgroundColor: colors.primary || '#00B894',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: colors.primary || '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  privacyNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  privacyNoteText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default GuestLeadModal;
