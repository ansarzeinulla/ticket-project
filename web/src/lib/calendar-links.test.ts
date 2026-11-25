import { describe, expect, it } from "vitest";

import { googleCalendarURL, outlookCalendarURL } from "./calendar-links";

// Google answers "400 Bad Request" to a calendar link much over 8 000
// characters; a long Cyrillic description used to push links past that (BF-100).
const longEvent = {
  id: "d1000000-0000-4000-0010-000000000001",
  title: "«Щелкунчик» — волшебная новогодняя сказка",
  starts_at: "2026-12-16T13:00:00Z",
  ends_at: "2026-12-16T15:00:00Z",
  timezone: "Asia/Almaty",
  description: "Ж".repeat(2000),
  venue_name: "Государственный театр драмы и комедии",
  venue_address: "проспект Мангилик Ел, 4, Астана",
  url: "http://localhost:3000/events/shchelkunchik",
};

describe("calendar links", () => {
  it.each([
    ["Google", googleCalendarURL],
    ["Outlook", outlookCalendarURL],
  ])("%s stays under the length calendar services accept", (_name, build) => {
    const url = build(longEvent);
    expect(url.length).toBeLessThanOrEqual(7000);
    // The link back to the event page always survives the trimming.
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain(longEvent.url);
  });

  it("keeps a short description whole", () => {
    const url = googleCalendarURL({ ...longEvent, description: "Короткое описание." });
    expect(new URL(url).searchParams.get("details")).toContain("Короткое описание.");
  });
});
