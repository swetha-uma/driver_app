import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../common/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import styles from './BottomTabBar.styles';

/** Bell wiggle while unread — stops once badges clear. */
function ShakingIcon({ shouldShake, children }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shouldShake) {
      rotation.setValue(0);
      return undefined;
    }
    const wiggle = Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(2500),
      ]),
    );
    wiggle.start();
    return () => wiggle.stop();
  }, [shouldShake, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      {children}
    </Animated.View>
  );
}

const ICONS = {
  home: ['home', 'home-outline'],
  schedule: ['map', 'map-outline'],
  history: ['time', 'time-outline'],
  profile: ['person-circle', 'person-circle-outline'],
  // Why: Leave-mode tabs (teacher/staff shell)
  attendance: ['calendar', 'calendar-outline'],
  apply: ['create', 'create-outline'],
  leaves: ['documents', 'documents-outline'],
  notice: ['notifications', 'notifications-outline'],
  more: ['menu', 'menu-outline'],
  // Why: Owner-mode tabs (approval shell)
  leave: ['document-text', 'document-text-outline'],
  salary: ['cash', 'cash-outline'],
  scholarship: ['school', 'school-outline'],
};

/**
 * Driver app bottom tabs.
 * When tabsLocked, only Home + Profile stay open (legacy; Trip shell keeps tabs unlocked).
 */
export default function BottomTabBar({
  tabs,
  activeTab,
  onChange,
  bottomInset = 0,
  tabsLocked = false,
  // Why: { notice: true } -> red dot + bell shake until that notice is opened/read
  unreadTabs = {},
}) {
  return (
    <View style={[styles.bar, { paddingBottom: spacing.sm + bottomInset }]}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const icons = ICONS[tab.id] || ['ellipse', 'ellipse-outline'];
        const [filled, outline] = icons;
        // Why: Profile stays usable out of gateway range; only Schedule/History need nearVan
        const disabled = tabsLocked && tab.id !== 'home' && tab.id !== 'profile';
        const iconColor = disabled
          ? colors.border
          : active
            ? colors.primary
            : colors.textSecondary;
        const hasUnread = Boolean(unreadTabs[tab.id]) && !disabled;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={tab.label}
            disabled={disabled}
            onPress={() => {
              if (disabled) {
                return;
              }
              onChange(tab.id);
            }}
            style={[styles.tab, disabled && styles.tabDisabled]}
          >
            <View style={[styles.iconWrap, active && !disabled && styles.iconWrapActive]}>
              <ShakingIcon shouldShake={hasUnread}>
                <Ionicons
                  name={active ? filled : outline}
                  size={20}
                  color={iconColor}
                />
              </ShakingIcon>
              {hasUnread ? <View style={styles.unreadDot} /> : null}
            </View>
            <AppText
              variant="tab"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.label,
                active && !disabled ? styles.labelActive : null,
                disabled ? styles.labelDisabled : null,
              ]}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
