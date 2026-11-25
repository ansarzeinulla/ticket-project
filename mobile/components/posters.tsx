import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { CATEGORIES, isCategory, type Category } from "../lib/catalogue";
import { formatInTimezone } from "../lib/datetime";
import { useI18n } from "../lib/i18n/context";
import type { MessageKey } from "../lib/i18n/dictionaries";
import { mediaURL } from "../lib/media";
import type { BiletEvent } from "../lib/models";
import { radius, theme } from "../lib/theme";

/** A category label in the reader's language, or the raw value for an old free-text one. */
export function useCategoryLabel() {
  const { t } = useI18n();
  return (value?: string | null) =>
    !value ? "" : isCategory(value) ? t(`categories.${value}` as MessageKey) : value;
}

/** The plain block shown where an event has no poster. */
function Placeholder({ label }: { label: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
      <Text style={styles.placeholderText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** A portrait poster card - the storefront's basic unit, as on the website (BF-100). */
export function PosterCard({ event, width, showCategory = true }: { event: BiletEvent; width: number; showCategory?: boolean }) {
  const { locale } = useI18n();
  const label = useCategoryLabel();
  const image = mediaURL(event.cover_image_url);
  const meta = showCategory && label(event.category) ? `${label(event.category)}, ${event.venue_name ?? ""}` : event.venue_name;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.slug}`)}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      testID={`event-${event.slug}`}
    >
      <View style={[styles.poster, { width, height: Math.round((width * 3) / 2) }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Placeholder label={label(event.category) || event.title} />
        )}
      </View>
      <Text style={styles.date} numberOfLines={1}>
        {formatInTimezone(event.starts_at, event.timezone, locale)}
      </Text>
      <Text style={styles.posterTitle} numberOfLines={2}>
        {event.title}
      </Text>
      {meta ? (
        <Text style={styles.posterMeta} numberOfLines={1}>
          {meta.replace(/, $/, "")}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A titled, horizontally scrolling row of posters. */
export function PosterRow({
  title,
  seeAll,
  onSeeAll,
  children,
}: {
  title: string;
  seeAll: string;
  onSeeAll?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.rowBlock}>
      <View style={styles.rowHead}>
        <Text style={styles.rowTitle}>{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
            <Text style={styles.seeAll}>{seeAll}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Featured events, one per page: details on a plain panel, the poster beside them. */
export function HeroCarousel({ events, cta }: { events: BiletEvent[]; cta: string }) {
  const { locale } = useI18n();
  const label = useCategoryLabel();
  const { width: screen } = useWindowDimensions();
  const width = screen - 32;
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % events.length;
        scroller.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 7000);
    return () => clearInterval(timer);
  }, [events.length, width]);

  if (events.length === 0) return null;

  return (
    <View testID="hero">
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={[styles.hero, { width }]}
      >
        {events.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => router.push(`/event/${event.slug}`)}
            style={[styles.heroSlide, { width }]}
            accessibilityRole="button"
          >
            <Image source={{ uri: mediaURL(event.cover_image_url) }} style={styles.heroBlur} blurRadius={24} />
            <View style={styles.heroShade} />
            <View style={styles.heroText}>
              {label(event.category) ? <Text style={styles.kicker}>{label(event.category)}</Text> : null}
              <Text style={styles.heroTitle} numberOfLines={3}>
                {event.title}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={2}>
                {formatInTimezone(event.starts_at, event.timezone, locale)}
              </Text>
              <View style={styles.heroButton}>
                <Text style={styles.heroButtonText}>{cta}</Text>
              </View>
            </View>
            <Image source={{ uri: mediaURL(event.cover_image_url) }} style={styles.heroPoster} />
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.progress}>
        {events.map((event, i) => (
          <View key={event.id} style={[styles.progressBar, i === index && styles.progressActive]} />
        ))}
      </View>
    </View>
  );
}

/** Category tiles, two to a row, each showing a real poster from that category. */
export function CategoryTiles({
  groups,
  onPick,
  countLabel,
}: {
  groups: { category: Category; events: BiletEvent[]; total: number }[];
  onPick: (category: Category) => void;
  countLabel: (count: number) => string;
}) {
  const { t } = useI18n();
  const { width: screen } = useWindowDimensions();
  const tileWidth = Math.floor((screen - 32 - 10) / 2);
  return (
    <View style={styles.tiles}>
      {groups.map(({ category, events: group, total }) => {
        const cover = mediaURL(group.find((event) => event.cover_image_url)?.cover_image_url);
        return (
          <Pressable
            key={category}
            onPress={() => onPick(category)}
            style={({ pressed }) => [styles.tile, { width: tileWidth }, pressed && styles.pressed]}
            accessibilityRole="button"
            testID={`category-${category}`}
          >
            <View style={styles.tileImage}>
              {cover ? (
                <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <Placeholder label={t(`categories.${category}` as MessageKey)} />
              )}
            </View>
            <Text style={styles.tileName}>{t(`categories.${category}` as MessageKey)}</Text>
            <Text style={styles.tileCount}>{countLabel(total)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  poster: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: theme.surfaceAlt },
  placeholder: { backgroundColor: theme.brandSoft, justifyContent: "flex-end", padding: 10 },
  placeholderText: { color: theme.brand, fontSize: 13, fontWeight: "700" },
  date: { color: theme.brand, fontSize: 12, fontWeight: "700", marginTop: 8 },
  posterTitle: { color: theme.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
  posterMeta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  rowBlock: { gap: 10 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  rowTitle: { color: theme.text, fontSize: 20, fontWeight: "800" },
  seeAll: { color: theme.brand, fontSize: 14, fontWeight: "700" },
  rowScroll: { gap: 12, paddingRight: 16 },
  hero: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: theme.top },
  heroSlide: { flexDirection: "row", backgroundColor: theme.top, minHeight: 220, padding: 14, gap: 12, alignItems: "center" },
  heroBlur: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  heroShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  heroText: { flex: 1, gap: 8, justifyContent: "center" },
  heroPoster: { width: 118, aspectRatio: 2 / 3, borderRadius: radius.md, backgroundColor: theme.border },
  kicker: { alignSelf: "flex-start", color: "#ffffff", backgroundColor: theme.brand, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "700", overflow: "hidden" },
  heroTitle: { color: "#ffffff", fontSize: 19, fontWeight: "800", lineHeight: 23 },
  heroMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  heroButton: { alignSelf: "flex-start", backgroundColor: theme.brand, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4 },
  heroButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  progress: { flexDirection: "row", gap: 4, marginTop: 8 },
  progressBar: { flex: 1, height: 2, backgroundColor: theme.border },
  progressActive: { backgroundColor: theme.brand },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, overflow: "hidden", paddingBottom: 10 },
  tileImage: { height: 90, backgroundColor: theme.surfaceAlt },
  tileName: { color: theme.text, fontSize: 15, fontWeight: "700", marginTop: 8, marginHorizontal: 10 },
  tileCount: { color: theme.textMuted, fontSize: 12, marginHorizontal: 10 },
});
