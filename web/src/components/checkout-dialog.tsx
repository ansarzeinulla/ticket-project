"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BuyerFields, useBuyerDetails } from "@/components/buyer-fields";
import { ApiError, api } from "@/lib/api";
import { toAnalyticsValue, trackPurchase } from "@/lib/analytics";
import { useT } from "@/lib/i18n/context";
import { formatKZT, formatTiyn, lineTotal, toTiyn } from "@/lib/money";
import type { PromoPreview, TicketType } from "@/lib/types";

interface Line {
  type: TicketType;
  quantity: number;
}

/**
 * The simulated checkout.
 *
 * A native <dialog> gives the focus trap, Escape handling and backdrop for
 * free, so none of that has to be reimplemented.
 */
export function CheckoutDialog({
  eventID,
  eventSlug,
  eventTitle,
  lines,
  totalTiyn,
  promo,
  campaignToken,
  onClose,
  onSoldOut,
  onPromoRejected,
}: {
  eventID: string;
  /** Analytics label only - a slug identifies an event, not a person. */
  eventSlug: string;
  eventTitle: string;
  lines: Line[];
  totalTiyn: number;
  /** The server-priced discount, when the attendee has applied a code. */
  promo: PromoPreview | null;
  campaignToken?: string;
  onClose: () => void;
  onSoldOut: () => void;
  onPromoRejected: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const buyer = useBuyerDetails();
  const { name, email } = buyer;
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // What the attendee is actually charged: the server-priced discounted total
  // when a code is applied, otherwise the basket total.
  const payableTiyn = promo ? toTiyn(promo.total_kzt) : totalTiyn;

  // showModal() cannot be called during render, and the dialog only becomes
  // modal - backdrop, focus trap, inert background - when opened this way.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.buyer_name = t("checkout.nameRequired");
    if (!email.trim()) errors.buyer_email = t("checkout.emailRequired");

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.checkout(eventID, {
        buyer_name: name.trim(),
        buyer_email: email.trim(),
        items: lines.map((line) => ({
          ticket_type_id: line.type.id,
          quantity: line.quantity,
        })),
        // The code travels, never the discount: the server prices it again.
        ...(promo ? { promo_code: promo.code } : campaignToken ? { campaign_token: campaignToken } : {}),
      });

      // The completed purchase (bonus). No order id and no buyer - a value,
      // a count, and whether a discount was involved.
      trackPurchase({
        slug: eventSlug,
        valueKZT: toAnalyticsValue(result.order.total_kzt),
        tickets: result.tickets.length,
        discounted: toAnalyticsValue(result.order.discount_kzt) > 0,
      });

      // The confirmation lives at its own URL, so it survives a refresh and can
      // be shared or bookmarked.
      router.push(`/orders/${result.order.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.isPromoProblem) {
        // The code ran out, expired or was disabled between applying it and
        // paying. Drop it so the attendee sees the real price rather than a
        // total we can no longer honour.
        onPromoRejected();
        setFormError(error.message + t("checkout.priceUpdated"));
        setSubmitting(false);
        return;
      }
      if (error instanceof ApiError && error.isSoldOut) {
        setFormError(
          error.remaining === 0
            ? t("checkout.soldOutDuring")
            : t("checkout.soldOutPartial", { message: error.message }),
        );
        onSoldOut();
      } else if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setFormError(
          Object.keys(error.fields).length > 0
            ? t("checkout.correctFields")
            : error.message,
        );
      } else {
        setFormError(t("checkout.failed"));
      }
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="checkout-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border-subtle bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="space-y-5 p-6">
        <div>
          <h2 id="checkout-title" className="text-lg font-semibold tracking-tight">
            {t("checkout.title")}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">{eventTitle}</p>
        </div>

        <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
          {lines.map((line) => (
            <li key={line.type.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{line.type.name}</p>
                <p className="text-xs text-foreground-muted">
                  {line.quantity} × {formatKZT(line.type.price_kzt)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">
                {lineTotal(line.type.price_kzt, line.quantity)}
              </p>
            </li>
          ))}
          {promo && (
            <li className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="truncate text-sm font-medium text-success">
                {t("checkout.promo", { code: promo.code })}
              </p>
              <p className="shrink-0 text-sm font-medium tabular-nums text-success">
                −{formatKZT(promo.discount_kzt)}
              </p>
            </li>
          )}
          <li className="flex items-center justify-between gap-4 bg-surface-muted/50 px-4 py-3">
            <p className="text-sm font-semibold">{t("checkout.total")}</p>
            <p className="text-base font-semibold tabular-nums">{formatTiyn(payableTiyn)}</p>
          </li>
        </ul>

        {formError && <Alert tone="error">{formError}</Alert>}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <BuyerFields
            buyer={buyer}
            errors={fieldErrors}
            disabled={submitting}
            nameLabel={t("checkout.nameLabel")}
            emailLabel={t("checkout.emailLabel")}
            emailHint={t("checkout.emailHint")}
            namePlaceholder={t("checkout.namePlaceholder")}
            emailPlaceholder={t("checkout.emailPlaceholder")}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={submitting} className="flex-1">
              {submitting
                ? t("checkout.processing")
                : t("checkout.pay", { amount: formatTiyn(payableTiyn) })}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => dialogRef.current?.close()}
            >
              {t("checkout.cancel")}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
