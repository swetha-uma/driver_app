import { useState } from 'react';
import { Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import KeyboardAvoidingContainer from '../../../components/layout/KeyboardAvoidingContainer';
import ScreenContainer from '../../../components/layout/ScreenContainer';
import { MOBILE_LENGTH } from '../../../constants/auth';
import { sendLoginCode } from '../../../services/unifiedLoginApi';
import { colors } from '../../../theme/colors';
import AuthHero from '../components/AuthHero';
import sheetStyles from '../components/AuthSheet.styles';
import useSheetEntrance from '../components/useSheetEntrance';
import LoginForm from './LoginForm';

/** Asks for the school phone number and requests the login code. */
export default function LoginScreen({ initialMobileNumber = '', onOtpRequested, onOpenServer }) { // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  const [mobileNumber, setMobileNumber] = useState(initialMobileNumber);
  const [agreed, setAgreed] = useState(initialMobileNumber.length === MOBILE_LENGTH);
  const [termsError, setTermsError] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const sheetMotion = useSheetEntrance();

  /** Store digits only, and stop at 10. */
  const handleChangeMobile = (value) => {
    setMobileNumber(value.replace(/\D/g, '').slice(0, MOBILE_LENGTH));
  };

  /** Request the login code, then open the code screen. */
  const handleSendOtp = async () => {
    if (!agreed) {
      setTermsError(true);
    }

    if (mobileNumber.length !== MOBILE_LENGTH || !agreed || sending) {
      return;
    }

    setSendError('');
    setSending(true);
    try {
      const { secondsUntilResend, mode } = await sendLoginCode(mobileNumber);
      onOtpRequested?.(mobileNumber, secondsUntilResend, mode);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send the code');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer style={sheetStyles.screen}>
      <StatusBar style="light" backgroundColor={colors.heroTop} translucent={false} />
      <KeyboardAvoidingContainer contentContainerStyle={sheetStyles.scroll}>
        <AuthHero
          title="Welcome, staff"
          subtitle="Sign in with your school phone number to manage van trips."
        />
        <Animated.View style={[sheetStyles.sheet, sheetMotion]}>
          <LoginForm
            mobileNumber={mobileNumber}
            onChangeMobile={handleChangeMobile}
            onSendOtp={handleSendOtp}
            sending={sending}
            sendError={sendError}
            agreed={agreed}
            termsError={termsError}
            onToggleAgree={() => {
              setAgreed((current) => !current);
              setTermsError(false);
            }}
            canSend={mobileNumber.length === MOBILE_LENGTH}
            onOpenServer={onOpenServer}
          />
        </Animated.View>
      </KeyboardAvoidingContainer>
    </ScreenContainer>
  );
}
