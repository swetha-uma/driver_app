import { Text } from 'react-native';

import styles from './AppText.styles';

/** Shared text styles so titles and body copy stay the same on every screen. */
export default function AppText({
  children,
  variant = 'body',
  color,
  style,
  ...rest
}) {
  return (
    <Text style={[styles[variant], color ? { color } : null, style]} {...rest}>
      {children}
    </Text>
  );
}
