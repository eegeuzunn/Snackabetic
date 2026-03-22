import { useCallback, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, saveToken } from "../services/authStorage";
import { setUnauthorizedHandler } from "../services/api";
import { login as apiLogin } from "../services/authService";

export default function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  // ── Bootstrap: load persisted token on app start ──────────────────────
  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const storedToken = await getToken();
        if (mounted) {
          setToken(storedToken);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // ── 401 handler: clear token → triggers re-render → Login screen shown ─
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearToken();
      setToken(null);
    });
  }, []);

  // ── Sign in: real API call ─────────────────────────────────────────────
  const signIn = useCallback(async ({ email, password }) => {
    if (!email || !password) {
      throw new Error("Email ve şifre zorunludur.");
    }

    // apiLogin returns AuthResponse { token, user } (envelope already unwrapped)
    const { token: jwt } = await apiLogin(email.trim(), password.trim());
    await saveToken(jwt);
    setToken(jwt);
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await clearToken();
    setToken(null);
  }, []);

  return useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      signIn,
      signOut,
    }),
    [isLoading, signIn, signOut, token],
  );
}
