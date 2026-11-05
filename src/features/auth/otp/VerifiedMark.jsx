import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import AppText from '../../../components/common/AppText';
import styles from './VerifiedMark.styles';

/** Check mark shown for a moment after the login code is accepted. */
export default function VerifiedMark() {
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0.4)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.8)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(circleOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(circleScale, {
          toValue: 1,
          speed: 12,
          bounciness: 7,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(haloOpacity, {
            toValue: 0.45,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(haloScale, {
              toValue: 1.45,
              duration: 520,
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0,
              duration: 520,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
      Animated.parallel([
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          speed: 14,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();

    return () => animation.stop();
  }, [checkOpacity, checkScale, circleOpacity, circleScale, haloOpacity, haloScale]);

  return (
    <Animated.View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Verified">
      <Animated.View style={styles.mark}>
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            {
              opacity: circleOpacity,
              transform: [{ scale: circleScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.check,
              {
                opacity: checkOpacity,
                transform: [{ rotate: '-45deg' }, { scale: checkScale }],
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
      <AppText variant="title" style={styles.title}>
        Verified
      </AppText>
    </Animated.View>
  );
}
