import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebBackButton from './WebBackButton';
import { BANNER_THEMES, getBannerTheme } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

const PatientPageBanner = ({
  title,
  subtitle,
  badgeText,
  badgeIcon = 'medical',
  iconName = 'calendar-outline',
  theme = 'teal',
  pills = [],
  rightContent = null,
  style = {},
  onBack,
}) => {
  const { width } = useWindowDimensions();
  const { isDarkMode } = useTheme();
  const isDesktop = width >= 900;
  const currentTheme = getBannerTheme(theme, isDarkMode);

  // On Mobile & Tablet (< 900px), render dedicated mobile layout with full-width title to avoid cramped text wrapping
  if (!isDesktop) {
    return (
      <View
        style={[
          styles.bannerCard,
          styles.bannerCardMobile,
          {
            backgroundColor: currentTheme.bg,
            backgroundImage: currentTheme.gradient,
            borderColor: currentTheme.borderColor,
          },
          style,
        ]}
      >
        {/* Top Header Row: Back Button + Icon + Category Badge */}
        <View style={styles.mobileTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {onBack ? (
              <WebBackButton
                onPress={onBack}
                style={{ alignSelf: 'center' }}
              />
            ) : null}

            {iconName ? (
              <View
                style={[
                  styles.iconCircleMobile,
                  {
                    backgroundColor: currentTheme.iconCircleBg,
                    borderColor: currentTheme.iconBorder || currentTheme.badgeBorder || '#E2E8F0',
                  },
                ]}
              >
                <Ionicons name={iconName} size={20} color={currentTheme.iconColor} />
              </View>
            ) : null}
          </View>

          {badgeText ? (
            <View
              style={[
                styles.categoryBadge,
                styles.categoryBadgeMobile,
                { backgroundColor: currentTheme.badgeBg, borderColor: currentTheme.badgeBorder },
              ]}
            >
              {badgeIcon ? (
                <Ionicons name={badgeIcon} size={11} color={currentTheme.badgeText} style={{ marginRight: 4 }} />
              ) : null}
              <Text style={[styles.categoryBadgeText, { color: currentTheme.badgeText, fontSize: 10 }]}>
                {badgeText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Full Width Title & Subtitle */}
        <View style={styles.mobileTitleSection}>
          <Text style={[styles.titleTextMobile, { color: currentTheme.headingColor }]}>{title}</Text>
          {subtitle ? (
            typeof subtitle === 'string' ? (
              <Text style={[styles.subtitleTextMobile, { color: currentTheme.textColor }]}>{subtitle}</Text>
            ) : (
              <View style={{ marginTop: 4 }}>{subtitle}</View>
            )
          ) : null}
        </View>

        {/* Status / Quick Filter Pills */}
        {Array.isArray(pills) && pills.length > 0 ? (
          <View style={styles.pillsRowMobile}>
            {pills.map((pill, idx) => (
              <View
                key={idx}
                style={[
                  styles.pillBadge,
                  styles.pillBadgeMobile,
                  {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : (pill.bgColor || '#DCFCE7'),
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : (pill.borderColor || '#86EFAC'),
                  },
                ]}
              >
                {pill.icon ? (
                  <Ionicons
                    name={pill.icon}
                    size={11}
                    color={isDarkMode ? '#00E5B0' : (pill.textColor || '#166534')}
                    style={{ marginRight: 4 }}
                  />
                ) : null}
                <Text style={[styles.pillBadgeText, { color: isDarkMode ? '#00E5B0' : (pill.textColor || '#166534'), fontSize: 10.5 }]}>
                  {pill.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Action Button */}
        {rightContent ? (
          <View style={styles.mobileRightContentWrap}>
            {rightContent}
          </View>
        ) : null}
      </View>
    );
  }

  // Desktop Layout
  return (
    <View
      style={[
        styles.bannerCard,
        {
          backgroundColor: currentTheme.bg,
          backgroundImage: currentTheme.gradient,
          borderColor: currentTheme.borderColor,
        },
        style,
      ]}
    >
      <View style={[styles.mainRow, styles.mainRowDesktop]}>
        {/* Left Section: Icon + Text Content */}
        <View style={styles.leftGroup}>
          {onBack ? (
            <WebBackButton
              onPress={onBack}
              style={{ alignSelf: 'flex-start', marginTop: 2 }}
            />
          ) : null}

          {iconName ? (
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: currentTheme.iconCircleBg,
                  borderColor: currentTheme.iconBorder || currentTheme.badgeBorder || '#E2E8F0',
                },
              ]}
            >
              <Ionicons name={iconName} size={24} color={currentTheme.iconColor} />
            </View>
          ) : null}

          <View style={styles.textColumn}>
            {badgeText ? (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: currentTheme.badgeBg, borderColor: currentTheme.badgeBorder },
                ]}
              >
                {badgeIcon ? (
                  <Ionicons name={badgeIcon} size={12} color={currentTheme.badgeText} style={{ marginRight: 5 }} />
                ) : null}
                <Text style={[styles.categoryBadgeText, { color: currentTheme.badgeText }]}>
                  {badgeText}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.titleText, { color: currentTheme.headingColor }]}>{title}</Text>

            {subtitle ? (
              typeof subtitle === 'string' ? (
                <Text style={[styles.subtitleText, { color: currentTheme.textColor }]}>{subtitle}</Text>
              ) : (
                <View style={{ marginTop: 4 }}>{subtitle}</View>
              )
            ) : null}

            {/* Optional Status / Quick Filter Pills */}
            {Array.isArray(pills) && pills.length > 0 ? (
              <View style={styles.pillsRow}>
                {pills.map((pill, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : (pill.bgColor || '#DCFCE7'),
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : (pill.borderColor || '#86EFAC'),
                      },
                    ]}
                  >
                    {pill.icon ? (
                      <Ionicons
                        name={pill.icon}
                        size={12}
                        color={isDarkMode ? '#00E5B0' : (pill.textColor || '#166534')}
                        style={{ marginRight: 5 }}
                      />
                    ) : null}
                    <Text style={[styles.pillBadgeText, { color: isDarkMode ? '#00E5B0' : (pill.textColor || '#166534') }]}>
                      {pill.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Right Section: Action Buttons, Quick Stats, or Custom Node */}
        {rightContent ? (
          <View style={styles.rightGroup}>
            {rightContent}
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default PatientPageBanner;

const styles = StyleSheet.create({
  bannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginTop: 6,
    marginBottom: 16,
    boxShadow: '0 2px 10px rgba(12, 59, 107, 0.05)',
  },
  bannerCardMobile: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 2,
    marginBottom: 8,
  },
  mobileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  iconCircleMobile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
  },
  categoryBadgeMobile: {
    marginBottom: 0,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  mobileTitleSection: {
    width: '100%',
    marginTop: 2,
  },
  titleTextMobile: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  subtitleTextMobile: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '400',
  },
  pillsRowMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    width: '100%',
  },
  pillBadgeMobile: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  mobileRightContentWrap: {
    width: '100%',
    marginTop: 8,
  },
  mainRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  mainRowDesktop: {
    flexDirection: 'row',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
    minWidth: 260,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
  },
  textColumn: {
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titleText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#1E3A8A', // Deep Navy Blue
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  subtitleText: {
    fontSize: 13,
    color: '#475569', // Slate
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 720,
    fontWeight: '400',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightGroup: {
    flexShrink: 0,
    alignItems: 'center',
  },
});
