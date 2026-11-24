import { deletePref, getPref, setPref } from "./prefs";

/**
 * The access token lives in the device keychain / keystore, not in plain
 * AsyncStorage. A scanner is a shared device that sits on a table at a venue
 * entrance, so the credential has to be protected at rest.
 */
const TOKEN_KEY = "biletflow.access_token";
const EMAIL_KEY = "biletflow.email";

export async function saveSession(token: string, email: string): Promise<void> {
  await setPref(TOKEN_KEY, token);
  await setPref(EMAIL_KEY, email);
}

export function loadToken(): Promise<string | null> {
  return getPref(TOKEN_KEY);
}

export function loadEmail(): Promise<string | null> {
  return getPref(EMAIL_KEY);
}

export async function clearSession(): Promise<void> {
  await deletePref(TOKEN_KEY);
  await deletePref(EMAIL_KEY);
}
