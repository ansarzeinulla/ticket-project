import { describe, expect, it } from "vitest";

import { russianPlural } from "./translate";

describe("russianPlural", () => {
  const form = (n: number) => russianPlural(n, "билет", "билета", "билетов");
  it("picks the right form", () => {
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map(form)).toEqual([
      "билет", "билета", "билета", "билетов", "билетов", "билетов", "билетов",
      "билет", "билета", "билетов", "билет", "билетов",
    ]);
  });
});
