import { useCallback, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, saveToken } from "../services/authStorage";
import { setUnauthorizedHandler } from "../services/api";
import {
  login as apiLogin,
  register as apiRegister,
  me as apiMe,
} from "../services/authService";

export default function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // ── Bootstrap: load persisted token on app start ──────────────────────
  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const storedToken = await getToken();
        if (!mounted) return;

        if (!storedToken) {
          setToken(null);
          return;
        }

        try {
          const meData = await apiMe();
          if (!meData?.id) {
            await clearToken();
            if (mounted) {
              setToken(null);
            }
            return;
          }
          if (mounted) {
            setToken(storedToken);
          }
        } catch (error) {
          await clearToken();
          if (mounted) {
            setToken(null);
          }
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

    const { token: jwt } = await apiLogin(email.trim(), password.trim());
    await saveToken(jwt);
    setToken(jwt);
  }, []);

  // ── Sign up: register then auto sign in, then show onboarding ────────
  const signUp = useCallback(
    async ({ email, password, firstName, lastName, phone }) => {
      if (!email || !password) {
        throw new Error("Email ve şifre zorunludur.");
      }

      const { token: jwt } = await apiRegister(
        email.trim(),
        password.trim(),
        firstName?.trim(),
        lastName?.trim(),
        phone?.trim(),
      );
      await saveToken(jwt);
      setNeedsOnboarding(true);
      setToken(jwt);
    },
    [],
  );

  // ── Complete onboarding ───────────────────────────────────────────────
  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
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
      needsOnboarding,
      signIn,
      signUp,
      signOut,
      completeOnboarding,
    }),
    [
      isLoading,
      needsOnboarding,
      signIn,
      signUp,
      signOut,
      token,
      completeOnboarding,
    ],
  );
}
