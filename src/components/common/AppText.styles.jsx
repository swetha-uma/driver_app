import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default StyleSheet.create({
  display: {
    ...typography.display,
    color: colors.textPrimary,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  button: {
    ...typography.button,
    color: colors.white,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  tab: {
    ...typography.tab,
    color: colors.textSecondary,
  },
});
