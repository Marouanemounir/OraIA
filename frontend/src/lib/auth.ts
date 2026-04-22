"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type UserResponse } from "./api";

/**
 * Hook that reads the current user from localStorage.
 * Returns { user, loading, refresh }.
 */
export function useAuth() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("ora_user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { user, loading, refresh };
}

/**
 * Redirect to /login if no token is present.
 */
export function requireAuth(router: ReturnType<typeof useRouter>): void {
  const token = api.getToken();
  if (!token) {
    router.replace("/login");
  }
}
