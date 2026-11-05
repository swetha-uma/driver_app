import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../common/AppText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import styles from './BottomTabBar.styles';

const ICONS = {
  home: ['home', 'home-outline'],
  schedule: ['map', 'map-outline'],
  history: ['time', 'time-outline'],
  profile: ['person-circle', 'person-circle-outline'],
};

/**
 * Driver app bottom tabs.
 * When tabsLocked, Schedule/History stay disabled; Home + Profile stay open.
 */
export default function BottomTabBar({
  tabs,
  activeTab,
  onChange,
  bottomInset = 0,
  tabsLocked = false,
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
              <Ionicons
                name={active ? filled : outline}
                size={20}
                color={iconColor}
              />
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
