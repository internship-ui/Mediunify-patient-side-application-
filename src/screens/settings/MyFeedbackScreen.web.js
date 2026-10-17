import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebFooter from '../../components/web/WebFooter';
import PaginationBar from '../../components/web/PaginationBar';
import PatientPageBanner from '../../components/web/PatientPageBanner';
import {
  getActivePatient,
  getFeedbackList,
  saveFeedbackList,
} from '../../data/patientDashboardData';
import { isGuestUser, promptLoginRequired } from '../../utils/authHelper';

const MyFeedbackScreenWeb = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [patient, setPatient] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Pagination (4 reviews per page)
  const ITEMS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Controls
  const [viewingFeedback, setViewingFeedback] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New feedback state
  const [serviceName, setServiceName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const guest = await isGuestUser();
      if (guest) {
        setIsGuestMode(true);
        setPatient(null);
        setFeedbackList([]);
        setLoading(false);
        return;
      }
      setIsGuestMode(false);
      const p = await getActivePatient();
      setPatient(p);
      const items = await getFeedbackList();
      setFeedbackList(items);
    } catch (e) {
      console.warn('Error loading feedback:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewFeedback = async () => {
    const guest = await isGuestUser();
    if (guest) {
      promptLoginRequired(navigation, { service: 'profile', message: 'Please login to submit feedback and reviews.' });
      return;
    }
    setIsSubmitModalOpen(true);
  };

  const handleAddNewFeedback = async () => {
    if (!serviceName.trim() || !reviewText.trim()) {
      showToast('Please provide a service/doctor name and your review.');
      return;
    }

    const newItem = {
      id: `FB-${Date.now().toString().slice(-4)}`,
      serviceName: serviceName.trim(),
      facility: facilityName.trim() || 'MediUnify Verified Healthcare Facility',
      date: 'Today',
      rating: rating,
      status: 'Published',
      review: reviewText.trim(),
      response: 'Thank you for sharing your experience. We are committed to continuous quality care.',
    };

    const updated = [newItem, ...feedbackList];
    setFeedbackList(updated);
    await saveFeedbackList(updated);
    setCurrentPage(1);
    setIsSubmitModalOpen(false);
    setServiceName('');
    setFacilityName('');
    setReviewText('');
    setRating(5);
    showToast('Your feedback has been submitted successfully!');
  };

  // Filter tabs definition
  const filterTabs = useMemo(() => [
    { id: 'All', label: 'All Reviews', count: feedbackList.length },
    { id: '5 Stars', label: '5 Stars', count: feedbackList.filter((f) => f.rating === 5).length },
    { id: '4 Stars', label: '4 Stars', count: feedbackList.filter((f) => f.rating === 4).length },
    { id: 'With Response', label: 'With Response', count: feedbackList.filter((f) => Boolean(f.response)).length },
  ], [feedbackList]);

  // Filter & Search logic
  const filteredFeedback = useMemo(() => {
    return feedbackList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.serviceName || '').toLowerCase().includes(q);
        const matchFacility = (item.facility || '').toLowerCase().includes(q);
        const matchReview = (item.review || '').toLowerCase().includes(q);
        if (!matchName && !matchFacility && !matchReview) return false;
      }
      if (activeFilter === '5 Stars') return item.rating === 5;
      if (activeFilter === '4 Stars') return item.rating === 4;
      if (activeFilter === 'With Response') return Boolean(item.response);
      return true;
    });
  }, [feedbackList, activeFilter, searchQuery]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  // Slice reviews for current page (4 reviews per page)
  const paginatedFeedback = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFeedback.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredFeedback, currentPage]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Notification Toast */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* Page Hero Banner */}
        <View style={styles.innerContainer}>
          <PatientPageBanner
            onBack={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate('Home')}
            title="My Feedback & Reviews"
            subtitle="Your verified doctor ratings, clinic feedback, and provider responses."
            badgeText="Verified Reviews"
            badgeIcon="star"
            iconName="chatbubbles"
            theme="teal"
            pills={[
              {
                label: `${feedbackList.length} Reviews`,
                bgColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                textColor: '#13BE9C',
                icon: 'star',
              },
              {
                label: '100% Verified',
                bgColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                textColor: '#1E3A8A',
                icon: 'shield-checkmark',
              },
            ]}
            rightContent={
              <TouchableOpacity
                style={styles.organicHeroBtn}
                onPress={handleOpenNewFeedback}
                activeOpacity={0.85}
              >
                <View style={styles.organicHeroArrowCircle}>
                  <Ionicons name="create-outline" size={13} color="#13BE9C" />
                </View>
                <Text style={styles.organicHeroBtnText}>Write New Review</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <View style={[styles.innerContainer, { paddingTop: 8, paddingBottom: 60 }]}>
          {/* Controls: Filter Tabs & Search */}
          <View style={styles.controlsCard}>
            <View style={styles.tabsRow}>
              {filterTabs.map((tab) => {
                const active = activeFilter === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                    onPress={() => setActiveFilter(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                      {tab.label}
                    </Text>
                    <View style={[styles.tabCountBadge, active && styles.tabCountBadgeActive]}>
                      <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#13BE9C" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search reviews by doctor, clinic, or service..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Feedback Items List */}
          {isGuestMode ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#E6F8F4' }]}>
                <Ionicons name="chatbubbles-outline" size={42} color="#13BE9C" />
              </View>
              <Text style={styles.emptyTitle}>Login to view your feedback & reviews</Text>
              <Text style={styles.emptyDesc}>
                Please sign in to view your past feedback, doctor reviews, and provider responses.
              </Text>
              <TouchableOpacity
                style={[styles.submitFirstBtn, { marginTop: 14 }]}
                onPress={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                  }
                  navigation?.navigate('Login', { openAuthModal: true });
                }}
              >
                <Text style={styles.submitFirstBtnText}>Login</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#13BE9C" />
              <Text style={styles.loadingText}>Loading your feedback history...</Text>
            </View>
          ) : filteredFeedback.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={42} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || activeFilter !== 'All' ? 'No matching reviews found' : 'No feedback submitted yet'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery || activeFilter !== 'All'
                  ? 'Try adjusting your search terms or filter selection.'
                  : "You haven't left any feedback or ratings for previous appointments or orders."}
              </Text>
              {!searchQuery && activeFilter === 'All' && (
                <TouchableOpacity
                  style={styles.submitFirstBtn}
                  onPress={handleOpenNewFeedback}
                >
                  <Text style={styles.submitFirstBtnText}>Share Your First Experience</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.feedbackGrid}>
              {paginatedFeedback.map((item) => (
                <View key={item.id} style={styles.feedbackCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.serviceName}>{item.serviceName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <Ionicons name="location-outline" size={13} color="#64748B" />
                        <Text style={styles.facilityName}>{item.facility}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.ratingBadgeText}>{item.rating}.0 / 5.0</Text>
                    </View>
                  </View>

                  <Text style={styles.reviewText}>"{item.review}"</Text>

                  {item.response && (
                    <View style={styles.responseBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 5 }}>
                        <Ionicons name="arrow-undo" size={13} color="#13BE9C" />
                        <Text style={styles.responseAuthor}>Provider Response</Text>
                      </View>
                      <Text style={styles.responseBody}>{item.response}</Text>
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                      <Text style={styles.dateText}>Submitted on {item.date}</Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Ionicons name="checkmark-circle" size={13} color="#13BE9C" style={{ marginRight: 4 }} />
                      <Text style={styles.statusPillText}>{item.status}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {filteredFeedback.length > 0 && (
                <PaginationBar
                  currentPage={currentPage}
                  totalItems={filteredFeedback.length}
                  pageSize={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  itemLabel="reviews"
                />
              )}
            </View>
          )}
        </View>

        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* =========================================================
          SUBMIT NEW FEEDBACK MODAL (Modular & Ready)
      ========================================================= */}
      <Modal visible={isSubmitModalOpen} transparent animationType="fade" onRequestClose={() => setIsSubmitModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Share Your Healthcare Experience</Text>
                <Text style={styles.modalSubtitle}>Rate your consultation, clinic visit, or pharmacy delivery</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSubmitModalOpen(false)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Doctor, Clinic, or Service Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Anita Sharma, Aster CMI OPD, Apollo Indiranagar..."
                placeholderTextColor="#94A3B8"
                value={serviceName}
                onChangeText={setServiceName}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Facility / Location (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Hebbal, Bengaluru..."
                placeholderTextColor="#94A3B8"
                value={facilityName}
                onChangeText={setFacilityName}
              />

              {/* Star Rating Selector */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Your Overall Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)} style={{ padding: 4 }}>
                    <Ionicons
                      name={s <= rating ? 'star' : 'star-outline'}
                      size={28}
                      color={s <= rating ? '#F59E0B' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                ))}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A', marginLeft: 8 }}>
                  {rating === 5 ? 'Excellent (5/5)' : rating === 4 ? 'Very Good (4/5)' : rating === 3 ? 'Average (3/5)' : 'Needs Improvement'}
                </Text>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Detailed Review & Feedback</Text>
              <TextInput
                style={[styles.modalInput, { height: 90 }]}
                placeholder="Write about the doctor's explanation, waiting time, staff behavior, hygiene..."
                placeholderTextColor="#94A3B8"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsSubmitModalOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAddNewFeedback}>
                <Ionicons name="send" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MyFeedbackScreenWeb;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FEFB',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  innerContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 9999,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Image 2 Exact Hero CTA (Circular Outline Arrow + Bold Text in #13BE9C)
  organicHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 16,
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
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Controls Card (Tabs & Search)
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
    gap: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
  },
  tabBtnActive: {
    backgroundColor: '#13BE9C',
    borderColor: '#13BE9C',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    outlineStyle: 'none',
  },

  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420,
    marginTop: 6,
    lineHeight: 18,
  },
  submitFirstBtn: {
    marginTop: 18,
    backgroundColor: '#13BE9C',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    boxShadow: '0 4px 12px rgba(19, 190, 156, 0.25)',
  },
  submitFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  feedbackGrid: {
    gap: 16,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 21,
  },
  facilityName: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  reviewText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  responseBox: {
    backgroundColor: '#F0FDF9',
    borderLeftWidth: 3,
    borderLeftColor: '#13BE9C',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  responseAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  responseBody: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#13BE9C',
  },

  // Modal Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseIcon: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13BE9C',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
});
