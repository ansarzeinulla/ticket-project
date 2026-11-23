"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { ApiError, api, campaignQRURL } from "@/lib/api";
import { formatKZT } from "@/lib/money";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { Campaign, DiscountType } from "@/lib/types";

const DISCOUNT_TYPES = ["percentage", "fixed_amount"] as const;

/** The organizer's promo-code and campaign-QR workspace for one event. */
export function CampaignManager({ eventID }: { eventID: string }) {
  const t = useT();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("20");
  const [maxRedemptions, setMaxRedemptions] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busyID, setBusyID] = useState<string | null>(null);
  const [copiedID, setCopiedID] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setCampaigns(await api.listCampaigns(eventID, signal));
      setLoadError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setLoadError(cause instanceof ApiError ? cause.message : t("org.campaigns.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [eventID, t]);

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = t("org.campaigns.errName");
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(code.trim())) {
      errors.code = t("org.campaigns.errCode");
    }
    if (!/^\d+(\.\d{1,2})?$/.test(discountValue.trim()) || Number(discountValue) <= 0) {
      errors.discount_value = t("org.campaigns.errDiscount");
    } else if (discountType === "percentage" && Number(discountValue) > 100) {
      errors.discount_value = t("org.campaigns.errPercent");
    }

    let limit: number | undefined;
    if (maxRedemptions.trim() !== "") {
      limit = Number(maxRedemptions);
      if (!Number.isInteger(limit) || limit <= 0) {
        errors.max_redemptions = t("org.campaigns.errLimit");
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createCampaign(eventID, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        // Sent as a string so the decimal reaches numeric(14,2) untouched.
        discount_value: discountValue.trim(),
        ...(limit !== undefined ? { max_redemptions: limit } : {}),
      });
      setCampaigns((current) => [created, ...current]);
      setName("");
      setCode("");
      setMaxRedemptions("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setFormError(
          Object.keys(cause.fields).length > 0
            ? t("auth.common.fixFields")
            : cause.message,
        );
      } else {
        setFormError(t("org.campaigns.createFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(campaign: Campaign) {
    setBusyID(campaign.id);
    setLoadError(null);
    try {
      const updated = await api.setCampaignActive(campaign.id, campaign.status !== "active");
      setCampaigns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : t("org.types.changeFailed"));
    } finally {
      setBusyID(null);
    }
  }

  async function remove(campaign: Campaign) {
    setBusyID(campaign.id);
    setLoadError(null);
    try {
      await api.deleteCampaign(campaign.id);
      setCampaigns((current) => current.filter((c) => c.id !== campaign.id));
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : t("org.campaigns.deleteFailed"));
    } finally {
      setBusyID(null);
    }
  }

  async function copyLink(campaign: Campaign) {
    try {
      await navigator.clipboard.writeText(campaign.campaign_url);
      setCopiedID(campaign.id);
      setTimeout(() => setCopiedID(null), 2000);
    } catch {
      setLoadError(t("org.campaigns.copyFailed"));
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("org.campaigns.heading")}</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          {t("org.campaigns.subtitle")}
        </p>
      </div>

      {loadError && <Alert tone="error">{loadError}</Alert>}

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-6 text-sm text-foreground-muted">
          <Spinner />
          {t("org.campaigns.loading")}
        </div>
      ) : campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle bg-surface p-6 text-center text-sm text-foreground-muted">
          {t("org.campaigns.none")}
        </p>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="rounded-xl border border-border-subtle bg-surface p-5"
            >
              <div className="flex flex-wrap items-start gap-5">
                <div className="shrink-0 rounded-lg bg-white p-2">
                  {/* A per-campaign API image on another origin, served no-store:
                      routing it through the image optimizer would cache and
                      re-encode it, and a re-encoded QR may not scan. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campaignQRURL(campaign.id)}
                    alt={t("org.campaigns.qrAlt", { code: campaign.code })}
                    width={112}
                    height={112}
                    className="h-28 w-28"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-semibold">{campaign.code}</span>
                    <StatusPill status={campaign.status} />
                    <span className="text-sm text-foreground-muted">{campaign.name}</span>
                  </div>

                  <p className="text-sm">
                    <span className="font-medium">
                      {campaign.discount_type === "percentage"
                        ? t("org.campaigns.off", { amount: `${Number(campaign.discount_value)}%` })
                        : t("org.campaigns.off", { amount: formatKZT(campaign.discount_value) })}
                    </span>
                    <span className="ml-3 text-foreground-muted">
                      {campaign.max_redemptions
                        ? t("org.campaigns.usedOf", { used: campaign.redemption_count, max: campaign.max_redemptions })
                        : t("org.campaigns.usedUnlimited", { used: campaign.redemption_count })}
                    </span>
                  </p>

                  <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-foreground-muted">{t("org.analytics.orders")}</dt>
                      <dd className="mt-0.5 font-medium">{campaign.orders_count}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-foreground-muted">{t("org.analytics.tickets")}</dt>
                      <dd className="mt-0.5 font-medium">{campaign.tickets_sold}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-foreground-muted">{t("org.analytics.revenue")}</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatKZT(campaign.gross_revenue_kzt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-foreground-muted">{t("org.campaigns.discounted")}</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatKZT(campaign.discount_given_kzt)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      readOnly
                      value={campaign.campaign_url}
                      aria-label={t("org.campaigns.linkLabel", { code: campaign.code })}
                      onFocus={(event) => event.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface-muted/50 px-3 py-2 font-mono text-xs text-foreground-muted"
                    />
                    <Button size="sm" variant="secondary" onClick={() => void copyLink(campaign)}>
                      {copiedID === campaign.id ? t("org.campaigns.copied") : t("org.campaigns.copy")}
                    </Button>
                    <a
                      href={campaignQRURL(campaign.id)}
                      download={`biletflow-campaign-${campaign.code}.png`}
                      className="inline-flex items-center rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
                    >
                      {t("org.campaigns.downloadQR")}
                    </a>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyID === campaign.id}
                      disabled={busyID !== null || campaign.status === "exhausted"}
                      onClick={() => void toggleActive(campaign)}
                    >
                      {campaign.status === "active" ? t("org.campaigns.disable") : t("org.campaigns.enable")}
                    </Button>
                    {campaign.redemption_count === 0 && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyID !== null}
                        onClick={() => void remove(campaign)}
                      >
                        {t("org.types.delete")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleCreate}
        noValidate
        className="space-y-4 rounded-xl border border-border-subtle bg-surface p-5"
      >
        <h3 className="text-sm font-semibold">{t("org.campaigns.createHeading")}</h3>

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <TextField
            label={t("org.campaigns.name")}
            name="name"
            placeholder={t("org.campaigns.namePlaceholder")}
            required
            value={name}
            error={fieldErrors.name}
            disabled={submitting}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label={t("org.campaigns.code")}
            name="code"
            placeholder="SPRING20"
            hint={t("org.campaigns.codeHint")}
            required
            value={code}
            error={fieldErrors.code}
            disabled={submitting}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
          <SelectField
            label={t("org.campaigns.discountType")}
            name="discount_type"
            options={DISCOUNT_TYPES}
            optionLabel={(option) => t(`org.campaigns.types.${option as DiscountType}`)}
            value={discountType}
            error={fieldErrors.discount_type}
            disabled={submitting}
            onChange={(event) => setDiscountType(event.target.value as DiscountType)}
          />
          <TextField
            label={discountType === "percentage" ? t("org.campaigns.percentOff") : t("org.campaigns.kztOff")}
            name="discount_value"
            inputMode="decimal"
            placeholder={discountType === "percentage" ? "20" : "1500"}
            required
            value={discountValue}
            error={fieldErrors.discount_value}
            disabled={submitting}
            onChange={(event) => setDiscountValue(event.target.value)}
          />
          <TextField
            label={t("org.campaigns.maxRedemptions")}
            name="max_redemptions"
            type="number"
            min={1}
            step={1}
            placeholder={t("org.eventCard.unlimited")}
            hint={t("org.campaigns.maxHint")}
            value={maxRedemptions}
            error={fieldErrors.max_redemptions}
            disabled={submitting}
            onChange={(event) => setMaxRedemptions(event.target.value)}
          />
        </div>

        <Button type="submit" loading={submitting}>
          {submitting ? t("org.form.creating") : t("org.campaigns.create")}
        </Button>
      </form>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-soft text-success",
  disabled: "bg-surface-muted text-foreground-muted",
  exhausted: "bg-warning-soft text-warning",
  expired: "bg-danger-soft text-danger",
  draft: "bg-surface-muted text-foreground-muted",
};

const STATUS_LABELS: Record<string, MessageKey> = {
  active: "org.campaigns.status.active",
  disabled: "org.campaigns.status.disabled",
  exhausted: "org.campaigns.status.exhausted",
  expired: "org.campaigns.status.expired",
  draft: "org.campaigns.status.draft",
};

function StatusPill({ status }: { status: string }) {
  const t = useT();
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? STATUS_STYLES.draft
      }`}
    >
      {STATUS_LABELS[status] ? t(STATUS_LABELS[status]) : status}
    </span>
  );
}
