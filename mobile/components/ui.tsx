import { useState, type ReactNode } from "react";
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
  onEndReached,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Called when the visitor scrolls near the bottom, to load the next page. */
  onEndReached?: () => void;
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={200}
      onScroll={
        onEndReached
          ? ({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) onEndReached();
            }
          : undefined
      }
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

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";

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
        <Text
          style={[
            styles.buttonText,
            small && styles.buttonTextSmall,
            (variant === "primary" || variant === "danger") && styles.buttonTextPrimary,
            (variant === "outline" || variant === "ghost") && styles.buttonTextBrand,
          ]}
        >
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && styles.inputLocked,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
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

/**
 * A white card of tappable rows, like a phone's settings screen (BF-100): a
 * title above, rows split by hairlines, a chevron on the right.
 */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={listStyles.group}>
      {title ? <Text style={listStyles.groupTitle}>{title}</Text> : null}
      <View style={listStyles.card}>{children}</View>
    </View>
  );
}

export function ListRow({
  label,
  icon,
  detail,
  onPress,
  danger = false,
  last = false,
  testID,
}: {
  label: string;
  icon?: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [listStyles.row, !last && listStyles.rowDivider, pressed && listStyles.rowPressed]}
    >
      {icon ? <Text style={[listStyles.icon, danger && listStyles.danger]}>{icon}</Text> : null}
      <View style={listStyles.rowText}>
        <Text style={[listStyles.label, danger && listStyles.danger]}>{label}</Text>
        {detail ? <Text style={listStyles.detail}>{detail}</Text> : null}
      </View>
      {danger ? null : <Text style={listStyles.chevron}>›</Text>}
    </Pressable>
  );
}

/**
 * Six boxes for a 6-digit code (BF-100). One hidden input holds the digits, so
 * the keyboard, paste and the phone's one-time-code autofill all just work;
 * the boxes only show them.
 */
export function CodeInput({
  value,
  onChange,
  label,
  invalid = false,
  disabled = false,
  testID = "code-input",
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  return (
    <View style={codeStyles.wrap}>
      <View style={codeStyles.boxes} pointerEvents="none">
        {digits.map((digit, i) => (
          <View
            key={i}
            style={[
              codeStyles.box,
              focused && i === Math.min(value.length, 5) && codeStyles.boxActive,
              invalid && codeStyles.boxInvalid,
            ]}
          >
            <Text style={codeStyles.digit}>{digit}</Text>
          </View>
        ))}
      </View>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        editable={!disabled}
        caretHidden
        accessibilityLabel={label}
        testID={testID}
        style={codeStyles.hidden}
      />
    </View>
  );
}

const listStyles = StyleSheet.create({
  group: { gap: 8 },
  groupTitle: { color: theme.textMuted, fontSize: 13, fontWeight: "600", paddingHorizontal: 4 },
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  rowPressed: { backgroundColor: theme.surfaceAlt },
  icon: { width: 22, textAlign: "center", fontSize: 16, color: theme.textMuted },
  rowText: { flex: 1, gap: 2 },
  label: { color: theme.text, fontSize: 15, fontWeight: "500" },
  detail: { color: theme.textMuted, fontSize: 12 },
  chevron: { color: theme.textMuted, fontSize: 22, lineHeight: 22 },
  danger: { color: theme.danger },
});

const codeStyles = StyleSheet.create({
  wrap: { position: "relative", alignSelf: "flex-start" },
  boxes: { flexDirection: "row", gap: 8 },
  box: {
    width: 46,
    height: 56,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: theme.brand, borderWidth: 2 },
  boxInvalid: { borderColor: theme.danger },
  digit: { color: theme.text, fontSize: 24, fontWeight: "700" },
  hidden: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: "transparent" },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: theme.brand, borderColor: theme.brand },
  secondary: { backgroundColor: theme.surface, borderColor: theme.border },
  outline: { backgroundColor: theme.surface, borderColor: theme.brand },
  danger: { backgroundColor: theme.danger, borderColor: theme.danger },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
});

const bannerStyles = StyleSheet.create({
  info: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
  error: { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
  success: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  warning: { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
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
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  pressed: { opacity: 0.75 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: 12 },
  buttonText: { color: theme.text, fontSize: 15, fontWeight: "600", textAlign: "center" },
  buttonTextSmall: { fontSize: 13 },
  buttonTextPrimary: { color: "#ffffff" },
  buttonTextBrand: { color: theme.brand },
  disabled: { opacity: 0.5 },
  field: { gap: 6 },
  label: { color: theme.text, fontSize: 14, fontWeight: "500" },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: theme.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: { borderColor: theme.brand },
  inputLocked: { backgroundColor: theme.surfaceAlt, color: theme.textMuted },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  inputError: { borderColor: theme.dangerBright },
  error: { color: theme.dangerBright, fontSize: 12 },
  hint: { color: theme.textMuted, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: theme.surface,
  },
  chipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  chipText: { color: theme.textMuted, fontSize: 13 },
  chipTextActive: { color: "#ffffff", fontWeight: "600" },
  check: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkText: { flexShrink: 1, gap: 2 },
  checkLabel: { color: theme.text, fontSize: 14 },
  checkHint: { color: theme.textMuted, fontSize: 12 },
  banner: { borderWidth: 1, borderRadius: radius.sm, padding: 12, gap: 4 },
  bannerTitle: { color: theme.text, fontWeight: "700", fontSize: 14 },
  bannerText: { color: theme.text, fontSize: 13, lineHeight: 18 },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
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
