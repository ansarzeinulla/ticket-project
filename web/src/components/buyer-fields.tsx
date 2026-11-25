"use client";

import { useEffect, useState } from "react";

import { TextField } from "@/components/ui/field";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";

/**
 * Who the tickets are for (BF-100). A signed-in buyer gets their account's
 * name and address filled in and locked, with a box to untick when buying for
 * somebody else; a guest types both.
 */
export function useBuyerDetails() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [useAccount, setUseAccount] = useState(true);

  // The account arrives after the first render; fill in once it does.
  useEffect(() => {
    if (user && useAccount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(user.full_name);
      setEmail(user.email);
    }
  }, [user, useAccount]);

  return { user, name, setName, email, setEmail, useAccount, setUseAccount };
}

export function BuyerFields({
  buyer,
  errors,
  disabled,
  nameLabel,
  emailLabel,
  emailHint,
  namePlaceholder,
  emailPlaceholder,
}: {
  buyer: ReturnType<typeof useBuyerDetails>;
  errors: Record<string, string>;
  disabled?: boolean;
  nameLabel: string;
  emailLabel: string;
  emailHint?: string;
  namePlaceholder?: string;
  emailPlaceholder?: string;
}) {
  const t = useT();
  const locked = Boolean(buyer.user && buyer.useAccount);

  return (
    <>
      {buyer.user && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={buyer.useAccount}
            onChange={(event) => {
              buyer.setUseAccount(event.target.checked);
              if (!event.target.checked) {
                buyer.setName("");
                buyer.setEmail("");
              }
            }}
            disabled={disabled}
            className="h-4 w-4 accent-[var(--brand)]"
            data-testid="use-account-details"
          />
          {t("home.useAccount")}
        </label>
      )}
      <TextField
        label={nameLabel}
        name="buyer_name"
        autoComplete="name"
        placeholder={namePlaceholder}
        required
        value={buyer.name}
        error={errors.buyer_name}
        disabled={disabled}
        readOnly={locked}
        className={locked ? "bg-surface-muted text-foreground-muted" : undefined}
        onChange={(event) => buyer.setName(event.target.value)}
      />
      <TextField
        label={emailLabel}
        type="email"
        name="buyer_email"
        autoComplete="email"
        placeholder={emailPlaceholder}
        hint={emailHint}
        required
        value={buyer.email}
        error={errors.buyer_email}
        disabled={disabled}
        readOnly={locked}
        className={locked ? "bg-surface-muted text-foreground-muted" : undefined}
        onChange={(event) => buyer.setEmail(event.target.value)}
      />
    </>
  );
}
