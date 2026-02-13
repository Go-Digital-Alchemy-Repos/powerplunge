import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useToast } from "@/hooks/use-toast";
import type { AffiliateData, ConnectStatus } from "../types";

export function useAccountAffiliate() {
  const { isAuthenticated, getAuthHeader } = useCustomerAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showEsign, setShowEsign] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: affiliateData, isLoading: affiliateLoading } = useQuery<AffiliateData>({
    queryKey: ["/api/customer/affiliate-portal"],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to fetch affiliate data");
      if (res.status === 404) return { affiliate: null, referrals: [], stats: null };
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: connectStatus } = useQuery<ConnectStatus | null>({
    queryKey: ["/api/customer/affiliate/connect/status"],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal/connect/status", {
        headers: { ...getAuthHeader() },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch connect status");
      return res.json();
    },
    enabled: isAuthenticated && !!affiliateData?.affiliate,
  });

  const startConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal/connect/start", {
        method: "POST",
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start Stripe Connect");
      }
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
      toast({ title: "Stripe onboarding opened in new tab" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const signAgreementMutation = useMutation({
    mutationFn: async (data: { signatureName: string }) => {
      const res = await fetch("/api/customer/affiliate-portal/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to sign agreement");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/affiliate-portal"] });
      setShowEsign(false);
      setSignatureName("");
      setAgreedToTerms(false);
      toast({ title: "Welcome to the affiliate program!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const copyReferralLink = () => {
    if (affiliateData?.affiliate?.code) {
      const link = `${window.location.origin}?ref=${affiliateData.affiliate.code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Referral link copied!" });
    }
  };

  const generateQRCodeUrl = (code: string) => {
    const link = encodeURIComponent(`${window.location.origin}?ref=${code}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${link}&color=67e8f9&bgcolor=0a0a0a`;
  };

  const getNextPayoutDate = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    return nextMonday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  return {
    affiliateData,
    affiliateLoading,
    connectStatus,
    startConnectMutation,
    signAgreementMutation,
    showEsign,
    setShowEsign,
    signatureName,
    setSignatureName,
    agreedToTerms,
    setAgreedToTerms,
    copied,
    copyReferralLink,
    generateQRCodeUrl,
    getNextPayoutDate,
  };
}
