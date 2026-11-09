import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import {
  clearDriverSession,
  loadDriverSession,
  saveDriverSession,
} from '../features/auth/sessionStorage';
import { loadApiBase } from '../features/settings/backendUrl';
import { runDriverNativePermissionSetupSequence } from '../features/settings/frontend/services/driverGatewayDeviceSetup';
import {
  clearDriverDeviceSetupComplete,
  isDriverDeviceSetupComplete,
  markDriverDeviceSetupComplete,
} from '../features/settings/frontend/storage/driverDeviceSetupStorage';
import { stopDriverVanGpsPublishing } from '../features/settings/frontend/services/driverVanLocationPublisher';
import { stopBlePhoneScan } from '../features/settings/frontend/services/blePhoneScannerService';
import { logoutDriver } from '../services/loginApi';
import { colors } from '../theme/colors';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

/**
 * Run Location → Bluetooth → background system dialogs, then mark complete.
 * Why: Home must wait until these small Deny/Allow prompts finish.
 */
async function askNativeGatewayPermissionsBeforeHome() {
  try {
    const alreadyAsked = await isDriverDeviceSetupComplete();
    if (alreadyAsked) return;
    await runDriverNativePermissionSetupSequence();
  } catch {
    // Why: deny/fail must not trap the driver — still open Home after dialogs.
  } finally {
    await markDriverDeviceSetupComplete().catch(() => undefined);
  }
}

/** Simple waiting canvas while OS permission dialogs are on screen (not Home, not full setup UI). */
function PermissionAskGate({ message }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.canvas,
        paddingHorizontal: 28,
        gap: 14,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{
          textAlign: 'center',
          color: colors.textSecondary,
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

/** Login → wait for system permission dialogs → Home. */
export default function AppNavigator() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPermissionGateDone, setIsPermissionGateDone] = useState(false);
  const [phone, setPhone] = useState('');
  const [verifiedPage, setVerifiedPage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadApiBase();
      const saved = await loadDriverSession();
      if (!saved) {
        if (!cancelled) setBootstrapping(false);
        return;
      }

      if (cancelled) return;
      setPhone(saved.phone);
      setVerifiedPage(saved.verifiedPage);
      setIsAuthenticated(true);
      setBootstrapping(false);

      // Why: restored session still waits for dialogs if never asked on this phone.
      await askNativeGatewayPermissionsBeforeHome();
      if (!cancelled) setIsPermissionGateDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (bootstrapping) {
    return <PermissionAskGate message="Starting…" />;
  }

  if (isAuthenticated && !isPermissionGateDone) {
    // Why: stay here (not Home) until Location / Bluetooth / background dialogs finish.
    return (
      <PermissionAskGate message="Allow Location, Bluetooth, and background when your phone asks…" />
    );
  }

  if (isAuthenticated) {
    return (
      <MainNavigator
        phone={phone}
        verifiedPage={verifiedPage}
        onLogout={() => {
          const token = verifiedPage?.token;
          (async () => {
            try {
              await logoutDriver(token);
            } catch {
              // Why: still leave the app even if the network call fails
            }
            stopBlePhoneScan();
            stopDriverVanGpsPublishing();
            await clearDriverDeviceSetupComplete();
            await clearDriverSession().catch(() => undefined);
            setPhone('');
            setVerifiedPage(null);
            setIsPermissionGateDone(false);
            setIsAuthenticated(false);
          })();
        }}
      />
    );
  }

  return (
    <AuthNavigator
      onAuthenticated={(number, page) => {
        saveDriverSession(number, page).catch(() => undefined);
        setPhone(number);
        setVerifiedPage(page);
        setIsPermissionGateDone(false);
        setIsAuthenticated(true);
        // Why: ask system dialogs before Home — do not open MainNavigator yet.
        (async () => {
          await askNativeGatewayPermissionsBeforeHome();
          setIsPermissionGateDone(true);
        })();
      }}
    />
  );
}
