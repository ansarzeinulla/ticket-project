import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { CaseList } from "../components/case-list";
import { Banner, Button, Card, Choice, Empty, Field, Heading, Loading, Muted, Screen, Title } from "../components/ui";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import type { SupportCase } from "../lib/models";
import { supportCategoryLabel } from "../lib/support-labels";

const CATEGORIES = ["account", "payment", "technical"] as const;

/** An organizer's own requests to BiletFlow (SRS 4.13). */
export default function PlatformSupportScreen() {
  const t = useT();
  const [cases, setCases] = useState<SupportCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [category, setCategory] = useState<string>("account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const mine = await api.mySupportCases();
      setCases(mine.filter((item) => item.kind === "organizer"));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("platformSupport.loadFailed"));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function submit() {
    const errors: Record<string, string> = {};
    if (!subject.trim()) errors.subject = t("platformSupport.subjectRequired");
    if (!message.trim()) errors.message = t("platformSupport.messageRequired");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      const thread = await api.openSupportCase({ kind: "organizer", category, subject: subject.trim(), message: message.trim() });
      setComposing(false);
      setSubject("");
      setMessage("");
      router.push(`/support/${thread.case.id}`);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(Object.keys(cause.fields).length > 0 ? t("auth.common.fixFields") : cause.message);
      } else {
        setError(t("platformSupport.openFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("platformSupport.title") }} />
      <Title>{t("platformSupport.title")}</Title>
      <Muted>{t("platformSupport.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {composing ? (
        <Card>
          <Heading>{t("platformSupport.newHeading")}</Heading>
          <Choice
            label={t("platformSupport.category")}
            options={CATEGORIES.map((value) => ({ value, label: supportCategoryLabel(t, value) }))}
            value={category}
            onChange={setCategory}
          />
          <Field label={t("platformSupport.subject")} value={subject} onChangeText={setSubject} placeholder={t("platformSupport.subjectPlaceholder")} error={fieldErrors.subject} testID="platform-subject" />
          <Field label={t("platformSupport.message")} value={message} onChangeText={setMessage} placeholder={t("platformSupport.messagePlaceholder")} error={fieldErrors.message} multiline testID="platform-message" />
          <Button title={t("platformSupport.send")} loading={submitting} onPress={() => void submit()} testID="platform-send" />
          <Button variant="ghost" title={t("platformSupport.cancel")} onPress={() => setComposing(false)} />
        </Card>
      ) : (
        <Button title={t("platformSupport.open")} onPress={() => setComposing(true)} testID="platform-open" />
      )}
      {cases === null ? <Loading label={t("org.common.loading")} /> : cases.length === 0 ? <Empty>{t("platformSupport.none")}</Empty> : <CaseList cases={cases} />}
    </Screen>
  );
}
