import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Pressable, TextInput, View } from 'react-native';

import AppButton from '../../../components/common/AppButton';
import AppText from '../../../components/common/AppText';
import { OTP_LENGTH } from '../../../constants/auth';
import styles from './OtpForm.styles';

const FALLBACK_RESEND_SECONDS = 60;

/** Four code boxes; verifies automatically when complete. Resend wait below. */
export default function OtpForm({
  code,
  onChangeCode,
  onVerify,
  onResend,
  onResendError,
  onChangeNumber,
  busy = false,
  initialResendSeconds = FALLBACK_RESEND_SECONDS,
}) {
  const inputRef = useRef(null);
  const keyboardOpen = useRef(false);
  const openingKeypad = useRef(false);
  const caret = useRef(new Animated.Value(1)).current;
  const [secondsLeft, setSecondsLeft] = useState(initialResendSeconds);
  const canVerify = code.length === OTP_LENGTH;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, {
          toValue: 0.2,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(caret, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    blink.start();

    return () => blink.stop();
  }, [caret]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      keyboardOpen.current = true;
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardOpen.current = false;

      if (!openingKeypad.current) {
        inputRef.current?.blur();
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /** Open the number pad even if a box was already focused. */
  const openKeypad = () => {
    if (keyboardOpen.current && inputRef.current?.isFocused()) {
      return;
    }

    openingKeypad.current = true;
    inputRef.current?.blur();
    setTimeout(() => {
      inputRef.current?.focus();
      openingKeypad.current = false;
    }, 80);
  };

  /** Keep four digits, then verify automatically — no Verify button. */
  const handleChange = (value) => {
    const next = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    const wasComplete = code.length === OTP_LENGTH;
    onChangeCode(next);

    if (!wasComplete && next.length === OTP_LENGTH) {
      inputRef.current?.blur();
      Keyboard.dismiss();
      onVerify?.(next);
    }
  };

  /** Ask for a new code after the wait, then clear the old digits. */
  const handleResend = async () => {
    if (secondsLeft > 0 || busy) {
      return;
    }
    try {
      const secondsUntilResend = await onResend?.();
      onChangeCode('');
      setSecondsLeft(secondsUntilResend || FALLBACK_RESEND_SECONDS);
      openKeypad();
    } catch (err) {
      onResendError?.(err);
    }
  };

  return (
    <View style={styles.form}>
      <AppText variant="title" style={styles.prompt}>
        Enter OTP
      </AppText>
      <Pressable
        onPress={openKeypad}
        style={styles.codeWrap}
        accessibilityRole="button"
        accessibilityLabel="Enter OTP"
      >
        <View pointerEvents="none" style={styles.codeRow}>
          {Array.from({ length: OTP_LENGTH }, (_, index) => {
            const digit = code[index] ?? '';
            const isFilled = Boolean(digit);
            const isActive = !isFilled && index === code.length;

            return (
              <View
                key={index}
                style={[
                  styles.box,
                  isFilled && styles.boxFilled,
                  isActive && styles.boxActive,
                ]}
              >
                {digit ? (
                  <AppText variant="title" style={styles.digit}>
                    {digit}
                  </AppText>
                ) : isActive ? (
                  <Animated.View style={[styles.caret, { opacity: caret }]} />
                ) : null}
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          caretHidden
          showSoftInputOnFocus
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor="transparent"
          underlineColorAndroid="transparent"
        accessibilityLabel="4-digit verification code"
          accessibilityHint="Enter the code sent by SMS"
          onPressIn={openKeypad}
          style={styles.hiddenInput}
          onSubmitEditing={canVerify && !busy ? () => onVerify?.(code) : undefined}
        />
      </Pressable>
      {secondsLeft > 0 ? (
        <AppText variant="caption" style={styles.timer}>
          {`Resend code in 0:${String(secondsLeft).padStart(2, '0')}`}
        </AppText>
      ) : (
        <AppButton
          title="Resend OTP"
          variant="outline"
          onPress={handleResend}
          style={styles.resend}
        />
      )}
      <AppButton
        title="Change number"
        variant="soft"
        onPress={onChangeNumber}
        style={styles.changeNumber}
      />
    </View>
  );
}
