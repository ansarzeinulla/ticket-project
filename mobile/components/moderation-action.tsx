import { useState } from "react";

import { ApiError } from "../lib/client";
import { useT } from "../lib/i18n/context";
import { Banner, Button, Card, Field, Muted, Row } from "./ui";

/**
 * A moderation button that explains its consequence before acting and
 * offers a reason for the audit log - the website's ModerationAction.
 */
export function ModerationAction({
  label,
  confirmLabel,
  consequence,
  tone = "danger",
  withReason = true,
  onConfirm,
  onDone,
  testID,
}: {
  label: string;
  confirmLabel: string;
  consequence: string;
  tone?: "danger" | "secondary";
  withReason?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
  onDone?: () => void;
  testID?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
      onDone?.();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.moderation.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button small variant={tone} title={label} onPress={() => setOpen(true)} testID={testID} />;
  }
  return (
    <Card>
      <Muted>{consequence}</Muted>
      {withReason ? <Field label={t("org.moderation.reason")} value={reason} onChangeText={setReason} placeholder={t("org.moderation.optional")} /> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Row>
        <Button small variant={tone === "danger" ? "danger" : "primary"} title={confirmLabel} loading={busy} onPress={() => void confirm()} testID={testID ? `${testID}-confirm` : undefined} />
        <Button small variant="ghost" title={t("org.form.cancel")} disabled={busy} onPress={() => setOpen(false)} />
      </Row>
    </Card>
  );
}
