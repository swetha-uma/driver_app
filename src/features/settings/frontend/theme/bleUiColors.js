import { colors } from '../../../../theme/colors';
import { radii, shadows } from '../../../../theme/theme';

/**
 * BLE UI tokens — locked to the main driver app theme.
 * Why: Gateway / Scanner / Settings must feel like Home and Server, not a separate dark BLE app.
 */
export const bleUiColors = {
  bg: colors.canvas,
  bgElevated: colors.surface,
  bgHeader: colors.surface,
  border: colors.border,
  borderStrong: '#C5D2F0',
  text: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
  textFaint: '#8A94AD',
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  buttonEnd: colors.buttonEnd,
  primarySoft: colors.primarySoft,
  accentSoft: colors.primarySoft,
  success: colors.success,
  successBg: colors.successBg,
  successText: colors.successText,
  danger: colors.error,
  dangerBg: colors.errorBg,
  dangerText: colors.errorText,
  warning: colors.warning,
  warningBg: colors.warningBg,
  warningText: colors.warningText,
  rowDivider: colors.border,
  onPrimary: colors.white,
  infoBg: colors.infoBg,
  infoText: colors.infoText,
  heroTop: colors.heroTop,
  heroEnd: colors.heroEnd,
};

export const bleUiRadii = radii;
export const bleUiShadows = shadows;
