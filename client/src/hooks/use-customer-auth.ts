import { useState, useEffect, useCallback } from "react";

interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  avatarUrl?: string | null;
}

interface CustomerAuthState {
  customer: Customer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const STORAGE_KEY = "customerSessionToken";

export function useCustomerAuth() {
  const [state, setState] = useState<CustomerAuthState>({
    customer: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const getToken = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY);
  }, []);

  const setToken = useCallback((token: string) => {
    localStorage.setItem(STORAGE_KEY, token);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const verifySession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ customer: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await fetch("/api/customer/auth/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.valid && data.customer) {
        setState({
          customer: data.customer,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        clearToken();
        setState({ customer: null, isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      clearToken();
      setState({ customer: null, isLoading: false, isAuthenticated: false });
    }
  }, [getToken, clearToken]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/customer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      setToken(data.sessionToken);
      setState({
        customer: data.customer,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    },
    [setToken]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const response = await fetch("/api/customer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setToken(data.sessionToken);
      setState({
        customer: data.customer,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    },
    [setToken]
  );

  const requestMagicLink = useCallback(async (email: string) => {
    const response = await fetch("/api/customer/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send login link");
    }

    return data;
  }, []);

  const verifyMagicLink = useCallback(
    async (token: string) => {
      const response = await fetch("/api/customer/auth/verify-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid or expired link");
      }

      setToken(data.sessionToken);
      setState({
        customer: data.customer,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    },
    [setToken]
  );

  const logout = useCallback(async () => {
    // Best-effort clear any admin session cookie
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {
      // Ignore — admin logout is best-effort
    }
    clearToken();
    setState({ customer: null, isLoading: false, isAuthenticated: false });
  }, [clearToken]);

  const getAuthHeader = useCallback((): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  return {
    ...state,
    login,
    register,
    requestMagicLink,
    verifyMagicLink,
    logout,
    getAuthHeader,
    getToken,
    refreshSession: verifySession,
  };
}
