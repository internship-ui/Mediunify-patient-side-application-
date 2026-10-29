import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from '../../navigation/navigationRef';
import { useTheme } from '../../context/ThemeContext';
import { isDesktopLayout, isDesktopSiteRequested } from '../../utils/responsiveLayoutHelper';

const FloatingAiBotIcon = () => {
  const { t, isDarkMode } = useTheme();
  if (Platform.OS !== 'web') return null;

  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isMobile = !isDesktopLayout(width);
  const isMobileLayout = !desktopSiteMode && (width < 992);

  const [currentPath, setCurrentPath] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      setCurrentPath(window.location.pathname || '');
      const handleLocationChange = () => {
        setCurrentPath(window.location.pathname || '');
      };
      window.addEventListener('popstate', handleLocationChange);
      return () => {
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('popstate', handleLocationChange);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (navigationRef?.isReady?.()) {
      const unsubscribe = navigationRef.addListener('state', () => {
        try {
          const current = navigationRef.getCurrentRoute();
          if (current?.name) {
            setCurrentPath(current.name);
          }
        } catch (e) {}
      });
      return unsubscribe;
    }
  }, []);

  // Inject CSS animations
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'mediunify-floating-bot-css';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        @keyframes mediunify-bot-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes mediunify-bot-pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 184, 148, 0.45); }
          70% { box-shadow: 0 0 0 10px rgba(0, 184, 148, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 184, 148, 0); }
        }
        @keyframes mediunify-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.85; }
        }
        @keyframes mediunify-popup-pop {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.94);
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }
        .mediunify-bot-fab {
          transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s ease !important;
          cursor: pointer !important;
          animation: mediunify-bot-bounce 4s ease-in-out infinite;
        }
        .mediunify-bot-fab:hover {
          transform: translateY(-6px) scale(1.06) !important;
          animation: none !important;
          box-shadow: 0 16px 36px -6px rgba(0, 184, 148, 0.45), 0 4px 12px rgba(30, 58, 138, 0.12) !important;
        }
        .mediunify-bot-ring {
          animation: mediunify-bot-pulse 2.8s infinite;
        }
        .mediunify-live-indicator {
          animation: mediunify-dot-pulse 2s infinite ease-in-out;
        }
        .mediunify-popup-card {
          animation: mediunify-popup-pop 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .mediunify-popup-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 14px 30px -4px rgba(30, 58, 138, 0.15), 0 4px 12px rgba(0, 184, 148, 0.12) !important;
        }
      `;
    }
  }, []);

  // Hide on Chatbot, Login, and Auth screens only
  const isExcludedScreen =
    currentPath.toLowerCase().includes('chatbot') ||
    currentPath.toLowerCase().includes('login') ||
    currentPath.toLowerCase().includes('auth') ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.toLowerCase().includes('chatbot') ||
       window.location.pathname.toLowerCase().includes('login') ||
       window.location.hash.toLowerCase().includes('login') ||
       window.location.pathname.toLowerCase().includes('auth') ||
       window.location.hash.toLowerCase().includes('chatbot')));

  if (isExcludedScreen || isMobileLayout) return null;

  const handleOpenChat = () => {
    if (navigationRef?.isReady?.()) {
      try {
        navigationRef.navigate('MainApp', { screen: 'Chatbot' });
        return;
      } catch (e) {
        try {
          navigationRef.navigate('Chatbot');
          return;
        } catch (err) {}
      }
    }
    if (typeof window !== 'undefined') {
      window.location.hash = '#/chatbot';
    }
  };

  return (
    <View
      style={[styles.container, isMobile && styles.containerMobile, { pointerEvents: 'box-none' }]}
    >
      {/* Speech Bubble Popup */}
      {showPopup && (
        <View
          style={[
            styles.popupBubble,
            isDarkMode && {
              backgroundColor: '#111C35',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              shadowColor: '#000000',
            },
          ]}
          // @ts-ignore
          className="mediunify-popup-card"
        >
          {/* Header with live dot & dismiss cross */}
          <View style={styles.popupHeader}>
            <View
              style={[
                styles.popupBadge,
                isDarkMode && {
                  backgroundColor: 'rgba(0, 229, 176, 0.12)',
                  borderColor: 'rgba(0, 229, 176, 0.25)',
                },
              ]}
            >
              <View style={[styles.popupGreenDot, isDarkMode && { backgroundColor: '#00E5B0' }]} />
              <Text style={[styles.popupBadgeText, isDarkMode && { color: '#00E5B0' }]}>
                {t('online_24_7', 'Online · 24/7')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowPopup(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.popupCloseBtn, isDarkMode && { backgroundColor: '#16223D' }]}
              accessibilityLabel="Dismiss message"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={13} color={isDarkMode ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Clickable Card Body */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleOpenChat}
            style={styles.popupContent}
            accessibilityRole="button"
            accessibilityLabel="Chat with MediUnify AI"
          >
            <Text style={[styles.popupTitle, isDarkMode && { color: '#FFFFFF' }]}>
              {t('bot_greeting', "Hi! I'm MediUnify AI")}
            </Text>
            <Text style={[styles.popupDesc, isDarkMode && { color: '#94A3B8' }]}>
              {t('bot_help_prompt', 'How can I help you today? Ask about symptoms, medicines or doctors.')}
            </Text>

            <View
              style={[
                styles.popupCta,
                isDarkMode && {
                  backgroundColor: 'rgba(0, 229, 176, 0.12)',
                  borderColor: 'rgba(0, 229, 176, 0.25)',
                },
              ]}
            >
              <Text style={[styles.popupCtaText, isDarkMode && { color: '#00E5B0' }]}>
                {t('tap_to_chat', 'Tap to chat')}
              </Text>
              <Ionicons name="arrow-forward" size={12} color={isDarkMode ? '#00E5B0' : '#00B894'} />
            </View>
          </TouchableOpacity>

          {/* Bottom tail pointing down to bot avatar */}
          <View
            style={[
              styles.popupTail,
              isDarkMode && {
                backgroundColor: '#111C35',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
            ]}
          />
        </View>
      )}

      {/* Floating AI Chatbot Button */}
      <TouchableOpacity
        style={styles.fabBtn}
        // @ts-ignore
        className="mediunify-bot-fab mediunify-bot-ring"
        onPress={handleOpenChat}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Ask MediUnify AI Assistant"
        accessibilityHint="Opens the AI health assistant chat"
      >
        <Image
          source={require('../../../assets/images/ai-bot-avatar.png')}
          style={styles.botImage}
          resizeMode="cover"
        />

        {/* Online Status Live Dot */}
        <View style={styles.onlineBadge}>
          <View
            style={styles.onlineDot}
            // @ts-ignore
            className="mediunify-live-indicator"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    bottom: 28,
    right: 28,
    zIndex: 999999,
    alignItems: 'flex-end',
    flexDirection: 'column',
  },
  containerMobile: {
    bottom: 74,
    right: 18,
  },
  /* Popup Bubble */
  popupBubble: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  popupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  popupGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7BC96F',
  },
  popupBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00B894',
    letterSpacing: 0.3,
  },
  popupCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  popupCloseIcon: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    lineHeight: 11,
  },
  popupContent: {
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 3,
  },
  popupDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 9,
  },
  popupCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  popupCtaText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#00B894',
  },
  popupCtaArrow: {
    fontSize: 11,
    color: '#00B894',
    fontWeight: '700',
  },
  popupTail: {
    position: 'absolute',
    bottom: -6,
    right: 26,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DCE7EC',
    transform: [{ rotate: '45deg' }],
  },
  /* Floating Action Button */
  fabBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', outlineStyle: 'none' } : {}),
  },
  botImage: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
  },
  onlineBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  onlineDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#7BC96F',
  },
});

export default FloatingAiBotIcon;