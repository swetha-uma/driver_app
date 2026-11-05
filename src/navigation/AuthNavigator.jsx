import { useState } from 'react';

import LoginScreen from '../features/auth/login/LoginScreen';
import OtpScreen from '../features/auth/otp/OtpScreen';
import ServerSettingsScreen from '../features/settings/ServerSettingsScreen';

/** Phone screen first, then the code screen. */
export default function AuthNavigator({ onAuthenticated }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [resendWaitSeconds, setResendWaitSeconds] = useState(60);
  const [step, setStep] = useState('login');

  if (step === 'server') {
    return <ServerSettingsScreen onBack={() => setStep('login')} onSaved={() => setStep('login')} />;
  }

  if (step === 'otp') {
    return (
      <OtpScreen
        mobileNumber={mobileNumber}
        resendWaitSeconds={resendWaitSeconds}
        onChangeNumber={() => setStep('login')}
        onVerified={(page) => onAuthenticated(mobileNumber, page)}
      />
    );
  }

  return (
    <LoginScreen
      initialMobileNumber={mobileNumber}
      onOpenServer={() => setStep('server')}
      onOtpRequested={(number, secondsUntilResend) => {
        setMobileNumber(number);
        setResendWaitSeconds(secondsUntilResend);
        setStep('otp');
      }}
    />
  );
}
