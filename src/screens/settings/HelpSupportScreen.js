import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';

import colors from '../../theme/colors';
import WebFooter from '../../components/web/WebFooter';

const FAQS = [
  {
    id: 'faq-1',
    question: 'How do I upload a doctor prescription for medicines?',
    answer:
      'During checkout in the Pharmacy section or in My Prescriptions under Health Records, you can take a live camera photo of your prescription or select an image from your device gallery. Our licensed pharmacist will verify the document before dispatching your medicines.',
  },
  {
    id: 'faq-2',
    question: 'How fast is the pharmacy medicine delivery?',
    answer:
      'We offer Express Delivery in 30 to 45 minutes from our nearest partner pharmacy hub in your city. You can also pick a scheduled delivery slot at checkout for later in the day or next morning.',
  },
  {
    id: 'faq-3',
    question: 'How do video consultations with doctors work?',
    answer:
      'Once you book a video consultation slot, you will receive an SMS and in-app notification 10 minutes before the call. Simply open the Appointments tab and tap "Join Video Call" to connect directly with your specialist.',
  },
  {
    id: 'faq-4',
    question: 'How do I get my diagnostic lab test reports?',
    answer:
      'Once your blood or diagnostic sample is processed by the lab, your digital report is automatically uploaded to your "Health Records -> Lab Reports" section. You can view parameters and download official PDF reports anytime.',
  },
  {
    id: 'faq-5',
    question: 'What is the refund and cancellation policy?',
    answer:
      'You can cancel doctor appointments up to 2 hours before the scheduled time for a 100% full refund. Pharmacy orders can be cancelled before they are dispatched for delivery.',
  },
];

const HelpSupportScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [expandedFaq, setExpandedFaq] = useState('faq-1');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Pharmacy & Order');

  const handleCallSupport = () => {
    Linking.openURL('tel:18008662844').catch(() => {
      showAlert('Helpline', 'Call 24/7 Toll-Free: 1800-MEDIUNIFY (1800-866-2844)');
    });
  };

  const handleWhatsAppSupport = () => {
    Linking.openURL('https://wa.me/919876543210?text=Hi%20MediUnify%20Support,%20I%20need%20help%20with%20my%20healthcare%20account.').catch(() => {
      showAlert('WhatsApp Support', 'WhatsApp Helpline: +91 98765 43210');
    });
  };

  const handleSubmitTicket = () => {
    if (!subject.trim() || !message.trim()) {
      showAlert('Incomplete Message', 'Please enter a subject and your inquiry message.');
      return;
    }
    setSubject('');
    setMessage('');
    showAlert(
      'Support Ticket Submitted',
      'Your request (Ticket #TK9401) has been received. Our healthcare executive will respond within 15 minutes.'
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.webHeaderInner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.secondary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Help & 24/7 Support</Text>
            <Text style={styles.headerSubtitle}>We are here to assist your care</Text>
          </View>
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
            { paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 240 : 180) : (Platform.OS === 'web' ? 0 : 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
        <View style={styles.webContainer}>
        {/* EMERGENCY 24/7 HELPLINE CARD */}
        <View style={styles.helpHeroCard}>
          <View style={styles.helpHeroTop}>
            <View style={styles.helpIconCircle}>
              <Ionicons name="headset" size={26} color={colors.white} />
            </View>
            <View style={styles.helpHeroInfo}>
              <Text style={styles.helpHeroTitle}>24/7 Medical Care Support</Text>
              <Text style={styles.helpHeroSub}>Instant assistance for bookings, orders & emergencies</Text>
            </View>
          </View>

          <View style={styles.contactButtonsRow}>
            <TouchableOpacity
              style={styles.callBtn}
              activeOpacity={0.85}
              onPress={handleCallSupport}
            >
              <Ionicons name="call" size={16} color={colors.primary} />
              <Text style={styles.callBtnText}>Toll-Free Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsappBtn}
              activeOpacity={0.85}
              onPress={handleWhatsAppSupport}
            >
              <Ionicons name="logo-whatsapp" size={16} color={colors.white} />
              <Text style={styles.whatsappBtnText}>WhatsApp Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>
        <View style={styles.faqsCard}>
          {FAQS.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.slate}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* SEND US A MESSAGE FORM */}
        <Text style={styles.sectionHeading}>Send Support Message</Text>
        <View style={styles.ticketCard}>
          <Text style={styles.inputLabel}>Inquiry Category</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.categoryWrap}>
              {['Pharmacy & Order', 'Doctor Appointment', 'Lab Test & Report', 'Billing & Refund', 'Other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    ticketCategory === cat && styles.categoryPillActive,
                  ]}
                  onPress={() => setTicketCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      ticketCategory === cat && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {['Pharmacy & Order', 'Doctor Appointment', 'Lab Test & Report', 'Billing & Refund', 'Other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    ticketCategory === cat && styles.categoryPillActive,
                  ]}
                  onPress={() => setTicketCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      ticketCategory === cat && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Subject *</Text>
          <TextInput
            style={styles.ticketInput}
            placeholder="e.g. Issue with medicine delivery"
            placeholderTextColor={colors.slate}
            value={subject}
            onChangeText={setSubject}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 500, animated: true });
              }, 100);
            }}
          />

          <Text style={[styles.inputLabel, { marginTop: 10 }]}>Detailed Message *</Text>
          <TextInput
            style={[styles.ticketInput, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Describe your question or issue in detail..."
            placeholderTextColor={colors.slate}
            value={message}
            onChangeText={setMessage}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 580, animated: true });
              }, 100);
            }}
            multiline
          />

          <TouchableOpacity
            style={styles.submitTicketBtn}
            activeOpacity={0.85}
            onPress={handleSubmitTicket}
          >
            <Ionicons name="send" size={16} color={colors.white} />
            <Text style={styles.submitTicketText}>Submit Support Ticket</Text>
          </TouchableOpacity>
        </View>
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FA',
  },
  header: {
    minHeight: 60,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.secondary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.slate,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    width: '100%',
  },
  webContainer: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  helpHeroCard: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  helpHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  helpIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpHeroInfo: {
    flex: 1,
  },
  helpHeroTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.white,
  },
  helpHeroSub: {
    fontSize: 10,
    color: '#A5F3FC',
    marginTop: 2,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },
  whatsappBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.secondary,
    marginBottom: 10,
    marginTop: 4,
  },
  faqsCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F6',
    paddingVertical: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.secondary,
    flex: 1,
  },
  faqBody: {
    marginTop: 8,
    paddingTop: 6,
  },
  faqAnswer: {
    fontSize: 12,
    color: colors.slate,
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    rowGap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F0F4F6',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  categoryPillTextActive: {
    color: colors.white,
    fontWeight: '900',
  },
  ticketInput: {
    backgroundColor: '#F8FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
  },
  submitTicketBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  submitTicketText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default HelpSupportScreen;
