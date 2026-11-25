import { router } from "expo-router";

import { useT } from "../lib/i18n/context";
import { Button, Card, Muted, Row } from "./ui";

/** Shown where a section needs an account, with the way to get one. */
export function SignInPrompt({ message }: { message: string }) {
  const t = useT();
  return (
    <Card>
      <Muted>{message}</Muted>
      <Row>
        <Button title={t("auth.common.signIn")} onPress={() => router.push("/login")} testID="prompt-sign-in" />
        <Button variant="secondary" title={t("auth.register.submit")} onPress={() => router.push("/register")} />
      </Row>
    </Card>
  );
}
