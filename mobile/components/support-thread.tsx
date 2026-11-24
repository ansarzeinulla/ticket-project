import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import type { SupportStatus, SupportThread as Thread } from "../lib/models";
import { ORGANIZER_STATUSES, formatMessageTime, supportCategoryLabel, supportStatusLabel } from "../lib/support-labels";
import { radius, theme } from "../lib/theme";
import { Badge, Banner, Button, Card, Check, Field, Heading, Loading, Muted, Row } from "./ui";

/** How often a live thread re-reads itself; SRS 4.13 needs no sockets. */
const POLL_MS = 10_000;

/**
 * One support conversation, for whoever may see it: the attendee or organizer
 * who asked, or the staff who answer (status, internal notes).
 */
export function SupportThreadView({ caseID }: { caseID: string }) {
  const t = useT();
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      setThread(await api.getSupportThread(caseID));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("supportThread.loadFailed"));
    }
  }, [caseID, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolved = thread?.case.status === "resolved";
  useEffect(() => {
    if (resolved) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [resolved, load]);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      setThread(await api.replyToSupportCase(caseID, reply.trim(), internal));
      setReply("");
      setInternal(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("supportThread.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: SupportStatus) {
    setBusyStatus(true);
    try {
      setThread(await api.setSupportCaseStatus(caseID, status));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("supportThread.statusFailed"));
    } finally {
      setBusyStatus(false);
    }
  }

  if (!thread) {
    return error ? <Banner tone="error">{error}</Banner> : <Loading label={t("supportThread.loading")} />;
  }

  const { case: supportCase, messages, can_moderate: canModerate } = thread;

  return (
    <View style={styles.wrap}>
      <Card>
        <Heading>{supportCase.subject}</Heading>
        <Row>
          <Badge text={supportStatusLabel(t, supportCase.status)} />
          <Muted>
            {supportCase.case_number} · {supportCategoryLabel(t, supportCase.category)}
            {supportCase.order_number ? ` · ${t("supportThread.order", { number: supportCase.order_number })}` : ""}
            {canModerate ? ` · ${t("supportThread.from", { name: supportCase.requester_name })}` : ""}
          </Muted>
        </Row>
      </Card>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <View style={styles.messages} testID="case-messages">
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.message,
              message.is_internal_note ? styles.internal : message.sender_role === "staff" ? styles.staff : null,
            ]}
          >
            <Text style={styles.sender}>
              {message.sender_name}
              {message.is_internal_note ? `  ·  ${t("supportThread.internalBadge")}` : ""}
            </Text>
            <Text style={styles.body}>{message.body}</Text>
            <Text style={styles.time}>{formatMessageTime(message.created_at)}</Text>
          </View>
        ))}
      </View>

      {canModerate ? (
        <Card>
          <Muted>{t("supportThread.setStatus")}</Muted>
          <Row>
            {ORGANIZER_STATUSES.map((status) => (
              <Button
                key={status}
                small
                variant={supportCase.status === status ? "primary" : "secondary"}
                disabled={busyStatus || supportCase.status === status}
                title={supportStatusLabel(t, status)}
                onPress={() => void changeStatus(status)}
                testID={`set-status-${status}`}
              />
            ))}
          </Row>
        </Card>
      ) : null}

      <Field
        label={canModerate ? t("supportThread.replyLabel") : t("supportThread.addLabel")}
        value={reply}
        onChangeText={setReply}
        placeholder={canModerate ? t("supportThread.replyPlaceholder") : t("supportThread.addPlaceholder")}
        multiline
        testID="reply-input"
      />
      {canModerate ? <Check label={t("supportThread.internalToggle")} value={internal} onChange={setInternal} /> : null}
      <Button title={t("supportThread.send")} loading={sending} disabled={!reply.trim()} onPress={() => void send()} testID="reply-send" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  messages: { gap: 8 },
  message: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    gap: 4,
  },
  staff: { borderColor: theme.brandDark, backgroundColor: "#0f2a2a" },
  internal: { borderColor: theme.warning, backgroundColor: "#3a2a10" },
  sender: { color: theme.text, fontWeight: "600", fontSize: 13 },
  body: { color: theme.text, fontSize: 14, lineHeight: 20 },
  time: { color: theme.textMuted, fontSize: 11 },
});
