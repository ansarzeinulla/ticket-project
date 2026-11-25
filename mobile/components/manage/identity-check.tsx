import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useT } from "../../lib/i18n/context";
import { theme } from "../../lib/theme";
import { Button, Muted } from "../ui";

/**
 * The identity step of paid-sales activation as a document check (SRS 4.5,
 * BF-100). A photo of an ID is picked, "checked" for a moment and always
 * passes: this is a student project, and the photo never leaves the phone.
 */
export function IdentityCheck({ onVerified, disabled }: { onVerified: () => void; disabled?: boolean }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "checking" | "verified">("idle");

  async function pick() {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
    if (picked.canceled) return;
    setState("checking");
    setTimeout(() => {
      setState("verified");
      onVerified();
    }, 1500);
  }

  return (
    <View style={{ gap: 6, paddingLeft: 4 }} testID="identity-check">
      {state === "verified" ? (
        <Text style={{ color: theme.success, fontWeight: "700" }} testID="identity-verified">
          ✓ {t("home.idVerified")}
        </Text>
      ) : state === "checking" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator color={theme.brand} />
          <Muted>{t("home.idChecking")}</Muted>
        </View>
      ) : (
        <Button small variant="outline" title={t("home.idVerify")} onPress={() => void pick()} disabled={disabled} testID="identity-verify" />
      )}
      <Muted>{t("home.idNote")}</Muted>
    </View>
  );
}
