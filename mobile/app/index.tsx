import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../lib/auth-context";
import { theme } from "../lib/theme";

/**
 * Waits for the stored session to be checked, then opens the app on the
 * event catalogue - browsing needs no account, exactly as on the website.
 */
export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.brand} size="large" />
      </View>
    );
  }
  return <Redirect href="/explore" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg },
});
