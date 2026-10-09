import React from 'react';
import {
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
} from 'react-native';
export const colors = {
  paper: '#F3F0E8',
  ink: '#242B26',
  muted: '#656B63',
  green: '#274E3B',
  line: '#C8CBBF',
  error: '#953C2F',
};
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 90, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 16, color: colors.muted, lineHeight: 24 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    color: colors.green,
    fontWeight: '700',
  },
  label: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.green,
    borderRadius: 3,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonText: { color: colors.paper, fontSize: 15, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
  rule: { height: 1, backgroundColor: colors.line },
  chip: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
  },
  selected: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.ink, fontSize: 13 },
  selectedText: { color: colors.paper },
});
