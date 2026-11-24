import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";

import { useAuth } from "../../lib/auth-context";
import { useT } from "../../lib/i18n/context";
import { theme } from "../../lib/theme";

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

/**
 * The app's sections mirror the website: the attendee side, the organizer
 * dashboard, the gate scanner, the account, and - for platform admins only -
 * the administration portal.
 */
export default function TabsLayout() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const signedIn = Boolean(user);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{ title: t("catalogue.title"), tabBarIcon: ({ color }) => <Icon glyph="◎" color={color} /> }}
      />
      <Tabs.Screen
        name="tickets"
        options={{ title: t("nav.myTickets"), tabBarIcon: ({ color }) => <Icon glyph="▤" color={color} /> }}
      />
      <Tabs.Screen
        name="organize"
        options={{ title: t("app.tabs.organize"), tabBarIcon: ({ color }) => <Icon glyph="✎" color={color} /> }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: t("app.tabs.scanner"),
          href: signedIn ? undefined : null,
          tabBarIcon: ({ color }) => <Icon glyph="⌗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t("nav.administration"),
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <Icon glyph="⚑" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t("app.tabs.account"), tabBarIcon: ({ color }) => <Icon glyph="◉" color={color} /> }}
      />
    </Tabs>
  );
}
