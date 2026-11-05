import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/** Slides the white login card up when the phone or code screen opens. */
export default function useSheetEntrance() {
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(42)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 560,
        delay: 160,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        delay: 160,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
    ]);

    entrance.start();

    return () => entrance.stop();
  }, [sheetOpacity, sheetY]);

  return {
    opacity: sheetOpacity,
    transform: [{ translateY: sheetY }],
  };
}
