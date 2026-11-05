import { useEffect, useRef } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import AppButton from '../../../components/common/AppButton';
import AppInput from '../../../components/common/AppInput';
import AppText from '../../../components/common/AppText';
import { COUNTRY_CODE, MOBILE_LENGTH } from '../../../constants/auth';
import { colors } from '../../../theme/colors';
import styles from './LoginForm.styles';

/** Phone field and send button. The driver must tick the terms before the code is requested. */
export default function LoginForm({
  mobileNumber,
  onChangeMobile,
  onSendOtp,
  sending,
  sendError,
  canSend,
  agreed,
  termsError,
  onToggleAgree,
  onOpenServer,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      inputRef.current?.blur();
    });

    return () => hideSub.remove();
  }, []);

  /** Keep only the typed number and close the keyboard once 10 digits are entered. */
  const handleChangeMobile = (value) => {
    const wasComplete = mobileNumber.length === MOBILE_LENGTH;
    onChangeMobile(value);
    const digits = value.replace(/\D/g, '');

    if (!wasComplete && digits.length >= MOBILE_LENGTH) {
      inputRef.current?.blur();
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.form}>
      <AppText variant="title" style={styles.heading}>
        Enter your{'\n'}phone number
      </AppText>
      <AppInput
        ref={inputRef}
        value={mobileNumber}
        onChangeText={handleChangeMobile}
        placeholder="10-digit number"
        prefix={COUNTRY_CODE}
        helperText="Use the driver phone number on file at school. We'll send a login code by SMS."
        keyboardType="phone-pad"
        maxLength={MOBILE_LENGTH}
        accessibilityLabel="Enter your phone number"
        returnKeyType="done"
        onSubmitEditing={canSend ? onSendOtp : undefined}
      />
      <Pressable
        onPress={onToggleAgree}
        style={styles.termsRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="I agree to Terms and Conditions"
      >
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed ? (
            <AppText variant="caption" color={colors.white} style={styles.checkMark}>
              ✓
            </AppText>
          ) : null}
        </View>
        <AppText variant="body" color={colors.textSecondary} style={styles.termsText}>
          I agree to{' '}
          <AppText variant="body" color={colors.secondary} style={styles.termsLink}>
            Terms & Conditions
          </AppText>
        </AppText>
      </Pressable>
      {termsError ? (
        <AppText color={colors.error} style={styles.termsError}>
          Please agree to the Terms & Conditions to continue.
        </AppText>
      ) : null}
      {sendError ? (
        <AppText color={colors.error} style={styles.termsError}>
          {sendError}
        </AppText>
      ) : null}
      <AppButton
        title="Send OTP"
        onPress={onSendOtp}
        disabled={!canSend || sending}
        style={styles.button}
      />
      {onOpenServer ? (
        <Pressable
          onPress={onOpenServer}
          accessibilityRole="button"
          accessibilityLabel="Change school server"
          style={styles.serverLink}
        >
          <AppText variant="body" color={colors.secondary} style={styles.termsLink}>
            Server
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
