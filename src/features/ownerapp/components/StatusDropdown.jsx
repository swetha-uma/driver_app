import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/common/AppText';
import { colors } from '../../../theme/colors';
import { radii, shadows } from '../../../theme/theme';
import { spacing } from '../../../theme/spacing';

const OPTIONS = [
  { id: 'all', label: 'All statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

/** Single status dropdown (All / Pending / Approved / Rejected) — opens anchored right below itself. */
export default function StatusDropdown({ value, onChange }) {
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const fieldRef = useRef(null);
  const current = OPTIONS.find((o) => o.id === value) || OPTIONS[0];

  const open = () => {
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y: y + height, width });
      setVisible(true);
    });
  };

  return (
    <>
      <Pressable ref={fieldRef} style={styles.field} onPress={open}>
        <Ionicons name="funnel-outline" size={16} color={colors.textSecondary} />
        <AppText variant="body" style={{ flex: 1 }}>{current.label}</AppText>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)}>
          {anchor ? (
            <View style={[styles.panel, { top: anchor.y, left: anchor.x, minWidth: anchor.width }]}>
              {OPTIONS.map((opt) => {
                const selected = opt.id === value;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      onChange(opt.id);
                      setVisible(false);
                    }}
                  >
                    <AppText variant="body" color={selected ? colors.primary : colors.textPrimary} style={{ fontWeight: selected ? '700' : '400' }}>
                      {opt.label}
                    </AppText>
                    {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  panel: {
    position: 'absolute',
    marginTop: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.hero,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  optionSelected: { backgroundColor: colors.primarySoft },
});
