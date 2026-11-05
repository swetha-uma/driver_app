import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../components/common/AppText';
import { colors } from '../../theme/colors';
import styles from './SwipeToStart.styles';

const THUMB_SIZE = 52;
const TRACK_PADDING = 4;

/** Slide the thumb across to confirm start/end trip. tone=danger for end trip. */
export default function SwipeToStart({
  label = 'Swipe to start trip',
  onComplete,
  disabled = false,
  tone = 'primary',
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const maxXRef = useRef(0);
  const disabledRef = useRef(disabled);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const isDanger = tone === 'danger';

  const maxX = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);
  maxXRef.current = maxX;
  disabledRef.current = disabled;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    completedRef.current = false;
    translateX.setValue(0);
  }, [disabled, translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current && !completedRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current && !completedRef.current,
        onPanResponderMove: (_evt, gesture) => {
          if (disabledRef.current || completedRef.current || maxXRef.current <= 0) return;
          const next = Math.min(Math.max(0, gesture.dx), maxXRef.current);
          translateX.setValue(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (disabledRef.current || completedRef.current || maxXRef.current <= 0) return;
          const limit = maxXRef.current;
          const next = Math.min(Math.max(0, gesture.dx), limit);
          if (next >= limit * 0.82) {
            completedRef.current = true;
            Animated.timing(translateX, {
              toValue: limit,
              duration: 120,
              useNativeDriver: false,
            }).start(() => {
              onCompleteRef.current?.();
            });
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            speed: 20,
            bounciness: 6,
          }).start();
        },
      }),
    [translateX],
  );

  const fillWidth = useMemo(
    () => Animated.add(translateX, THUMB_SIZE),
    [translateX],
  );

  return (
    <View
      style={[
        styles.track,
        isDanger && styles.trackDanger,
        disabled && styles.trackDisabled,
      ]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.fill,
          isDanger && styles.fillDanger,
          { width: fillWidth },
        ]}
      />
      <AppText variant="button" color={colors.white} style={styles.label}>
        {label}
      </AppText>
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX }] }]}
        {...(disabled ? {} : panResponder.panHandlers)}
      >
        <Ionicons
          name="chevron-forward"
          size={22}
          color={isDanger ? colors.error : colors.primary}
        />
      </Animated.View>
    </View>
  );
}
