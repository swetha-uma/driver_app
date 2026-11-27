import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import AppText from '../../../components/common/AppText';
import {
  markTeacherNotificationRead,
  remindTeacherNotificationLater,
} from '../api/teacherApi';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

/**
 * Bold late-salary warning phrases in notification copy.
 * Matches: "one more late day", "1-day salary", "2-day salary".
 */
function renderBoldHighlightText(text, baseStyle) {
  const source = String(text || '');
  const pattern = /(one more late day|one more day|one more may mean|\d+-day salary|\d+\s*-\s*days?\s+salary|\d+\s+days?\s+salary)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = pattern.exec(source)) != null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${key++}`} style={baseStyle}>
          {source.slice(lastIndex, match.index)}
        </Text>,
      );
    }
    parts.push(
          <Text key={`b-${key++}`} style={baseStyle}>
        {match[0]}
      </Text>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) {
    parts.push(
      <Text key={`t-${key++}`} style={baseStyle}>
        {source.slice(lastIndex)}
      </Text>,
    );
  }
  return parts.length > 0 ? parts : <Text style={baseStyle}>{source}</Text>;
}

/** Split status message and Remarks onto separate lines for the ack dialog. */
function splitAckBodyLines(body) {
  const text = String(body || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];
  const byNewline = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  // Why: older pushes glued "Remarks:" onto one line before backend newline fix
  const match = text.match(/^(.*?)\s+(Remarks?:\s*.+)$/i);
  if (match) {
    return [match[1].trim(), match[2].trim()].filter(Boolean);
  }
  return [text];
}

/**
 * Mark as read / Remind me later for action-required late & leave pushes.
 * Why: approve/submit pushes skip this dialog (actionRequired=false).
 * Closes only via Mark as read or Remind me later (not Back / backdrop).
 */
export default function TeacherNotificationAckDialog({ // KAN-28 | Teacher App Module Requirement | Created by Swetha on 18 Nov 2026 | Staff late reason, leave, push ack dialog, and payroll late/leave review.
  visible,
  teacherToken,
  notification,
  onDone,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!visible || !notification) return null;

  // Why: line 1 = status message; line 2+ = Remarks (also split old single-line bodies)
  const lines = splitAckBodyLines(notification.body);
  const primaryLine = lines[0] || 'Please review this update.';
  const detailLines = lines.slice(1);

  async function onMarkRead() {
    if (!teacherToken || !notification.notificationId) {
      onDone?.({ markedRead: true, notificationId: notification?.notificationId });
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Why: stop job + popup for this inbox row (late / leave / LOP — all types)
      await markTeacherNotificationRead(teacherToken, notification.notificationId);
      onDone?.({ markedRead: true, notificationId: notification.notificationId });
    } catch (e) {
      setError(e?.message || 'Could not mark as read');
    } finally {
      setBusy(false);
    }
  }

  async function onRemindLater() {
    if (!teacherToken || !notification.notificationId) {
      onDone?.({ markedRead: false, notificationId: notification?.notificationId });
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Why: schedule next FCM from teacher_app_device interval minutes
      await remindTeacherNotificationLater(teacherToken, notification.notificationId);
      onDone?.({ markedRead: false, notificationId: notification.notificationId });
    } catch (e) {
      setError(e?.message || 'Could not set reminder');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Why: Android Back must not dismiss — only Mark as read / Remind me later
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppText style={styles.title}>
            {notification.title || 'Notification'}
          </AppText>
          <Text style={styles.body}>{renderBoldHighlightText(primaryLine, styles.body)}</Text>
          {detailLines.length > 0 ? (
            <View style={styles.metaBlock}>
              {detailLines.map((line) => (
                <Text key={line} style={styles.metaLine}>
                  {renderBoldHighlightText(line, styles.metaLine)}
                </Text>
              ))}
            </View>
          ) : null}
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          {busy ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                onPress={onMarkRead}
                accessibilityRole="button"
              >
                <AppText style={styles.btnPrimaryText}>Mark as read</AppText>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnSecondary]}
                onPress={onRemindLater}
                accessibilityRole="button"
              >
                <AppText style={styles.btnSecondaryText}>Remind me later</AppText>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  metaBlock: {
    marginTop: spacing.sm,
    gap: 4,
  },
  metaLine: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  error: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: 13,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  btn: {
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnSecondary: {
    backgroundColor: colors.primarySoft,
  },
  btnSecondaryText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
});
