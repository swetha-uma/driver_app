import { useState } from 'react';

import LoginScreen from '../features/auth/login/LoginScreen';
import OtpScreen from '../features/auth/otp/OtpScreen';
import ServerSettingsScreen from '../features/settings/ServerSettingsScreen';

/** Phone screen first, then the code screen. */
export default function AuthNavigator({ onAuthenticated }) { // KAN-27 | Driver App Module Requirement | Created by Swetha on 18 Nov 2026 | Trip, schedule, van attendance, BLE gateway, and driver home.
  const [mobileNumber, setMobileNumber] = useState('');
  const [resendWaitSeconds, setResendWaitSeconds] = useState(60);
  const [loginMode, setLoginMode] = useState('driver');
  const [step, setStep] = useState('login');

  if (step === 'server') {
    return <ServerSettingsScreen onBack={() => setStep('login')} onSaved={() => setStep('login')} />;
  }

  if (step === 'otp') {
    return (
      <OtpScreen
        mobileNumber={mobileNumber}
        resendWaitSeconds={resendWaitSeconds}
        loginMode={loginMode}
        onChangeNumber={() => setStep('login')}
        onVerified={(page) => onAuthenticated(mobileNumber, page)}
      />
    );
  }

  return (
    <LoginScreen
      initialMobileNumber={mobileNumber}
      onOpenServer={() => setStep('server')}
      onOtpRequested={(number, secondsUntilResend, mode) => {
        setMobileNumber(number);
        setResendWaitSeconds(secondsUntilResend);
        setLoginMode(mode || 'driver');
        setStep('otp');
      }}
    />
  );
}
