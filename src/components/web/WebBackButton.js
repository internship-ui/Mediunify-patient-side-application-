import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

/**
 * Standardized MediUnify Web Back Button
 * 
 * Design Specification:
 * - Circular shape (42px × 42px, borderRadius: 21)
 * - White/light background (#FFFFFF)
 * - Subtle thin border (1px solid #E2E8F0)
 * - Perfectly centered left-arrow icon (Ionicons name="arrow-back", size 20)
 * - Accessible focus & smooth hover/pressed state
 * - Consistent cursor: pointer on web
 * 
 * Can be used standalone:
 *   <WebBackButton onPress={() => navigation.goBack()} />
 * 
 * Or with title/subtitle header layout:
 *   <WebBackButton onPress={() => navigation.goBack()} title="Surgery" subtitle="Verified 24/7 Care" />
 */
const WebBackButton = ({
  onPress,
  navigation,
  title,
  subtitle,
  iconColor = '#1E3A8A',
  iconSize = 20,
  style,
  buttonStyle,
  titleStyle,
  subtitleStyle,
  accessibilityLabel = 'Go back to previous screen',
  children,
}) => {
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const resolvedIconColor = iconColor === '#1E3A8A' ? (isDarkMode ? '#F8FAFC' : '#1E3A8A') : iconColor;
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (typeof window !== 'undefined' && window?.history?.length > 1) {
      window.history.back();
    }
  };

  const buttonElement = (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      {...(Platform.OS === 'web'
        ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => {
              setIsHovered(false);
              setIsPressed(false);
            },
          }
        : {})}
      activeOpacity={0.85}
      style={[
        styles.circleButton,
        isHovered && styles.circleButtonHover,
        isPressed && styles.circleButtonPressed,
        buttonStyle,
        !title && style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name="arrow-back"
        size={iconSize}
        color={resolvedIconColor}
        style={styles.iconCenter}
      />
    </TouchableOpacity>
  );

  // If title is passed, render standard header row: [←] Page Title
  if (title || children) {
    return (
      <View style={[styles.headerRow, style]}>
        {buttonElement}
        <View style={styles.titleBlock}>
          {title ? (
            <Text
              style={[styles.titleText, titleStyle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            typeof subtitle === 'string' ? (
              <Text style={[styles.subtitleText, subtitleStyle]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : (
              subtitle
            )
          ) : null}
          {children}
        </View>
      </View>
    );
  }

  return buttonElement;
};

export default WebBackButton;

const baseStyles = StyleSheet.create({
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          outlineStyle: 'none',
          transition: 'all 0.15s ease-in-out',
        }
      : {}),
  },
  circleButtonHover: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    boxShadow: '0 3px 8px rgba(15, 23, 42, 0.09)',
  },
  circleButtonPressed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
    transform: [{ scale: 0.96 }],
  },
  iconCenter: {
    // Ensures crisp optical centering
    marginLeft: 0,
    marginTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
});
