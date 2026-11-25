"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { PromoBox } from "@/components/promo-box";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BuyerFields, useBuyerDetails } from "@/components/buyer-fields";
import { toAnalyticsValue, trackPurchase } from "@/lib/analytics";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";
import { formatKZT, formatTiyn, toTiyn } from "@/lib/money";
import type { Hold, PromoPreview, TicketType } from "@/lib/types";

/**
 * Paying for held seats (SRS 4.6, 4.3.1).
 *
 * The countdown is the point: an attendee holding the last two seats in the
 * house needs to know how long they have, and a reservation that expires
 * silently while somebody types their name is worse than one that never
 * existed.
 */
export function SeatCheckout({
  orderID,
  eventID,
  eventSlug,
  campaignToken,
  onExpired,
  onCancelled,
}: {
  orderID: string;
  eventID: string;
  eventSlug: string;
  campaignToken?: string;
  /** The hold ran out; the caller puts the seat map back. */
  onExpired: () => void;
  onCancelled: () => void;
}) {
  const router = useRouter();
  const t = useT();

  const [hold, setHold] = useState<Hold | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const buyer = useBuyerDetails();
  const { name, email } = buyer;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // A promo code typed here, or the campaign from a scanned QR (SRS 4.14).
  const [promo, setPromo] = useState<PromoPreview | null>(null);

  /** True once the reservation has run out. Derived, never stored. */
  const expired = remaining !== null && remaining <= 0;

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const basket = await api.getHold(orderID, controller.signal);
        setHold(basket);
        setRemaining(basket.seconds_remaining);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        // The basket is already gone - expired, paid or released. Setting
        // state here is safe: it happens after an await, not during the
        // effect body.
        setRemaining(0);
      }
    })();

    return () => controller.abort();
  }, [orderID]);

  // The countdown runs off the server's own number of seconds, not off a
  // deadline compared against the browser's clock: a device an hour fast would
  // otherwise show a basket as expired the moment it was created.
  useEffect(() => {
    if (remaining === null || remaining <= 0) return;

    const timer = setTimeout(() => setRemaining((value) => (value ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await api.confirmHold(orderID, {
        buyer_name: name.trim(),
        buyer_email: email.trim(),
        ...(promo ? { promo_code: promo.code } : {}),
      });

      trackPurchase({
        slug: eventSlug,
        valueKZT: toAnalyticsValue(result.order.total_kzt),
        tickets: result.tickets.length,
        discounted: toAnalyticsValue(result.order.discount_kzt) > 0,
      });

      router.push(`/orders/${result.order.id}`);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        if (cause.code === "hold_expired") {
          setRemaining(0);
          return;
        }
        setError(Object.keys(cause.fields).length > 0 ? null : cause.message);
      } else {
        setError(t("auth.common.genericError"));
      }
      setSubmitting(false);
    }
  }

  async function cancel() {
    try {
      await api.releaseHold(orderID);
    } catch {
      // The hold expires on its own; nothing useful to say if the release
      // request itself fails.
    }
    onCancelled();
  }

  // Rendered rather than acted on: telling the attendee what happened and
  // letting them choose again beats a page that rearranges itself under them.
  if (expired) {
    return (
      <div className="space-y-3 rounded-xl border border-border-subtle bg-surface p-5">
        <Alert tone="info" title={t("seatCheckout.expiredTitle")}>
          {t("seatCheckout.expiredBody")}
        </Alert>
        <Button onClick={onExpired}>{t("seatCheckout.chooseAgain")}</Button>
      </div>
    );
  }

  if (!hold) {
    return <p className="text-sm text-foreground-muted">{t("seatCheckout.checking")}</p>;
  }

  // The held seats are the basket the promo is priced against.
  const lines = Object.values(
    hold.items.reduce<Record<string, { type: TicketType; quantity: number }>>((acc, item) => {
      const line = acc[item.ticket_type_id] ?? { type: { id: item.ticket_type_id } as TicketType, quantity: 0 };
      line.quantity += item.quantity;
      acc[item.ticket_type_id] = line;
      return acc;
    }, {}),
  );
  // The fee is a share of what is paid, so it shrinks with the discount; the
  // order page shows the exact figure the server charged.
  const subtotalTiyn = toTiyn(hold.subtotal_kzt);
  const discountTiyn = promo ? toTiyn(promo.discount_kzt) : 0;
  const feeTiyn = subtotalTiyn > 0
    ? Math.round(toTiyn(hold.estimated_processing_fee_kzt) * (subtotalTiyn - discountTiyn) / subtotalTiyn)
    : 0;
  const totalTiyn = subtotalTiyn - discountTiyn + feeTiyn;

  const minutes = Math.floor((remaining ?? 0) / 60);
  const seconds = String((remaining ?? 0) % 60).padStart(2, "0");

  return (
    <section className="space-y-4 rounded-xl border border-border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("seatCheckout.heading")}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {hold.items.length === 1 ? t("seatCheckout.seatOne") : t("seatCheckout.seatMany", { count: hold.items.length })} ·{" "}
            {hold.order_number}
          </p>
        </div>
        <p
          className={`text-sm font-semibold tabular-nums ${
            (remaining ?? 0) < 120 ? "text-danger" : "text-foreground-muted"
          }`}
          role="timer"
          aria-live="off"
        >
          {t("seatCheckout.left", { time: `${minutes}:${seconds}` })}
        </p>
      </div>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-foreground-muted">{t("seatCheckout.tickets")}</dt>
          <dd className="tabular-nums">{formatKZT(hold.subtotal_kzt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-foreground-muted">{t("seatCheckout.fee")}</dt>
          <dd className="tabular-nums">{formatTiyn(feeTiyn)}</dd>
        </div>
        {promo && (
          <div className="flex justify-between text-success">
            <dt>{t("checkout.promo", { code: promo.code })}</dt>
            <dd className="tabular-nums">−{formatKZT(promo.discount_kzt)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border-subtle pt-1 font-semibold">
          <dt>{t("seatCheckout.total")}</dt>
          <dd className="tabular-nums">{formatTiyn(totalTiyn)}</dd>
        </div>
      </dl>

      <PromoBox eventID={eventID} campaignToken={campaignToken} lines={lines} promo={promo} onChange={setPromo} />

      {error && <Alert>{error}</Alert>}

      <form onSubmit={submit} className="space-y-3" noValidate>
        <BuyerFields
          buyer={buyer}
          errors={fieldErrors}
          disabled={submitting}
          nameLabel={t("seatCheckout.name")}
          emailLabel={t("auth.common.email")}
          emailHint={t("seatCheckout.emailHint")}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={submitting}>
            {t("seatCheckout.pay", { amount: formatTiyn(totalTiyn) })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => void cancel()}
          >
            {t("seatCheckout.release")}
          </Button>
        </div>
      </form>
    </section>
  );
}
