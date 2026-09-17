// Placeholder events so the catalogue can be laid out before the API exists.
// Replaced by real API calls once the public events endpoint lands.

export type MockEvent = {
  id: string;
  title: string;
  city: string;
  startsAt: string;
  priceFromKzt: number;
};

export const mockEvents: MockEvent[] = [
  {
    id: "1",
    title: "Almaty Jazz Night",
    city: "Almaty",
    startsAt: "2026-10-10T19:00:00+05:00",
    priceFromKzt: 5000,
  },
  {
    id: "2",
    title: "Astana Tech Meetup",
    city: "Astana",
    startsAt: "2026-10-17T18:30:00+05:00",
    priceFromKzt: 0,
  },
  {
    id: "3",
    title: "Shymkent Stand-up Evening",
    city: "Shymkent",
    startsAt: "2026-10-24T20:00:00+05:00",
    priceFromKzt: 3500,
  },
];
