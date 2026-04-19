import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Restaurant } from "./types";
import { apiFetch } from "../lib/api";

interface OwnerInfo {
  email: string;
}

interface AuthState {
  token: string | null;
  owner: OwnerInfo | null;
  restaurant: Restaurant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    restaurantName: string;
    restaurantSlug?: string;
    currency?: string;
  }) => Promise<void>;
  logout: () => void;
  updateRestaurant: (restaurant: Restaurant) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = "ai-waiter:owner-token";

interface AuthMeResponse {
  owner: OwnerInfo;
  restaurant: Restaurant;
}

interface AuthLoginRegisterResponse extends AuthMeResponse {
  token: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setOwner(null);
      setRestaurant(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<AuthMeResponse>("/api/auth/me", { token });
        if (cancelled) return;
        setOwner(data.owner);
        setRestaurant(data.restaurant);
      } catch {
        if (cancelled) return;
        setToken(null);
        setOwner(null);
        setRestaurant(null);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const applySession = useCallback((data: AuthLoginRegisterResponse) => {
    setToken(data.token);
    setOwner(data.owner);
    setRestaurant(data.restaurant);
    try {
      window.localStorage.setItem(STORAGE_KEY, data.token);
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<AuthLoginRegisterResponse>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      applySession(data);
    },
    [applySession],
  );

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      restaurantName: string;
      restaurantSlug?: string;
      currency?: string;
    }) => {
      const data = await apiFetch<AuthLoginRegisterResponse>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      );
      applySession(data);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    setToken(null);
    setOwner(null);
    setRestaurant(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const updateRestaurant = useCallback((next: Restaurant) => {
    setRestaurant(next);
  }, []);

  const value = useMemo(
    () => ({
      token,
      owner,
      restaurant,
      loading,
      login,
      register,
      logout,
      updateRestaurant,
    }),
    [
      token,
      owner,
      restaurant,
      loading,
      login,
      register,
      logout,
      updateRestaurant,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
