import { StyleSheet, View } from 'react-native';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

function formatMoney(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Salary head breakdown (basic, HRA, allowances, …) for one staff member's salary structure. */
export default function StaffSalaryList({ lines, totalGross, loading, title = 'Salary heads' }) {
  if (loading) {
    return (
      <View style={styles.card}>
        <AppText variant="body" color={colors.textSecondary}>Loading salary heads…</AppText>
      </View>
    );
  }

  if (!lines || !lines.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="label" style={{ marginLeft: spacing.xs }}>{title}</AppText>
      <View style={styles.card}>
        {lines.map((line, index) => (
          <View key={`${line.componentName}-${index}`} style={[styles.row, index === lines.length - 1 && !totalGross && styles.rowLast]}>
            <AppText variant="body" color={colors.textSecondary}>{line.componentName}</AppText>
            <AppText variant="body" style={{ fontWeight: '700' }}>{formatMoney(line.amount)}</AppText>
          </View>
        ))}
        {totalGross != null ? (
          <View style={[styles.row, styles.rowLast, styles.totalRow]}>
            <AppText variant="body" style={{ fontWeight: '700' }}>Monthly gross</AppText>
            <AppText variant="body" style={{ fontWeight: '700', color: colors.primary }}>
              {formatMoney(totalGross)}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  totalRow: { paddingTop: spacing.xs },
});
