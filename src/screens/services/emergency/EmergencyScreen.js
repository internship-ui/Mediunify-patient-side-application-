import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebFooter from '../../../components/web/WebFooter';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const EmergencyScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && isDesktopLayout(width);

  const handleCallEmergency = (number = '108') => {
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER (Mobile Only) */}
      {!isDesktopWeb && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#1E293B"} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Help</Text>
          <View style={{ width: 24 }} />
        </View>
      )}




      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isDesktopWeb && styles.desktopContainer]}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={56} color="#DC2626" />
            </View>

            <Text style={styles.title}>24/7 Medical Emergency Response</Text>

            <Text style={styles.description}>
              Immediate medical dispatch, ambulance response, and trauma center coordination across Karnataka. Call now for live assistance.
            </Text>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.emergencyButton}
                activeOpacity={0.88}
                onPress={() => handleCallEmergency('108')}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Call 108 (Ambulance)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.hotlineButton}
                activeOpacity={0.88}
                onPress={() => handleCallEmergency('1800-425-0099')}
              >
                <Ionicons name="headset" size={20} color="#DC2626" />
                <Text style={styles.hotlineButtonText}>MediUnify Helpline: 1800-425-0099</Text>
              </TouchableOpacity>
            </View>

            {/* QUICK CONTACT CHIPS */}
            <View style={styles.quickContactsRow}>
              <View style={styles.contactChip}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.contactChipText}>Free Ambulance Dispatch</Text>
              </View>
              <View style={styles.contactChip}>
                <Ionicons name="time" size={16} color="#1E3A8A" />
                <Text style={styles.contactChipText}>Average 12-Min Arrival</Text>
              </View>
              <View style={styles.contactChip}>
                <Ionicons name="heart" size={16} color="#FF7F50" />
                <Text style={styles.contactChipText}>Zero Upfront Payment</Text>
              </View>
            </View>
          </View>
        </View>

        {!isDesktopWeb && <View style={{ height: 110 }} />}

        {isDesktopWeb && <WebFooter navigation={navigation} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  desktopBreadcrumbWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  desktopBreadcrumbInner: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  breadcrumbCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  breadcrumbActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  emergencyVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyVerifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  desktopContainer: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    padding: 32,
    alignItems: 'center',
    maxWidth: 720,
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14.5,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 28,
  },
  actionButtonsRow: {
    width: '100%',
    gap: 12,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  hotlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hotlineButtonText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  quickContactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});

export default EmergencyScreen;