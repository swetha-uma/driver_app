import { useEffect, useState } from 'react';
import { Animated, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import AppText from '../../../components/common/AppText';
import KeyboardAvoidingContainer from '../../../components/layout/KeyboardAvoidingContainer';
import ScreenContainer from '../../../components/layout/ScreenContainer';
import { OTP_LENGTH } from '../../../constants/auth';
import { sendDriverLoginCode, verifyDriverLoginCode } from '../../../services/loginApi';
import { colors } from '../../../theme/colors';
import { maskMobileNumber } from '../../../utils/formatPhone';
import AuthHero from '../components/AuthHero';
import sheetStyles from '../components/AuthSheet.styles';
import useSheetEntrance from '../components/useSheetEntrance';
import OtpForm from './OtpForm';
import VerifiedMark from './VerifiedMark';
import styles from './OtpScreen.styles';

/** Checks the 4-digit code and opens the next screen when accepted. */
export default function OtpScreen({ mobileNumber, resendWaitSeconds = 60, onChangeNumber, onVerified }) {
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verifiedPage, setVerifiedPage] = useState(null);
  const sheetMotion = useSheetEntrance();

  useEffect(() => {
    if (!verified || !verifiedPage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onVerified?.(verifiedPage);
    }, 700);

    return () => clearTimeout(timer);
  }, [onVerified, verified, verifiedPage]);

  /** Auto-runs when all 4 digits are entered. */
  const handleVerify = async (otpCode = code) => {
    const digits = String(otpCode || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (digits.length !== OTP_LENGTH || verifying) {
      return;
    }

    Keyboard.dismiss();
    setError('');
    setVerifying(true);
    try {
      const page = await verifyDriverLoginCode(mobileNumber, digits);
      setVerifiedPage(page);
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = () => sendDriverLoginCode(mobileNumber);

  return (
    <ScreenContainer style={sheetStyles.screen}>
      <StatusBar style="light" backgroundColor={colors.heroTop} translucent={false} />
      <KeyboardAvoidingContainer contentContainerStyle={sheetStyles.scroll}>
        <AuthHero
          title="Verify your number"
          subtitle="Enter the 4-digit code sent to"
          highlight={maskMobileNumber(mobileNumber)}
          style={styles.hero}
        />
        <Animated.View style={[sheetStyles.sheet, sheetMotion]}>
          {verified ? (
            <VerifiedMark />
          ) : (
            <>
              <OtpForm
                code={code}
                busy={verifying}
                initialResendSeconds={resendWaitSeconds}
                onChangeCode={(next) => {
                  setError('');
                  setCode(next);
                }}
                onVerify={handleVerify}
                onResend={handleResend}
                onResendError={(err) => {
                  setError(err instanceof Error ? err.message : 'Could not resend the code');
                }}
                onChangeNumber={onChangeNumber}
              />
              {error ? (
                <AppText color={colors.error} style={styles.errorText}>
                  {error}
                </AppText>
              ) : null}
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingContainer>
    </ScreenContainer>
  );
}
