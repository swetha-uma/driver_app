import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  clearDriverSession,
  loadDriverSession,
  saveDriverSession,
} from '../features/auth/sessionStorage';
import { loadApiBase } from '../features/settings/backendUrl';
import { logoutDriver } from '../services/loginApi';
import { colors } from '../theme/colors';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

/** Shows login until the code is accepted, then the temporary home screen. */
export default function AppNavigator() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (bootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.canvas,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <MainNavigator
        phone={phone}
        verifiedPage={verifiedPage}
        onLogout={() => {
          const token = verifiedPage?.token;
          // Why: clear Redis session on the server, then drop the phone copy
          (async () => {
            try {
              await logoutDriver(token);
            } catch {
              // Why: still leave the app even if the network call fails
            }
            await clearDriverSession().catch(() => undefined);
            setPhone('');
            setVerifiedPage(null);
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
        setIsAuthenticated(true);
      }}
    />
  );
}
