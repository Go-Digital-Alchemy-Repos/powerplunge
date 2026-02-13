import { useQuery } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import type { CustomerData } from "../types";

export function useAccountOrders() {
  const { isAuthenticated, getAuthHeader } = useCustomerAuth();

  const { data, isLoading } = useQuery<CustomerData>({
    queryKey: ["/api/customer/orders/orders"],
    queryFn: async () => {
      const res = await fetch("/api/customer/orders/orders", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  return { orders: data?.orders || [], isLoading };
}
