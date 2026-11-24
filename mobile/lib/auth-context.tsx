import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, api } from "./client";
import type { User } from "./models";
import { clearSession, loadEmail, loadToken, saveSession } from "./session";

type Status = "loading" | "signedIn" | "signedOut";

interface AuthValue {
  user: User | null;
  status: Status;
  lastEmail: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  register: (input: { email: string; password: string; full_name?: string }) => Promise<User>;
  /** Re-read the account, e.g. after creating an event grants the organizer role. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [lastEmail, setLastEmail] = useState<string | null>(null);

  // Restore the session on launch. A token in the keychain is only a claim
  // about the past, so it is confirmed with the API before the app trusts it -
  // an Event Admin whose assignment was revoked should not get in.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [token, email] = await Promise.all([loadToken(), loadEmail()]);
      if (cancelled) return;

      setLastEmail(email);

      if (!token) {
        setStatus("signedOut");
        return;
      }

      try {
        const me = await api.me(token);
        if (cancelled) return;
        setUser(me);
        setStatus("signedIn");
      } catch (error) {
        if (cancelled) return;
        // A rejected token is stale; a network blip is not the user's fault, so
        // it does not wipe the stored credential.
        if (error instanceof ApiError && !error.isNetworkError) await clearSession();
        setStatus("signedOut");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await api.login({ email, password });
    await saveSession(response.access_token, response.user.email);
    setUser(response.user);
    setLastEmail(response.user.email);
    setStatus("signedIn");
    return response.user;
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; full_name?: string }) => {
      const response = await api.register(input);
      await saveSession(response.access_token, response.user.email);
      setUser(response.user);
      setLastEmail(response.user.email);
      setStatus("signedIn");
      return response.user;
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await clearSession();
        setUser(null);
        setStatus("signedOut");
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, status, lastEmail, signIn, register, refresh, signOut }),
    [user, status, lastEmail, signIn, register, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an <AuthProvider>");
  return context;
}
