import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import styles from './AuthHero.styles';

/** Shield drawn above the login and code titles. */
function ShieldMark() {
  return (
    <View style={styles.badge}>
      <View style={styles.shield}>
        <View style={styles.check} />
      </View>
    </View>
  );
}

/** Blue top area shared by the phone screen and the code screen. */
export default function AuthHero({ title, subtitle, highlight, style }) {
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.72)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(16)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(16)).current;
  const badgeFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.stagger(110, [
      Animated.parallel([
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 460,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleY, {
          toValue: 0,
          duration: 460,
          useNativeDriver: true,
        }),
      ]),
    ]);

    const floatBadge = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeFloat, {
          toValue: -6,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(badgeFloat, {
          toValue: 6,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );

    let alive = true;

    entrance.start(({ finished }) => {
      if (finished && alive) {
        floatBadge.start();
      }
    });

    return () => {
      alive = false;
      entrance.stop();
      floatBadge.stop();
    };
  }, [
    badgeFloat,
    badgeOpacity,
    badgeScale,
    subtitleOpacity,
    subtitleY,
    titleOpacity,
    titleY,
  ]);

  return (
    <LinearGradient
      colors={[colors.heroTop, colors.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      <View style={styles.circleLarge} />
      <View style={styles.circleDeep} />
      <Animated.View
        style={[
          styles.badgeAlign,
          {
            opacity: badgeOpacity,
            transform: [{ translateY: badgeFloat }, { scale: badgeScale }],
          },
        ]}
      >
        <ShieldMark />
      </Animated.View>
      <Animated.View
        style={[
          styles.copy,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
          },
        ]}
      >
        <AppText
          variant="heading"
          color={colors.white}
          numberOfLines={2}
          style={styles.title}
        >
          {title}
        </AppText>
      </Animated.View>
      <Animated.View
        style={[
          styles.copy,
          {
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleY }],
          },
        ]}
      >
        <AppText variant="subtitle" color={colors.onPrimaryMuted} style={styles.subtitle}>
          {subtitle}
        </AppText>
        {highlight ? (
          <AppText variant="subtitle" color={colors.white} style={styles.highlight}>
            {highlight}
          </AppText>
        ) : null}
      </Animated.View>
    </LinearGradient>
  );
}
