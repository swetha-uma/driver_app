import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import styles from './KeyboardAvoidingContainer.styles';

/** Keeps the phone and code fields above the keyboard. */
export default function KeyboardAvoidingContainer({
  children,
  contentContainerStyle,
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
