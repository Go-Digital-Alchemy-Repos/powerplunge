import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeClient } from "@/lib/realtime/socketClient";

interface UseRealtimeNotificationsOptions {
  role: "admin" | "customer";
  token?: string;
  enabled?: boolean;
}

export function useRealtimeNotifications({ role, token, enabled = true }: UseRealtimeNotificationsOptions) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!enabled) return;
    if (role === "customer" && !token) return;

    realtimeClient.connect(role, token);

    const unsubNew = realtimeClient.on("notif:new", (payload) => {
      const prefix = role === "admin" ? "/api/admin/notifications" : "/api/customer/notifications";

      queryClient.setQueryData<{ notifications: any[]; total: number }>(
        [prefix],
        (old) => {
          if (!old) return old;
          const exists = old.notifications.some((n: any) => n.id === payload.notification.id);
          if (exists) return old;
          return {
            ...old,
            notifications: [payload.notification, ...old.notifications].slice(0, 50),
            total: old.total + 1,
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: [`${prefix}/unread-count`] });
    });

    const unsubCount = realtimeClient.on("notif:unread_count", (payload) => {
      const prefix = role === "admin" ? "/api/admin/notifications" : "/api/customer/notifications";
      queryClient.setQueryData<{ count: number }>(
        [`${prefix}/unread-count`],
        { count: payload.unreadCount }
      );
    });

    const unsubTicket = realtimeClient.on("ticket:updated", () => {
      if (role === "admin") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/support"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/customer/order-tracking/support"] });
      }
    });

    cleanupRef.current = [unsubNew, unsubCount, unsubTicket];

    return () => {
      for (const unsub of cleanupRef.current) unsub();
      cleanupRef.current = [];
      realtimeClient.disconnect();
    };
  }, [role, token, enabled, queryClient]);
}
