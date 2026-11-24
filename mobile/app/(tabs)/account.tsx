import { router } from "expo-router";

import { Body, Button, Card, Choice, Heading, Muted, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { localeNames, locales, type Locale } from "../../lib/i18n/config";
import { useI18n } from "../../lib/i18n/context";

/** Sign-in, language, and the account's own pages. */
export default function AccountScreen() {
  const { t, locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <Title>{t("app.tabs.account")}</Title>

      <Choice<Locale>
        label={t("header.language")}
        options={locales.map((value) => ({ value, label: localeNames[value] }))}
        value={locale}
        onChange={setLocale}
      />

      {user ? (
        <>
          <Card>
            <Body>{user.full_name}</Body>
            <Muted>{user.email}</Muted>
          </Card>
          <Heading>{t("app.account.pages")}</Heading>
          <Button variant="secondary" title={t("org.titles.profile")} onPress={() => router.push("/profile")} testID="open-profile" />
          <Button variant="secondary" title={t("platformSupport.link")} onPress={() => router.push("/platform-support")} testID="open-platform-support" />
          <Button variant="secondary" title={t("auth.verify.heading")} onPress={() => router.push("/verify-email")} />
          <Button
            variant="danger"
            title={t("nav.signOut")}
            onPress={() => {
              void signOut();
              router.replace("/explore");
            }}
            testID="sign-out"
          />
        </>
      ) : (
        <>
          <Muted>{t("app.account.signedOut")}</Muted>
          <Button title={t("auth.common.signIn")} onPress={() => router.push("/login")} testID="account-sign-in" />
          <Button variant="secondary" title={t("auth.register.submit")} onPress={() => router.push("/register")} />
        </>
      )}
    </Screen>
  );
}
