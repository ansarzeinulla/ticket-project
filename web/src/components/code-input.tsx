"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Six boxes for a 6-digit code (BF-100). Typing moves to the next box,
 * Backspace to the previous one, and pasting a whole code fills all six.
 */
export function CodeInput({
  value,
  onChange,
  disabled,
  label,
  invalid,
  testID = "code-input",
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  label: string;
  invalid?: boolean;
  testID?: string;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focus = (i: number) => boxes.current[Math.max(0, Math.min(5, i))]?.focus();

  function set(i: number, typed: string) {
    const clean = typed.replace(/\D/g, "");
    if (!clean) return;
    // Several digits at once (autofill, a fast typist): spread them forward.
    const next = (value.slice(0, i) + clean + value.slice(i + clean.length)).slice(0, 6);
    onChange(next);
    focus(i + clean.length);
  }

  function key(i: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (event.key === "ArrowLeft") {
      focus(i - 1);
    } else if (event.key === "ArrowRight") {
      focus(i + 1);
    }
  }

  function paste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focus(pasted.length);
  }

  return (
    <div role="group" aria-label={label} className="flex gap-2" data-testid={testID}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(node) => {
            boxes.current[i] = node;
          }}
          value={digit}
          onChange={(event) => set(i, event.target.value)}
          onKeyDown={(event) => key(i, event)}
          onPaste={paste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          aria-label={`${label} ${i + 1}`}
          className={`h-14 w-12 rounded-md border bg-surface text-center text-2xl font-bold tabular-nums outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60 ${
            invalid ? "border-danger" : "border-border-subtle"
          }`}
          data-testid={`${testID}-${i}`}
        />
      ))}
    </div>
  );
}
