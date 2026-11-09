import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import BleBackgroundScanSection from '../components/BleBackgroundScanSection';
import BlePrimaryButton from '../components/BlePrimaryButton';
import BleScreenHeader from '../components/BleScreenHeader';
import BleZoneSourceSection from '../components/BleZoneSourceSection';
import {
  DEFAULT_BLE_CAPTURE_PATH,
  DEFAULT_BLE_EXIT_TIMEOUT_MS,
  DEFAULT_BLE_MIN_RSSI,
  DEFAULT_BLE_PRESENT_INTERVAL_MS,
} from '../constants/bleGatewayDefaults';
import { testBleSchoolServerHealth } from '../services/bleCaptureUploadApi';
import {
  loadBleGatewaySettings,
  saveBleGatewaySettings,
} from '../storage/bleGatewaySettingsStorage';
import { bleUiColors, bleUiRadii, bleUiShadows } from '../theme/bleUiColors';
import { normalizeBleApiBaseUrl } from '../utils/bleApiUrlHelpers';
import {
  formatBleMacAddressList,
  normalizeBleMacAddress,
  parseBleMacAddressList,
} from '../utils/bleIdentifierHelpers';

/**
 * Gateway settings form — professional driver-theme page from Devices → Settings.
 */
export default function BleGatewayConfigScreen({ onClose, onSaved }) {
  // Why: hub already applies safe-area padding when this screen is shown full-page.
  const [gatewaySettingsForm, setGatewaySettingsForm] = useState(null);
  const [zoneCardMacText, setZoneCardMacText] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [apiHealthMessage, setApiHealthMessage] = useState('');
  const [isApiHealthOk, setIsApiHealthOk] = useState(null);
  const [isTestingApiHealth, setIsTestingApiHealth] = useState(false);

  useEffect(() => {
    loadBleGatewaySettings().then((loadedSettings) => {
      setGatewaySettingsForm(loadedSettings);
      setZoneCardMacText(formatBleMacAddressList(loadedSettings.zoneCardMacs));
    });
  }, []);

  if (!gatewaySettingsForm) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  const updateGatewaySettingsField = (fieldName, fieldValue) => {
    setGatewaySettingsForm((previousForm) =>
      previousForm ? { ...previousForm, [fieldName]: fieldValue } : previousForm,
    );
  };

  const onTestBleApiHealth = async () => {
    setIsTestingApiHealth(true);
    setApiHealthMessage('');
    setIsApiHealthOk(null);
    const healthResult = await testBleSchoolServerHealth(gatewaySettingsForm.apiBaseUrl);
    setIsApiHealthOk(healthResult.ok);
    setApiHealthMessage(healthResult.message);
    setIsTestingApiHealth(false);
  };

  const onSaveBleGatewaySettings = async () => {
    const rawGmacText = String(gatewaySettingsForm.gmac || '').trim();
    const normalizedGmac = rawGmacText ? normalizeBleMacAddress(gatewaySettingsForm.gmac) : '';
    if (rawGmacText && !normalizedGmac) {
      setFormErrorMessage(
        'GMAC must be a valid MAC (e.g. 0C:DC:7E:51:58:40) from an existing School Zone or Vehicle.',
      );
      return;
    }
    const parsedZoneCardList = parseBleMacAddressList(zoneCardMacText);
    const followsSeveralZoneCards =
      gatewaySettingsForm.zoneSource === 'zoneCard' && gatewaySettingsForm.zoneMode === 'multi';
    if (followsSeveralZoneCards && parsedZoneCardList.invalidEntries.length > 0) {
      setFormErrorMessage(`Invalid zone card MAC: ${parsedZoneCardList.invalidEntries.join(', ')}`);
      return;
    }
    if (followsSeveralZoneCards && parsedZoneCardList.macs.length === 0) {
      setFormErrorMessage('Add at least one zone card MAC for several-zone mode.');
      return;
    }
    if (!normalizeBleApiBaseUrl(gatewaySettingsForm.apiBaseUrl)) {
      setFormErrorMessage('API Base URL is required.');
      return;
    }

    const nextGatewaySettings = {
      ...gatewaySettingsForm,
      gmac: normalizedGmac || '',
      zoneCardMacs: parsedZoneCardList.macs,
      apiBaseUrl: normalizeBleApiBaseUrl(gatewaySettingsForm.apiBaseUrl),
      capturePath: String(gatewaySettingsForm.capturePath || '').trim() || DEFAULT_BLE_CAPTURE_PATH,
    };
    await saveBleGatewaySettings(nextGatewaySettings);
    onSaved(nextGatewaySettings);
    onClose();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.screen}>
        {/* Why: light Gateway settings form with Close returning to Devices tabs. */}
        <BleScreenHeader title="Gateway settings" actionLabel="Close" onAction={onClose} />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          bounces
        >
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Server</Text>
            <Text style={styles.hint}>
              This phone can be the zone gateway itself, or follow zone ID cards. Card mapping stays
              in admin — this app scans and posts captures.
            </Text>

            <Text style={styles.label}>API Base URL</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              value={gatewaySettingsForm.apiBaseUrl}
              onChangeText={(value) => updateGatewaySettingsField('apiBaseUrl', value)}
              placeholder="http://192.168.1.10:8080"
              placeholderTextColor={bleUiColors.textFaint}
            />
            <Text style={styles.fieldHint}>
              Real phone: PC LAN IP (e.g. http://192.168.1.10:8080). Emulator: http://10.0.2.2:8080.
            </Text>
            <View style={styles.testWrap}>
              <BlePrimaryButton
                label={isTestingApiHealth ? 'Testing…' : 'Test API connection'}
                variant="primary"
                onPress={onTestBleApiHealth}
              />
            </View>
            {apiHealthMessage ? (
              <Text
                style={[
                  styles.fieldHint,
                  {
                    color: isApiHealthOk ? bleUiColors.success : bleUiColors.danger,
                    marginTop: 6,
                    fontWeight: '600',
                  },
                ]}
              >
                {apiHealthMessage}
              </Text>
            ) : null}

            <Text style={styles.label}>Capture path</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={gatewaySettingsForm.capturePath}
              onChangeText={(value) => updateGatewaySettingsField('capturePath', value)}
              placeholder="/api/ble_capture"
              placeholderTextColor={bleUiColors.textFaint}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Van gateway</Text>
            <BleZoneSourceSection
              zoneSource={gatewaySettingsForm.zoneSource}
              zoneMode={gatewaySettingsForm.zoneMode}
              gmac={gatewaySettingsForm.gmac}
              zoneCardText={zoneCardMacText}
              inputStyle={styles.input}
              onZoneSourceChange={(value) => updateGatewaySettingsField('zoneSource', value)}
              onZoneModeChange={(value) => updateGatewaySettingsField('zoneMode', value)}
              onGmacChange={(value) => updateGatewaySettingsField('gmac', value)}
              onZoneCardTextChange={setZoneCardMacText}
            />

            <Text style={styles.label}>Gateway_ID</Text>
            <TextInput
              style={styles.input}
              value={gatewaySettingsForm.gatewayId}
              onChangeText={(value) => updateGatewaySettingsField('gatewayId', value)}
              placeholder="PHONE_LOCAL"
              placeholderTextColor={bleUiColors.textFaint}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Scan tuning</Text>
            <Text style={styles.label}>Min RSSI</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(gatewaySettingsForm.minRssi)}
              onChangeText={(value) =>
                updateGatewaySettingsField('minRssi', Number(value) || DEFAULT_BLE_MIN_RSSI)
              }
            />

            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.label}>Present interval (ms)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(gatewaySettingsForm.presentIntervalMs)}
                  onChangeText={(value) =>
                    updateGatewaySettingsField(
                      'presentIntervalMs',
                      Number(value) || DEFAULT_BLE_PRESENT_INTERVAL_MS,
                    )
                  }
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Exit silence (ms)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(gatewaySettingsForm.exitTimeoutMs)}
                  onChangeText={(value) =>
                    updateGatewaySettingsField(
                      'exitTimeoutMs',
                      Number(value) || DEFAULT_BLE_EXIT_TIMEOUT_MS,
                    )
                  }
                />
              </View>
            </View>
            <Text style={styles.fieldHint}>
              ENTER and PRESENT post to /api/ble_capture. EXIT stays on the phone.
            </Text>

            <View style={styles.row}>
              <Text style={[styles.label, styles.switchLabel]}>Unfiltered debug mode</Text>
              <Switch
                value={gatewaySettingsForm.unfilteredDebugMode}
                onValueChange={(value) =>
                  updateGatewaySettingsField('unfilteredDebugMode', value)
                }
                trackColor={{ false: bleUiColors.borderStrong, true: bleUiColors.primary }}
                thumbColor={bleUiColors.bgElevated}
              />
            </View>
            <Text style={styles.fieldHint}>
              Off: ID cards only. On: every BLE device (debug). Server still maps attendance.
            </Text>

            <BleBackgroundScanSection />
          </View>

          {formErrorMessage ? <Text style={styles.error}>{formErrorMessage}</Text> : null}

          <View style={styles.saveActions}>
            <BlePrimaryButton label="Save" variant="primary" onPress={onSaveBleGatewaySettings} />
            <BlePrimaryButton label="Cancel" variant="danger" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: bleUiColors.bg, paddingHorizontal: 16, paddingTop: 8 },
  loading: { color: bleUiColors.textMuted, fontSize: 15, marginTop: 20 },
  scrollContent: { paddingBottom: 48, gap: 14, paddingTop: 12, flexGrow: 1 },
  sectionCard: {
    backgroundColor: bleUiColors.bgElevated,
    borderRadius: bleUiRadii.lg,
    borderWidth: 1,
    borderColor: bleUiColors.border,
    padding: 16,
    gap: 4,
    ...bleUiShadows.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: bleUiColors.text,
    marginBottom: 4,
  },
  hint: { color: bleUiColors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  label: { fontWeight: '600', color: bleUiColors.textSecondary, marginTop: 10, fontSize: 13 },
  fieldHint: { color: bleUiColors.textMuted, marginTop: 4, fontSize: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: bleUiColors.border,
    backgroundColor: bleUiColors.bg,
    borderRadius: bleUiRadii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    color: bleUiColors.text,
    fontSize: 15,
  },
  testWrap: { marginTop: 10 },
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, minWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  switchLabel: { flex: 1, marginTop: 0 },
  error: { color: bleUiColors.danger, marginTop: 4, fontSize: 13, fontWeight: '600' },
  saveActions: { marginTop: 4, gap: 10 },
});
