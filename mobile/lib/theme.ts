/**
 * The app's palette matches the website (BF-100): a near-black top bar and
 * banners, light grey screens with white cards, and one crimson for actions.
 * No gradients, small corners. The scanner's camera screens keep their own
 * black backdrop, and its green / red results stay the loudest thing in the app.
 */
export const theme = {
  top: "#14161b",
  topMuted: "#a5a7ae",
  bg: "#f7f7f8",
  surface: "#ffffff",
  surfaceAlt: "#f0f0f2",
  border: "#e4e4e8",
  text: "#14161b",
  textMuted: "#5f6168",
  brand: "#e8174f",
  brandDark: "#c3103f",
  brandSoft: "#ffe0e8",
  accent: "#e8174f",
  accentSoft: "#ffe0e8",
  success: "#1b7f3b",
  successBright: "#22c55e",
  danger: "#c62828",
  dangerBright: "#ef4444",
  warning: "#a15c00",
} as const;

export const radius = { sm: 4, md: 6, lg: 8 } as const;
