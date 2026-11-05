import { forwardRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { colors } from '../../theme/colors';
import AppText from './AppText';
import styles from './AppInput.styles';

/** Shared text field. The phone screen uses it for the mobile number. */
const AppInput = forwardRef(function AppInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    prefix,
    helperText,
    error,
    keyboardType = 'default',
    maxLength,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.fieldShell,
          focused && styles.fieldShellFocused,
          error ? styles.fieldShellError : null,
        ]}
      >
        <View style={styles.field}>
          {prefix ? (
            <View style={styles.prefixWrap}>
              <AppText variant="label">{prefix}</AppText>
            </View>
          ) : null}
          {prefix ? <View style={styles.divider} /> : null}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            keyboardType={keyboardType}
            maxLength={maxLength}
            selectionColor={colors.primary}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
            {...rest}
          />
        </View>
      </View>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
      {!error && helperText ? (
        <AppText variant="body" style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

export default AppInput;
