import { View } from 'react-native';

import styles from './ScreenContainer.styles';

/** Full-screen background used by login and the main tabs. */
export default function ScreenContainer({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}
