import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useToast } from "@/hooks/use-toast";
import type { SupportTicket, SupportForm } from "../types";

export function useAccountSupport() {
  const { isAuthenticated, getAuthHeader } = useCustomerAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [supportForm, setSupportForm] = useState<SupportForm>({
    subject: "",
    message: "",
    orderId: "",
    type: "general",
  });

  const { data: supportTickets, isLoading: ticketsLoading } = useQuery<{ tickets: SupportTicket[] }>({
    queryKey: ["/api/customer/orders/support"],
    queryFn: async () => {
      const res = await fetch("/api/customer/orders/support", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to fetch support tickets");
      if (res.status === 404) return { tickets: [] };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; orderId?: string; type: string }) => {
      const res = await fetch("/api/customer/orders/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data.orderId ? data : { ...data, orderId: undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create support ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders/support"] });
      setSupportForm({ subject: "", message: "", orderId: "", type: "general" });
      toast({ title: "Support request submitted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await fetch(`/api/customer/orders/support/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders/support"] });
      toast({ title: "Reply sent!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  return {
    supportForm,
    setSupportForm,
    supportTickets,
    ticketsLoading,
    createTicketMutation,
    replyMutation,
  };
}
