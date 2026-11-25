import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useT } from "../../lib/i18n/context";
import { radius, theme } from "../../lib/theme";
import type { ScannableEvent } from "../../lib/types";

/** Renders a start time in the event's own timezone, not the phone's. */
function formatStart(event: ScannableEvent): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: event.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(event.starts_at));
  } catch {
    return new Date(event.starts_at).toLocaleString();
  }
}

/** The gate: events this account may scan (SRS 4.8). Signing out lives on the Account tab. */
export default function ScannerTab() {
  const t = useT();
  const { user, signOut } = useAuth();

  const [events, setEvents] = useState<ScannableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Search by title, so staff with many events find theirs at once (BF-100).
  const shown = query.trim()
    ? events.filter((event) => event.title.toLowerCase().includes(query.trim().toLowerCase()))
    : events;

  const load = useCallback(async () => {
    try {
      setEvents(await api.scannableEvents());
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.isSessionExpired) {
        await signOut();
        router.push("/login");
        return;
      }
      setError(cause instanceof ApiError ? cause.message : t("app.scanner.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut, t]);

  // Re-fetch whenever the screen comes back into view, so the counts are fresh
  // after a shift at the gate.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.brand} size="large" />
        <Text style={styles.muted}>{t("app.scanner.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.who}>{user?.full_name ?? t("app.scanner.viaAdmin")}</Text>
          <Text style={styles.muted}>{user?.email}</Text>
        </View>
      </View>

      {events.length > 0 ? (
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("app.scanner.search")}
            placeholderTextColor={theme.textMuted}
            accessibilityLabel={t("app.scanner.search")}
            returnKeyType="search"
            style={styles.search}
            testID="scanner-search"
          />
        </View>
      ) : null}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={theme.brand}
          />
        }
        ListEmptyComponent={
          events.length > 0 ? (
            <View style={styles.empty}>
              <Text style={styles.muted}>{t("app.scanner.noEvent")}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t("app.scanner.emptyTitle")}</Text>
              <Text style={styles.muted}>{t("app.scanner.emptyBody")}</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const remaining = Math.max(0, item.stats.issued - item.stats.checked_in);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/scan/${item.id}`)}
              testID={`event-${item.id}`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.access_via === "organizer" ? t("app.scanner.viaOrganizer") : t("app.scanner.viaAdmin")}
                  </Text>
                </View>
              </View>

              <Text style={styles.muted}>{formatStart(item)}</Text>
              {item.venue_name ? (
                <Text style={styles.muted}>{item.venue_name}</Text>
              ) : null}

              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.stats.checked_in}</Text>
                  <Text style={styles.statLabel}>{t("app.scanner.checkedIn")}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{remaining}</Text>
                  <Text style={styles.statLabel}>{t("app.scanner.expected")}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.stats.issued}</Text>
                  <Text style={styles.statLabel}>{t("app.scanner.tickets")}</Text>
                </View>
              </View>

              {/* The camera is what staff want nine times in ten (BF-100). */}
              <Pressable
                onPress={() => router.push(`/scan/${item.id}`)}
                testID={`scan-${item.id}`}
                accessibilityRole="button"
                style={({ pressed }) => [styles.scanButton, pressed && styles.cardPressed]}
              >
                <Text style={styles.scanText}>{t("app.scanner.scan")}</Text>
              </Pressable>

              {/*
                The other ways in: by name when a QR cannot be scanned at all,
                and offline with a downloaded roster (SRS 4.8).
              */}
              <View style={styles.secondaryRow}>
                <Pressable
                  onPress={() => router.push(`/attendees/${item.id}`)}
                  testID={`find-attendee-${item.id}`}
                  style={({ pressed }) => [styles.secondary, pressed && styles.cardPressed]}
                >
                  <Text style={styles.secondaryText}>{t("app.scanner.findByName")}</Text>
                </Pressable>
                {/*
                  Offline check-in (SRS 4.8): download the roster now, then work
                  the door with no network at all.
                */}
                <Pressable
                  onPress={() => router.push(`/offline/${item.id}`)}
                  testID={`offline-${item.id}`}
                  style={({ pressed }) => [styles.secondary, pressed && styles.cardPressed]}
                >
                  <Text style={styles.secondaryText}>{t("app.scanner.offlineMode")}</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  secondaryRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  scanButton: {
    marginTop: 14,
    backgroundColor: theme.brand,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  scanText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  search: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.text,
  },
  secondary: {
    flex: 1,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryText: { color: theme.brand, fontSize: 14, fontWeight: "600" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  headerText: { flexShrink: 1 },
  who: { color: theme.text, fontSize: 15, fontWeight: "600" },
  muted: { color: theme.textMuted, fontSize: 13 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
    gap: 4,
  },
  cardPressed: { opacity: 0.7 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardTitle: { color: theme.text, fontSize: 17, fontWeight: "700", flex: 1 },
  badge: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: theme.brand, fontSize: 11, fontWeight: "600" },
  stats: { flexDirection: "row", gap: 28, marginTop: 14 },
  stat: {},
  statValue: { color: theme.text, fontSize: 20, fontWeight: "700" },
  statLabel: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyTitle: { color: theme.text, fontSize: 17, fontWeight: "600" },
  errorBox: {
    margin: 16,
    backgroundColor: "#fee2e2",
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  errorText: { color: theme.danger, fontSize: 14 },
});
