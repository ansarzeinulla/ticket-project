import { router } from "expo-router";

import { useT } from "../lib/i18n/context";
import type { SupportCase } from "../lib/models";
import { supportCategoryLabel, supportStatusLabel } from "../lib/support-labels";
import { Badge, Body, Card, Muted } from "./ui";

/** A list of support cases; each opens its conversation. */
export function CaseList({ cases, showRequester = false }: { cases: SupportCase[]; showRequester?: boolean }) {
  const t = useT();
  return (
    <>
      {cases.map((item) => (
        <Card key={item.id} onPress={() => router.push(`/support/${item.id}`)} testID="case-row">
          <Body>{item.subject}</Body>
          <Muted>
            {item.case_number} · {supportCategoryLabel(t, item.category)}
            {showRequester ? ` · ${t("platformInbox.from", { name: item.requester_name })}` : ""}
          </Muted>
          <Badge tone={item.status === "resolved" ? "success" : "info"} text={supportStatusLabel(t, item.status)} />
        </Card>
      ))}
    </>
  );
}
