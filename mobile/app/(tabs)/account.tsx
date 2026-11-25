import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button, Choice, ListGroup, ListRow, Muted, Screen } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { localeNames, locales, type Locale } from "../../lib/i18n/config";
import { useI18n } from "../../lib/i18n/context";
import { radius, theme } from "../../lib/theme";

const LEGAL = ["terms", "privacy", "refunds", "cookies", "about", "contacts"] as const;
const LEGAL_ICON: Record<(typeof LEGAL)[number], string> = {
  terms: "§",
  privacy: "◐",
  refunds: "↺",
  cookies: "◌",
  about: "i",
  contacts: "✉",
};

/**
 * Sign-in, language, and the account's own pages, laid out as grouped rows
 * like a phone's settings screen (BF-100). The email code is entered on the
 * Profile screen; here an unconfirmed account only sees a reminder row.
 */
export default function AccountScreen() {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();

  return (
    <Screen>
      {user ? (
        <View style={styles.person}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.full_name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.personText}>
            <Text style={styles.name} numberOfLines={1}>
              {user.full_name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.signedOut}>
          <Muted>{t("app.account.signedOut")}</Muted>
          <Button title={t("auth.common.signIn")} onPress={() => router.push("/login")} testID="account-sign-in" />
          <Button variant="outline" title={t("auth.register.submit")} onPress={() => router.push("/register")} />
        </View>
      )}

      {user && !user.email_verified_at ? (
        <ListGroup>
          <ListRow
            icon="!"
            label={t("home.verifyGo")}
            detail={t("home.verifyShort")}
            onPress={() => router.push("/profile")}
            last
            testID="verify-email-go"
          />
        </ListGroup>
      ) : null}

      {user ? (
        <ListGroup title={t("app.account.pages")}>
          <ListRow icon="◉" label={t("org.titles.profile")} onPress={() => router.push("/profile")} testID="open-profile" />
          <ListRow
            icon="?"
            label={t("platformSupport.link")}
            onPress={() => router.push("/platform-support")}
            last
            testID="open-platform-support"
          />
        </ListGroup>
      ) : null}

      <Choice<Locale>
        label={t("header.language")}
        options={locales.map((value) => ({ value, label: localeNames[value] }))}
        value={locale}
        onChange={setLocale}
      />

      <ListGroup title={t("legal.help")}>
        {LEGAL.map((page, i) => (
          <ListRow
            key={page}
            icon={LEGAL_ICON[page]}
            label={t(`legal.${page}`)}
            onPress={() => router.push(`/legal/${page}`)}
            last={i === LEGAL.length - 1}
            testID={`legal-${page}`}
          />
        ))}
      </ListGroup>

      {user ? (
        <ListGroup>
          <ListRow
            icon="⎋"
            label={t("nav.signOut")}
            danger
            last
            onPress={() => {
              void signOut();
              router.replace("/explore");
            }}
            testID="sign-out"
          />
        </ListGroup>
      ) : null}

      <Muted style={styles.note}>{t("home.footerNote")}</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: theme.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#ffffff", fontSize: 20, fontWeight: "800" },
  personText: { flex: 1, gap: 2 },
  name: { color: theme.text, fontSize: 17, fontWeight: "700" },
  email: { color: theme.textMuted, fontSize: 13 },
  signedOut: { gap: 10 },
  note: { textAlign: "center", fontSize: 11, marginTop: 8 },
});
