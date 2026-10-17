import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebFooter from '../../components/web/WebFooter';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const NOTIFICATIONS_DATA = [
  {
    id: 'notif-1',
    category: 'Bookings',
    title: 'Doctor Appointment Confirmed',
    infoLines: ['Today • 4:30 PM', 'MediUnify Heart Clinic'],
    time: '12m ago',
    unread: true,
    icon: 'calendar-outline',
    iconColor: '#00B894',
    iconBg: '#E6F9F4',
    route: 'MyAppointments',
    ctaText: 'View Appointment →',
  },
  {
    id: 'notif-2',
    category: 'Pharmacy',
    title: 'Medicine Order Dispatched',
    infoLines: ['Order #MU-8842 • 3 items', 'Delivery within 30 min'],
    time: '45m ago',
    unread: true,
    icon: 'cart-outline',
    iconColor: '#3B82F6',
    iconBg: '#EFF6FF',
    route: 'Pharmacy',
    ctaText: 'Track Order →',
  },
  {
    id: 'notif-3',
    category: 'Lab Reports',
    title: 'Lab Report Ready',
    infoLines: ['Full Body Health Checkup', 'Report is ready to view'],
    time: '2h ago',
    unread: true,
    icon: 'document-text-outline',
    iconColor: '#0EA5E9',
    iconBg: '#F0F9FF',
    route: 'LabTests',
    ctaText: 'View Report →',
  },
  {
    id: 'notif-4',
    category: 'Wallet',
    title: '₹150 MediCoins Credited',
    infoLines: ['Earned on recent teleconsultation', 'Credited to Care Wallet'],
    time: 'Yesterday',
    unread: false,
    icon: 'wallet-outline',
    iconColor: '#00B894',
    iconBg: '#E6F8F5',
    route: 'Wallet',
    ctaText: 'View Wallet →',
  },
  {
    id: 'notif-5',
    category: 'Bookings',
    title: 'Video Consultation Scheduled',
    infoLines: ['Dr. Arvind Menon • Tomorrow, 11:00 AM', 'General Medicine follow-up'],
    time: '2d ago',
    unread: false,
    icon: 'videocam-outline',
    iconColor: '#7BC96F',
    iconBg: '#F2FAF0',
    route: 'MyAppointments',
    ctaText: 'View Details →',
  },
];

const TABS = ['All', 'Unread', 'Bookings', 'Pharmacy', 'Lab Reports', 'Wallet'];

const NotificationsScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DATA);

  useEffect(() => {
    loadDynamicNotifications();
    const unsub = navigation?.addListener ? navigation.addListener('focus', loadDynamicNotifications) : null;
    return unsub;
  }, [navigation]);

  const loadDynamicNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mediunify_user_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          NOTIFICATIONS_DATA.forEach((def) => {
            if (!merged.some((m) => m.id === def.id)) {
              merged.push(def);
            }
          });
          setNotifications(merged);
        }
      }
    } catch (e) {
      console.log('Error loading dynamic notifications:', e);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return n.unread;
    return n.category === activeTab;
  });

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markAsRead = (id, route) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    if (route && navigation?.navigate) {
      navigation.navigate(route);
    }
  };

  const getTabLabel = (tab) => {
    if (tab === 'All') return `All (${notifications.length})`;
    if (tab === 'Unread') return `Unread (${unreadCount})`;
    const count = notifications.filter((n) => n.category === tab).length;
    return count > 0 ? `${tab} (${count})` : tab;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation?.goBack()}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={20} color={isDarkMode ? theme.text : "#0F172A"} />
            </TouchableOpacity>

            <View style={styles.titleWithBadge}>
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
                </View>
              )}
            </View>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-outline" size={14} color="#00B894" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentWrap}>
        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {getTabLabel(tab)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Notifications List */}
        <View style={styles.scrollList}>
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No new notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up.</Text>
            </View>
          ) : (
            filteredNotifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                style={[styles.card, notif.unread && styles.cardUnread]}
                onPress={() => markAsRead(notif.id, notif.route)}
                activeOpacity={0.85}
              >
                {/* Header Row: Category, Icon, Unread Dot & Time */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.categoryWrap}>
                    <View style={[styles.iconBox, { backgroundColor: notif.iconBg }]}>
                      <Ionicons name={notif.icon || 'notifications-outline'} size={15} color={notif.iconColor} />
                    </View>
                    <Text style={styles.categoryText}>{notif.category}</Text>
                    {notif.unread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.timeText}>{notif.time}</Text>
                </View>

                {/* Title */}
                <Text style={[styles.cardTitle, notif.unread && styles.cardTitleUnread]}>
                  {notif.title}
                </Text>

                {/* Supporting Info */}
                <View style={styles.infoBlock}>
                  {Array.isArray(notif.infoLines) && notif.infoLines.length > 0 ? (
                    notif.infoLines.map((line, idx) => (
                      <Text key={idx} style={styles.infoLine} numberOfLines={1}>
                        {line}
                      </Text>
                    ))
                  ) : notif.message ? (
                    <Text style={styles.infoLine} numberOfLines={2}>
                      {notif.message}
                    </Text>
                  ) : null}
                </View>

                {/* Action CTA */}
                {notif.ctaText && (
                  <View style={styles.actionRow}>
                    <Text style={styles.actionText}>{notif.ctaText}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: Platform.OS === 'web' ? 0 : 40,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingBottom: 40,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  unreadBadge: {
    backgroundColor: '#00B894',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },

  // Filter Tabs
  tabsRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // List
  scrollList: {
    padding: 14,
    gap: 10,
  },

  // Notification Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {}),
  },
  cardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A7F3D0',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00B894',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },

  infoBlock: {
    marginBottom: 6,
    gap: 2,
  },
  infoLine: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
  },

  actionRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
});

export default NotificationsScreen;