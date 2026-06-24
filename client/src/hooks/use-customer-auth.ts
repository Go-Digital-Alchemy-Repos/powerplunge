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

export function useCustomerAuth() {
  const [state, setState] = useState<CustomerAuthState>({
    customer: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const verifySession = useCallback(async () => {
    try {
      const response = await fetch("/api/customer/auth/verify-session", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.valid && data.customer) {
        setState({
          customer: data.customer,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({ customer: null, isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      setState({ customer: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

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

      setState({
        customer: data.customer,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const response = await fetch("/api/customer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setState({
        customer: data.customer,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    },
    []
  );

  const requestMagicLink = useCallback(async (email: string) => {
    const response = await fetch("/api/customer/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid or expired link");
      }

      setState({
        customer: data.customer,
        isLoading: false,
        isAuthenticated: true,
      });

      return data;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/customer/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {
      // Ignore logout transport errors; local state still clears.
    }
    setState({ customer: null, isLoading: false, isAuthenticated: false });
  }, []);

  const getAuthHeader = useCallback((): Record<string, string> => {
    return {};
  }, []);

  const getToken = useCallback(() => null, []);

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
