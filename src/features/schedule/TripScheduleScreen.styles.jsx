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
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    gap: spacing.sm,
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
    gap: spacing.sm,
  },
  headerTitle: {
    flexShrink: 1,
  },
  sectionTitle: {
    marginHorizontal: spacing.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionHint: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.xs,
  },
  cardList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  tripCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  tripCardMorning: {
    borderColor: colors.primary,
  },
  tripCardEvening: {
    borderColor: colors.secondary,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  typeBadgeEvening: {
    backgroundColor: colors.secondarySoft,
  },
  typeText: {
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  statusText: {
    fontWeight: '700',
  },
  routeName: {
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flex: 1,
    gap: spacing.xs,
  },
  metaValue: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stopPreview: {
    marginTop: spacing.xs,
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stopIndex: {
    width: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
  stopName: {
    flex: 1,
  },
  moreStops: {
    marginTop: spacing.xs,
  },
  viewStopsButton: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewStopsButtonPressed: {
    opacity: 0.85,
  },
  viewStopsLabel: {
    flex: 1,
  },
  // Why: loading and error need a centered full-screen layout
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    flex: 1,
  },
  statusTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statusText: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  // Why: empty day still needs a clear card instead of a blank list
  emptyCard: {
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  emptyTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
