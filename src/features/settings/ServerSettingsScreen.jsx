import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import AppText from '../../components/common/AppText';
import KeyboardAvoidingContainer from '../../components/layout/KeyboardAvoidingContainer';
import { colors } from '../../theme/colors';
import { clearDriverSession, loadDriverSession } from '../auth/sessionStorage';
import { logoutDriver } from '../../services/loginApi';
import { DEFAULT_API, getApiBase, saveApiBase } from './backendUrl';
import styles from './ServerSettingsScreen.styles';

/** Lets the driver point this install at a school server without a new build. */
export default function ServerSettingsScreen({ onBack, onSaved }) {
  const [url, setUrl] = useState(getApiBase());
  const [message, setMessage] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const show = (text, success) => {
    setMessage(text);
    setOk(success);
  };

  /** End the current server session before switching base URL. */
  const endSessionOnCurrentServer = async () => {
    const saved = await loadDriverSession();
    const token = saved?.verifiedPage?.token;
    try {
      await logoutDriver(token);
    } catch {
      // Why: URL change should still finish if logout request fails
    }
    await clearDriverSession();
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await endSessionOnCurrentServer();
      const saved = await saveApiBase(url);
      setUrl(saved);
      show('Saved. Sign in again on this server.', true);
      onSaved?.();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save the server', false);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await endSessionOnCurrentServer();
      const saved = await saveApiBase(DEFAULT_API);
      setUrl(saved);
      show('Reset to the default server. Sign in again.', true);
      onSaved?.();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not reset the server', false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingContainer contentContainerStyle={[styles.screen, styles.content]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <AppText variant="heading">Server</AppText>
      </View>
      <AppText variant="body" color={colors.textSecondary} style={styles.note}>
        This is the school server the app talks to. Changing it signs you out. Login APIs will use
        this later.
      </AppText>
      <AppInput
        label="Backend URL"
        value={url}
        onChangeText={setUrl}
        placeholder="http://192.168.1.20:8080"
        helperText="Use the server address only, such as http://192.168.1.20:8080"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Backend URL"
      />
      {message ? (
        <AppText variant="body" color={ok ? colors.successText : colors.error}>
          {message}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <AppButton title={busy ? 'Please wait' : 'Save'} onPress={handleSave} disabled={busy} />
        <AppButton title="Reset to default" onPress={handleReset} disabled={busy} variant="outline" />
      </View>
    </KeyboardAvoidingContainer>
  );
}
