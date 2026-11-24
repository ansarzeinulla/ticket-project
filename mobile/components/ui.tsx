import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { radius, theme } from "../lib/theme";

/**
 * The building blocks every non-scanner screen is made of. Labels are real
 * accessibility labels, so a screen reader names each control (WCAG) and the
 * screens can be driven by label in tests.
 */

export function Screen({
  children,
  refreshing = false,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.heading} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Card({
  children,
  onPress,
  testID,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  small = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  testID?: string;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variantStyles[variant],
        inactive && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? theme.bg : theme.text} />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, variant === "primary" && styles.buttonTextPrimary]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  error,
  hint,
  placeholder,
  secure = false,
  multiline = false,
  keyboardType,
  autoCapitalize = "sentences",
  editable = true,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        secureTextEntry={secure}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        testID={testID}
        style={[styles.input, multiline && styles.inputMultiline, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A small set of options as tappable chips - a select that suits a thumb. */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  hint,
}: {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
}) {
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={option.label}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Check({
  label,
  hint,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      style={styles.check}
    >
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: theme.brandDark, false: theme.border }}
        thumbColor={value ? theme.brand : theme.textMuted}
      />
      <View style={styles.checkText}>
        <Text style={styles.checkLabel}>{label}</Text>
        {hint ? <Text style={styles.checkHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

type Tone = "info" | "error" | "success" | "warning";

export function Banner({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <View style={[styles.banner, bannerStyles[tone]]} accessibilityRole="alert">
      {title ? <Text style={styles.bannerTitle}>{title}</Text> : null}
      {children ? <Text style={styles.bannerText}>{children}</Text> : null}
    </View>
  );
}

export function Badge({ text, tone = "info" }: { text: string; tone?: Tone | "muted" }) {
  return (
    <View style={[styles.badge, tone === "muted" ? styles.badgeMuted : bannerStyles[tone]]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

export function Stat({ label, value, detail, testID }: { label: string; value: string; detail?: string; testID?: string }) {
  return (
    <View style={styles.stat} testID={testID}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {detail ? <Text style={styles.hint}>{detail}</Text> : null}
    </View>
  );
}

export function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.muted}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.body}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.brand} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.muted}>{children}</Text>
    </View>
  );
}

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: theme.brand, borderColor: theme.brand },
  secondary: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
  danger: { backgroundColor: theme.danger, borderColor: theme.danger },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
});

const bannerStyles = StyleSheet.create({
  info: { backgroundColor: "#12324a", borderColor: "#1e4f73" },
  error: { backgroundColor: "#3b1416", borderColor: theme.danger },
  success: { backgroundColor: "#11331f", borderColor: theme.success },
  warning: { backgroundColor: "#3a2a10", borderColor: theme.warning },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  screenContent: { padding: 16, gap: 12, paddingBottom: 48 },
  title: { color: theme.text, fontSize: 24, fontWeight: "700" },
  heading: { color: theme.text, fontSize: 18, fontWeight: "600", marginTop: 8 },
  body: { color: theme.text, fontSize: 15, lineHeight: 21 },
  muted: { color: theme.textMuted, fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
  },
  pressed: { opacity: 0.75 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  button: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: 12 },
  buttonText: { color: theme.text, fontSize: 15, fontWeight: "600", textAlign: "center" },
  buttonTextSmall: { fontSize: 13 },
  buttonTextPrimary: { color: theme.bg },
  disabled: { opacity: 0.5 },
  field: { gap: 6 },
  label: { color: theme.text, fontSize: 14, fontWeight: "500" },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: theme.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  inputError: { borderColor: theme.dangerBright },
  error: { color: theme.dangerBright, fontSize: 12 },
  hint: { color: theme.textMuted, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: theme.surfaceAlt,
  },
  chipActive: { backgroundColor: theme.brandDark, borderColor: theme.brand },
  chipText: { color: theme.textMuted, fontSize: 13 },
  chipTextActive: { color: theme.text, fontWeight: "600" },
  check: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkText: { flexShrink: 1, gap: 2 },
  checkLabel: { color: theme.text, fontSize: 14 },
  checkHint: { color: theme.textMuted, fontSize: 12 },
  banner: { borderWidth: 1, borderRadius: radius.sm, padding: 12, gap: 4 },
  bannerTitle: { color: theme.text, fontWeight: "700", fontSize: 14 },
  bannerText: { color: theme.text, fontSize: 13, lineHeight: 18 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  badgeMuted: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
  badgeText: { color: theme.text, fontSize: 12 },
  stat: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    gap: 2,
    flexGrow: 1,
    flexBasis: "45%",
  },
  statValue: { color: theme.text, fontSize: 22, fontWeight: "700" },
  kv: { gap: 2, flexBasis: "45%", flexGrow: 1 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  empty: {
    borderColor: theme.border,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: 18,
    alignItems: "center",
  },
});
