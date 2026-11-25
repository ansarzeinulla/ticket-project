import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { CategoryTiles, HeroCarousel, PosterCard, PosterRow } from "../../components/posters";
import { Banner, Empty, Loading, Screen } from "../../components/ui";
import { CATEGORIES, CITIES, CITY_PREF, isCity, type Category, type City } from "../../lib/catalogue";
import { ApiError, api } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import type { MessageKey } from "../../lib/i18n/dictionaries";
import type { BiletEvent } from "../../lib/models";
import { getPref, setPref } from "../../lib/prefs";
import { radius, theme } from "../../lib/theme";

/**
 * The storefront, as on the website's home page (BF-100): search, city,
 * featured banners, poster rows and categories. Opens without an account.
 * Picking a category or searching switches to a poster grid.
 */
export default function ExploreScreen() {
  const t = useT();
  const { width } = useWindowDimensions();
  const [events, setEvents] = useState<BiletEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [groups, setGroups] = useState<{ category: Category; events: BiletEvent[]; total: number }[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [city, setCity] = useState<City | "">("");
  const [category, setCategory] = useState<Category | "">("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void getPref(CITY_PREF).then((saved) => setCity(isCity(saved) ? saved : ""));
  }, []);

  const filtering = Boolean(category || search);
  const PAGE = 24;

  // A new filter shows the spinner, not the previous results, until its own arrive.
  useEffect(() => {
    setEvents(null);
  }, [city, category, search]);

  // The browse view asks for the soonest events and a row per category, in
  // parallel; a filtered view pages through its results as the list scrolls.
  const load = useCallback(async () => {
    const startsAfter = new Date().toISOString();
    const base = { city: city || undefined, startsAfter };
    try {
      if (filtering) {
        const data = await api.listPublicEvents({ ...base, limit: PAGE, offset: 0, category: category || undefined, q: search || undefined });
        setEvents(data.events);
        setTotal(data.total ?? data.events.length);
      } else {
        const [soonest, ...rows] = await Promise.all([
          api.listPublicEvents({ ...base, limit: 24 }),
          ...CATEGORIES.map((c) => api.listPublicEvents({ ...base, limit: 12, category: c })),
        ]);
        setEvents(soonest.events);
        setTotal(soonest.total ?? soonest.events.length);
        setGroups(CATEGORIES.map((c, i) => ({ category: c, events: rows[i].events, total: rows[i].total ?? rows[i].events.length })));
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("catalogue.unavailable"));
    } finally {
      setRefreshing(false);
    }
  }, [city, category, search, filtering, t]);

  const loadMore = useCallback(async () => {
    if (!filtering || loadingMore || !events || events.length >= total) return;
    setLoadingMore(true);
    try {
      const data = await api.listPublicEvents({
        limit: PAGE,
        offset: events.length,
        city: city || undefined,
        category: category || undefined,
        q: search || undefined,
        startsAfter: new Date().toISOString(),
      });
      setEvents((current) => [...(current ?? []), ...data.events.filter((e) => !(current ?? []).some((c) => c.id === e.id))]);
    } catch {
      // The next scroll tries again.
    } finally {
      setLoadingMore(false);
    }
  }, [filtering, loadingMore, events, total, city, category, search]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function pickCity(next: City | "") {
    setCity(next);
    void setPref(CITY_PREF, next);
  }

  const count = (n: number) => (n === 1 ? t("home.resultOne") : t("home.results", { count: n }));
  const cardWidth = Math.min(170, Math.round((width - 32 - 12) / 2.3));
  const gridWidth = Math.floor((width - 32 - 12) / 2);
  const featured = (events ?? []).filter((event) => event.cover_image_url).slice(0, 6);
  const rest = (events ?? []).filter((event) => !featured.includes(event));

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); void load(); }}
      onEndReached={filtering ? () => void loadMore() : undefined}
    >
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => setSearch(query.trim())}
        returnKeyType="search"
        placeholder={t("home.searchPlaceholder")}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={t("home.searchLabel")}
        style={styles.search}
        testID="explore-search"
      />

      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t("home.city")}>
        {(["", ...CITIES] as const).map((option) => {
          const active = option === city;
          return (
            <Pressable
              key={option || "all"}
              onPress={() => pickCity(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.chip, active && styles.chipActive]}
              testID={`city-${option || "all"}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option ? t(`cities.${option}` as MessageKey) : t("home.allCities")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtering ? (
        <View style={styles.filterHead}>
          <Text style={styles.filterTitle}>
            {category ? t(`categories.${category}` as MessageKey) : `“${search}”`}
          </Text>
          <Pressable
            onPress={() => {
              setCategory("");
              setSearch("");
              setQuery("");
            }}
            hitSlop={8}
            accessibilityRole="button"
            testID="clear-filters"
          >
            <Text style={styles.clear}>{t("home.clearFilters")}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Banner tone="error">{error}</Banner> : null}

      {events === null ? (
        error ? null : <Loading />
      ) : events.length === 0 ? (
        <Empty>{t("home.noEvents")}</Empty>
      ) : filtering ? (
        <>
          <Text style={styles.muted}>{count(total)}</Text>
          <View style={styles.grid}>
            {events.map((event) => (
              <PosterCard key={event.id} event={event} width={gridWidth} />
            ))}
          </View>
          {events.length < total ? <Loading label={t("home.loadingMore")} /> : null}
        </>
      ) : (
        <>
          <HeroCarousel events={featured} cta={t("home.bookTickets")} />
          <PosterRow
            title={city ? t("home.upcomingIn", { city: t(`cities.${city}` as MessageKey) }) : t("home.recommended")}
            seeAll={t("home.seeAll")}
          >
            {(rest.length > 0 ? rest : events).slice(0, 12).map((event) => (
              <PosterCard key={event.id} event={event} width={cardWidth} />
            ))}
          </PosterRow>
          <Text style={styles.section}>{t("home.browseByCategory")}</Text>
          <CategoryTiles groups={groups} onPick={setCategory} countLabel={count} />
          {groups.filter((g) => g.events.length > 0).map(({ category: c, events: group }) => (
            <PosterRow key={c} title={t(`categories.${c}` as MessageKey)} seeAll={t("home.seeAll")} onSeeAll={() => setCategory(c)}>
              {group.map((event) => (
                <PosterCard key={event.id} event={event} width={cardWidth} showCategory={false} />
              ))}
            </PosterRow>
          ))}
          <Text style={styles.note}>{t("home.footerNote")}</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: theme.surfaceAlt,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.text,
  },
  // The city choice reads as tabs: the current one underlined in blue.
  chips: { flexDirection: "row", gap: 18, borderBottomWidth: 1, borderBottomColor: theme.border },
  chip: { paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  chipActive: { borderBottomColor: theme.brand },
  chipText: { color: theme.textMuted, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: theme.text },
  filterHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  filterTitle: { color: theme.text, fontSize: 24, fontWeight: "800" },
  clear: { color: theme.brand, fontWeight: "700" },
  muted: { color: theme.textMuted, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, rowGap: 18 },
  section: { color: theme.text, fontSize: 20, fontWeight: "800" },
  note: { color: theme.textMuted, fontSize: 11, textAlign: "center", marginTop: 12 },
});
