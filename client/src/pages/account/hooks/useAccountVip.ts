import { useQuery } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import type { VipData } from "../types";

export function useAccountVip() {
  const { isAuthenticated, getAuthHeader } = useCustomerAuth();

  const { data: vipData } = useQuery<VipData>({
    queryKey: ["/api/vip/customer-status"],
    queryFn: async () => {
      const res = await fetch("/api/customer/orders/vip-status", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to fetch VIP status");
      if (res.status === 404) return { isVip: false };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  return { vipData };
}
