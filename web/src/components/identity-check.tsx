"use client";

import { useRef, useState } from "react";

import { Spinner } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

/**
 * The identity step of paid-sales activation (SRS 4.5, UC2), as a document
 * check (BF-100). A real platform would send the document to a verification
 * provider; this student project only pretends to: any file passes after a
 * short "checking", and the file never leaves the browser.
 */
export function IdentityCheck({ onVerified, disabled }: { onVerified: () => void; disabled?: boolean }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "checking" | "verified">("idle");
  const [fileName, setFileName] = useState("");

  function chosen(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setState("checking");
    setTimeout(() => {
      setState("verified");
      onVerified();
    }, 1500);
  }

  return (
    <div className="mt-3 space-y-2" data-testid="identity-check">
      <input
        ref={input}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => chosen(event.target.files?.[0])}
        data-testid="identity-file"
      />
      {state === "verified" ? (
        <p className="text-sm font-semibold text-success" data-testid="identity-verified">
          ✓ {t("home.idVerified")} <span className="font-normal text-foreground-muted">({fileName})</span>
        </p>
      ) : state === "checking" ? (
        <p className="flex items-center gap-2 text-sm text-foreground-muted">
          <Spinner className="text-brand" />
          {t("home.idChecking")}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled}
          className="rounded-md border border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
          data-testid="identity-verify"
        >
          {t("home.idVerify")}
        </button>
      )}
      <p className="text-xs text-foreground-muted">{t("home.idNote")}</p>
    </div>
  );
}
