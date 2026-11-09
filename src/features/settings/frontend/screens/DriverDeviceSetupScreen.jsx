import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BlePrimaryButton from '../components/BlePrimaryButton';
import {
  DRIVER_SETUP_STEPS,
  getDriverGatewayDeviceSetupStatus,
  runDriverNativePermissionSetupSequence,
} from '../services/driverGatewayDeviceSetup';
import { markDriverDeviceSetupComplete } from '../storage/driverDeviceSetupStorage';
import { bleUiColors, bleUiRadii } from '../theme/bleUiColors';

/**
 * Post-login setup: only native system Deny/Allow dialogs (Location → BT → background).
 * Why: when the driver taps Allow, Android turns that capability on (permission / BT / battery).
 */
export default function DriverDeviceSetupScreen({ onSetupFinished }) {
  const [setupStatus, setSetupStatus] = useState(null);
  const [activeStep, setActiveStep] = useState(DRIVER_SETUP_STEPS.LOCATION);
  const [isRequesting, setIsRequesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Your phone will ask Allow for Location, Bluetooth, then background scanning.',
  );
  const hasAutoStartedRef = useRef(false);

  const refreshSetupStatus = useCallback(async () => {
    const nextStatus = await getDriverGatewayDeviceSetupStatus();
    setSetupStatus(nextStatus);
    return nextStatus;
  }, []);

  const runNativeAskSequence = useCallback(async () => {
    setIsRequesting(true);
    try {
      await runDriverNativePermissionSetupSequence((step, message) => {
        setActiveStep(step);
        setStatusMessage(message);
      });
      await refreshSetupStatus();
    } catch {
      setStatusMessage('Could not finish permission asks. Tap Ask permissions again.');
    } finally {
      setIsRequesting(false);
    }
  }, [refreshSetupStatus]);

  useEffect(() => {
    // Why: start native dialogs automatically once after login — no custom permission cards.
    if (hasAutoStartedRef.current) return undefined;
    hasAutoStartedRef.current = true;
    const startTimer = setTimeout(() => {
      void runNativeAskSequence();
    }, 400);
    return () => clearTimeout(startTimer);
  }, [runNativeAskSequence]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      // Why: after Allow on system dialog / Location panel, refresh Ready ticks.
      if (nextAppState === 'active') refreshSetupStatus();
    });
    return () => appStateSubscription.remove();
  }, [refreshSetupStatus]);

  const finishSetupAndContinue = useCallback(async () => {
    await markDriverDeviceSetupComplete();
    onSetupFinished?.();
  }, [onSetupFinished]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Phone permissions</Text>
        <Text style={styles.subtitle}>
          Tap Allow on each system screen. Location, Bluetooth, and background scanning turn on when
          you allow them.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Now asking</Text>
          <Text style={styles.statusStep}>
            {activeStep === DRIVER_SETUP_STEPS.LOCATION
              ? '1 · Location'
              : activeStep === DRIVER_SETUP_STEPS.BLUETOOTH
                ? '2 · Bluetooth'
                : activeStep === DRIVER_SETUP_STEPS.BACKGROUND
                  ? '3 · Background scanning'
                  : 'Done'}
          </Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>

          <View style={styles.ticks}>
            <TickRow
              label="Location"
              ready={Boolean(setupStatus?.locationReady)}
              granted={Boolean(setupStatus?.locationPermissionGranted)}
            />
            <TickRow
              label="Bluetooth"
              ready={Boolean(setupStatus?.bluetoothReady)}
              granted={Boolean(setupStatus?.bluetoothPermissionGranted)}
            />
            <TickRow
              label="Background"
              ready={Boolean(setupStatus?.backgroundReady)}
              granted={Boolean(setupStatus?.backgroundReady)}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <BlePrimaryButton
            label={isRequesting ? 'Waiting for Allow…' : 'Ask permissions again'}
            variant="primary"
            onPress={runNativeAskSequence}
            loading={isRequesting}
            disabled={isRequesting}
          />
          <BlePrimaryButton
            label="Continue"
            variant="primary"
            onPress={finishSetupAndContinue}
            disabled={isRequesting}
          />
          <BlePrimaryButton
            label="Skip for now"
            variant="danger"
            onPress={finishSetupAndContinue}
            disabled={isRequesting}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function TickRow({ label, ready, granted }) {
  const text = ready ? 'On' : granted ? 'Allowed — turn radio ON if asked' : 'Needed';
  return (
    <View style={styles.tickRow}>
      <Text style={styles.tickLabel}>{label}</Text>
      <Text style={[styles.tickValue, ready ? styles.tickOn : styles.tickOff]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: bleUiColors.bg },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: bleUiColors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: bleUiColors.textSecondary,
  },
  statusCard: {
    backgroundColor: bleUiColors.bgElevated,
    borderRadius: bleUiRadii.lg,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    padding: 16,
    gap: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: bleUiColors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusStep: {
    fontSize: 18,
    fontWeight: '700',
    color: bleUiColors.text,
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: bleUiColors.primary,
    fontWeight: '600',
  },
  ticks: { marginTop: 8, gap: 8 },
  tickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tickLabel: { fontSize: 14, fontWeight: '600', color: bleUiColors.text },
  tickValue: { fontSize: 12, fontWeight: '700' },
  tickOn: { color: bleUiColors.successText },
  tickOff: { color: bleUiColors.warningText },
  actions: { marginTop: 'auto', gap: 10 },
});
