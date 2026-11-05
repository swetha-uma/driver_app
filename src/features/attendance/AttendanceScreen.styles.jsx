import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radii, shadows } from '../../theme/theme';

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  loading: {
    marginHorizontal: spacing.md,
  },
  header: {
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    ...shadows.hero,
  },
  headerGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.heroCircle,
    top: -100,
    right: -44,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  headerTitle: {
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.heroBadge,
    borderWidth: 1,
    borderColor: colors.heroBadgeBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.heroBadge,
    borderWidth: 1,
    borderColor: colors.heroBadgeBorder,
  },
  avatar: {
    width: spacing.xl + spacing.sm,
    height: spacing.xl + spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  studentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  studentName: {
    fontWeight: '700',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  switchLabel: {
    fontWeight: '700',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  monthButton: {
    width: spacing.xl + spacing.sm,
    height: spacing.xl + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  monthButtonPressed: {
    backgroundColor: colors.border,
    transform: [{ scale: 0.96 }],
  },
  monthTitle: {
    color: colors.textPrimary,
  },
  summaryCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressRing: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 10,
    borderRadius: 52,
    borderColor: colors.primarySoft,
  },
  ringClipRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 52,
    height: 104,
    overflow: 'hidden',
  },
  ringClipLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 52,
    height: 104,
    overflow: 'hidden',
  },
  ringSpinner: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 10,
    borderColor: 'transparent',
    borderTopColor: colors.success,
    borderRightColor: colors.success,
  },
  ringSpinnerRight: {
    left: -52,
  },
  ringSpinnerLeft: {
    left: 0,
  },
  progressCenter: {
    position: 'absolute',
    top: 13,
    left: 13,
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 39,
    backgroundColor: colors.surface,
  },
  percentage: {
    color: colors.textPrimary,
  },
  summaryCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  summaryCounts: {
    flexShrink: 1,
  },
  summaryPills: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  summaryPill: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  pillValue: {
    fontWeight: '700',
    textAlign: 'center',
  },
  pillLabel: {
    textAlign: 'center',
  },
  pillPresent: {
    backgroundColor: colors.successBg,
  },
  pillAbsent: {
    backgroundColor: colors.errorBg,
  },
  pillLate: {
    backgroundColor: colors.warningBg,
  },
  pillTextPresent: {
    color: colors.successText,
  },
  pillTextAbsent: {
    color: colors.errorText,
  },
  pillTextLate: {
    color: colors.warningText,
  },
  pillHalfDay: {
    backgroundColor: colors.infoBg,
  },
  pillTextHalfDay: {
    color: colors.infoText,
  },
  pillLeave: {
    backgroundColor: colors.holidayBg,
  },
  pillTextLeave: {
    color: colors.holiday,
  },
  calendarCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayText: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  dayPresent: {
    backgroundColor: colors.successBg,
  },
  dayAbsent: {
    backgroundColor: colors.errorBg,
  },
  dayLate: {
    backgroundColor: colors.warningBg,
  },
  dayHalfDay: {
    backgroundColor: colors.infoBg,
  },
  dayLeave: {
    backgroundColor: colors.holidayBg,
  },
  dayHoliday: {
    backgroundColor: colors.holidayBg,
  },
  dayWeekend: {
    backgroundColor: colors.neutralBg,
  },
  daySelected: {
    borderColor: colors.primary,
  },
  dayPressed: {
    opacity: 0.72,
  },
  legendDivider: {
    height: 1,
    marginTop: spacing.md,
    backgroundColor: colors.border,
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.md,
    rowGap: spacing.sm,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutralBg,
  },
  legendPresent: {
    backgroundColor: colors.success,
  },
  legendAbsent: {
    backgroundColor: colors.error,
  },
  legendLate: {
    backgroundColor: colors.warning,
  },
  legendHalfDay: {
    backgroundColor: colors.infoText,
  },
  legendLeave: {
    backgroundColor: colors.holiday,
  },
  legendHoliday: {
    backgroundColor: colors.holiday,
  },
  legendWeekend: {
    backgroundColor: colors.neutralText,
  },
  legendText: {
    color: colors.textSecondary,
  },
});
