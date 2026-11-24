import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { Banner, Body, Button, Card, Choice, Empty, Field, Heading, Loading, Muted, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { useT } from "../../../lib/i18n/context";
import { staffRoleLabel } from "../../../lib/labels";
import type { StaffMember } from "../../../lib/models";

const ROLES = ["event_admin", "support_staff", "manager"] as const;

/** Who may scan or answer support for this event (SRS 4.8, 4.13). */
export default function StaffScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("event_admin");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStaff((await api.listStaff(id)).staff);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.staff.loadFailed"));
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!email.trim()) {
      setFieldErrors({ email: t("org.staff.emailRequired") });
      return;
    }
    setFieldErrors({});
    setAdding(true);
    setError(null);
    try {
      await api.assignStaff(id, email.trim().toLowerCase(), role);
      setEmail("");
      await load();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(cause.message);
      } else {
        setError(t("org.staff.addFailed"));
      }
    } finally {
      setAdding(false);
    }
  }

  async function revoke(member: StaffMember) {
    setRevoking(member.id);
    try {
      await api.revokeStaff(id, member.id);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.staff.revokeFailed"));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.staff.heading") }} />
      <Title>{t("org.staff.heading")}</Title>
      <Muted>{t("org.staff.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {staff === null ? (
        <Loading label={t("org.common.loading")} />
      ) : staff.length === 0 ? (
        <Empty>{t("org.staff.none")}</Empty>
      ) : (
        staff.map((member) => (
          <Card key={member.id} testID={`staff-${member.user_email}`}>
            <Body>{member.user_name}</Body>
            <Muted>{member.user_email}</Muted>
            <Muted>{staffRoleLabel(t, member.role)}</Muted>
            <Button small variant="danger" title={t("org.staff.revoke")} loading={revoking === member.id} disabled={revoking !== null} onPress={() => void revoke(member)} />
          </Card>
        ))
      )}
      <Card>
        <Heading>{t("org.staff.add")}</Heading>
        <Field label={t("auth.common.email")} value={email} onChangeText={setEmail} placeholder="scanner@biletflow.kz" hint={t("org.staff.emailHint")} error={fieldErrors.email} keyboardType="email-address" autoCapitalize="none" testID="staff-email" />
        <Choice label={t("org.staff.role")} options={ROLES.map((value) => ({ value, label: staffRoleLabel(t, value) }))} value={role} onChange={setRole} error={fieldErrors.role} />
        <Button title={t("org.staff.add")} loading={adding} onPress={() => void add()} testID="staff-add" />
      </Card>
    </Screen>
  );
}
