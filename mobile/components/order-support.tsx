import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import type { SupportCase } from "../lib/models";
import { supportCategoryLabel, supportStatusLabel } from "../lib/support-labels";
import { Banner, Button, Card, Choice, Field, Heading, Loading, Muted } from "./ui";

/** Support on an order: the attendee's cases about it, and a way to ask (SRS 4.13). */
export function OrderSupport({ orderID, buyerEmail }: { orderID: string; buyerEmail: string }) {
  const t = useT();
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  const [cases, setCases] = useState<SupportCase[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [composing, setComposing] = useState(false);
  const [category, setCategory] = useState("event_information");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, cats] = await Promise.all([
        signedIn ? api.mySupportCases() : Promise.resolve([] as SupportCase[]),
        api.supportCategories(),
      ]);
      setCases(mine.filter((item) => item.order_id === orderID));
      setCategories(cats);
    } catch (cause) {
      setCases([]);
      setError(cause instanceof ApiError ? cause.message : t("orderSupport.loadFailed"));
    }
  }, [orderID, signedIn, t]);

  useEffect(() => {
    if (status !== "loading") void load();
  }, [status, load]);

  async function open() {
    const errors: Record<string, string> = {};
    if (!subject.trim()) errors.subject = t("orderSupport.subjectRequired");
    if (!message.trim()) errors.message = t("orderSupport.messageRequired");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      const thread = await api.openSupportCase({ category, subject: subject.trim(), message: message.trim(), order_id: orderID });
      router.push(`/support/${thread.case.id}`);
      setComposing(false);
      setSubject("");
      setMessage("");
      void load();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(Object.keys(cause.fields).length > 0 ? t("auth.common.fixFields") : cause.message);
      } else {
        setError(t("orderSupport.openFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || cases === null) return <Loading label={t("orderSupport.loading")} />;

  if (!signedIn) {
    return (
      <Card>
        <Heading>{t("orderSupport.guestHeading")}</Heading>
        <Muted>{t("orderSupport.guestBefore") + buyerEmail + t("orderSupport.guestAfter")}</Muted>
        <Button title={t("orderSupport.guestSignIn")} onPress={() => router.push("/login")} />
      </Card>
    );
  }

  return (
    <>
      <Heading>{t("orderSupport.heading")}</Heading>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {cases.map((item) => (
        <Card key={item.id} onPress={() => router.push(`/support/${item.id}`)}>
          <Muted>{item.subject}</Muted>
          <Muted>
            {item.case_number} · {supportCategoryLabel(t, item.category)} · {supportStatusLabel(t, item.status)}
          </Muted>
        </Card>
      ))}
      {composing ? (
        <Card>
          <Heading>{t("orderSupport.ask")}</Heading>
          <Choice
            label={t("orderSupport.category")}
            options={categories.map((value) => ({ value, label: supportCategoryLabel(t, value) }))}
            value={category}
            onChange={setCategory}
          />
          <Field label={t("orderSupport.subject")} value={subject} onChangeText={setSubject} placeholder={t("orderSupport.subjectPlaceholder")} error={fieldErrors.subject} testID="support-subject" />
          <Field label={t("orderSupport.question")} value={message} onChangeText={setMessage} placeholder={t("orderSupport.questionPlaceholder")} error={fieldErrors.message} multiline testID="support-message" />
          <Button title={t("orderSupport.send")} loading={submitting} onPress={() => void open()} testID="support-submit" />
          <Button variant="ghost" title={t("orderSupport.cancel")} onPress={() => setComposing(false)} />
        </Card>
      ) : (
        <>
          {cases.length === 0 ? <Muted>{t("orderSupport.empty")}</Muted> : null}
          <Button variant="secondary" title={t("orderSupport.contact")} onPress={() => setComposing(true)} testID="contact-organizer" />
        </>
      )}
    </>
  );
}
