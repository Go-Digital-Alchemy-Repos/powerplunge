import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { DollarSign, Link2, Eye, Wallet, TrendingUp, Trophy, CheckCircle, XCircle, Clock, Settings, Users, Play, FileSearch, AlertCircle, AlertTriangle, CreditCard, ShieldAlert, Mail, Ticket, Copy, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import AdminNav from "@/components/admin/AdminNav";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";

interface LeaderboardEntry {
  affiliateId: string;
  affiliateCode: string;
  customerName: string;
  email: string;
  status: string;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  totalOrders: number;
  conversionRate: number;
  createdAt: string;
}

interface AffiliateProfile {
  id: string;
  affiliateCode: string;
  status: string;
  totalEarnings: number;
  pendingBalance: number;
  paidBalance: number;
  approvedBalance: number;
  totalReferrals: number;
  totalSales: number;
  paypalEmail?: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  ffEnabled?: boolean;
  payoutAccount?: {
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    country?: string;
    currency?: string;
  };
}

interface Commission {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  customerName: string;
  customerEmail: string;
}

interface ReferredCustomer {
  customerId: string;
  customerName: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  firstOrderDate: string;
  lastOrderDate: string;
}

interface Payout {
  id: string;
  affiliateId: string;
  amount: number;
  paymentMethod: string;
  paymentDetails?: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
  notes?: string;
  stripeTransferId?: string;
  payoutBatchId?: string;
  connectStatus?: string;
}

interface BatchRunResult {
  batchId: string;
  totals: number;
  count: number;
  errors?: string[];
  preview?: { affiliateId: string; amount: number; email: string }[];
}

interface FlaggedCommission {
  id: string;
  affiliateCode: string;
  affiliateName: string;
  affiliateEmail: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  flagReason: string | null;
  flagDetails: string | null;
  flaggedAt: string | null;
  customerName: string;
  customerEmail: string;
  customerIp: string | null;
  createdAt: string;
}

interface AffiliateInvite {
  id: string;
  inviteCode: string;
  targetEmail: string | null;
  targetName: string | null;
  createdByAdminId: string | null;
  usedByAffiliateId: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  timesUsed: number;
  notes: string | null;
  createdAt: string;
  createdByAdmin: { id: string; email: string } | null;
  usedByAffiliate: { id: string; code: string; customerName: string; customerEmail: string } | null;
  isExpired: boolean;
  isExhausted: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  active: "bg-green-500/20 text-green-500 border-green-500/30",
  suspended: "bg-red-500/20 text-red-500 border-red-500/30",
  approved: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  paid: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-500 border-red-500/30",
  void: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  flagged: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  self_referral: "bg-red-500/20 text-red-400 border-red-500/30",
  coupon_abuse: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

// Collapsible Notes Component for payout metadata
function CollapsiblePayoutNotes({ notes }: { notes: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  
  if (!notes || notes === "-") {
    return <span className="text-muted-foreground">-</span>;
  }
  
  // Try to parse as JSON metadata
  let parsedNotes: { referralIds?: string[]; referralAmounts?: Record<string, number>; createdAmount?: number; periodStart?: string; periodEnd?: string } | null = null;
  try {
    parsedNotes = JSON.parse(notes);
  } catch {
    // Not JSON, display as plain text
    return <span className="text-muted-foreground text-xs">{notes}</span>;
  }
  
  if (!parsedNotes?.referralIds) {
    return <span className="text-muted-foreground text-xs">{notes}</span>;
  }
  
  const referralCount = parsedNotes.referralIds.length;
  
  const copyReferralIds = () => {
    navigator.clipboard.writeText(parsedNotes!.referralIds!.join(", "));
    toast({
      title: "Copied",
      description: `${referralCount} referral ID(s) copied to clipboard`,
    });
  };
  
  return (
    <div className="max-w-xs">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="toggle-notes"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {referralCount} referral{referralCount !== 1 ? "s" : ""}
        </button>
        <button
          onClick={copyReferralIds}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Copy referral IDs"
          data-testid="copy-referral-ids"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
      {expanded && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-xs break-all max-h-32 overflow-y-auto">
          {parsedNotes.referralIds.map((id, idx) => (
            <div key={id} className="truncate">
              {id}
              {parsedNotes.referralAmounts?.[id] && (
                <span className="text-muted-foreground ml-1">
                  (${(parsedNotes.referralAmounts[id] / 100).toFixed(2)})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminAffiliates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "payouts" | "review" | "invites">("leaderboard");
  const [profileTab, setProfileTab] = useState<"commissions" | "customers" | "payouts">("commissions");
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutNote, setPayoutNote] = useState<string>("");
  const [batchResult, setBatchResult] = useState<BatchRunResult | null>(null);
  const [batchOnlyFilter, setBatchOnlyFilter] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [selectedFlaggedId, setSelectedFlaggedId] = useState<string | null>(null);
  
  // Invite form state
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    targetEmail: "",
    targetName: "",
    maxUses: 1,
    expiresInDays: 7,
    notes: "",
  });

  // Fetch leaderboard
  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/admin/affiliates-v2/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/affiliates-v2/leaderboard?limit=50", { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  // Fetch affiliate profile
  const { data: affiliateProfile } = useQuery<AffiliateProfile>({
    queryKey: ["/api/admin/affiliates-v2", selectedAffiliateId, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/affiliates-v2/${selectedAffiliateId}/profile`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!selectedAffiliateId,
  });

  // Fetch commissions for selected affiliate
  const { data: commissions } = useQuery<Commission[]>({
    queryKey: ["/api/admin/affiliates-v2", selectedAffiliateId, "commissions"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/affiliates-v2/${selectedAffiliateId}/commissions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch commissions");
      return res.json();
    },
    enabled: !!selectedAffiliateId && profileTab === "commissions",
  });

  // Fetch referred customers
  const { data: referredCustomers } = useQuery<ReferredCustomer[]>({
    queryKey: ["/api/admin/affiliates-v2", selectedAffiliateId, "customers"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/affiliates-v2/${selectedAffiliateId}/referred-customers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    enabled: !!selectedAffiliateId && profileTab === "customers",
  });

  // Fetch payouts for selected affiliate
  const { data: affiliatePayouts } = useQuery<Payout[]>({
    queryKey: ["/api/admin/affiliates-v2", selectedAffiliateId, "payouts"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/affiliates-v2/${selectedAffiliateId}/payouts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    enabled: !!selectedAffiliateId && profileTab === "payouts",
  });

  // Fetch all pending payouts
  const { data: allPayouts } = useQuery<Payout[]>({
    queryKey: ["/api/admin/payouts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payouts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    enabled: activeTab === "payouts",
  });

  // Fetch flagged commissions for review queue
  const { data: flaggedCommissions, isLoading: loadingFlagged } = useQuery<FlaggedCommission[]>({
    queryKey: ["/api/admin/affiliates-v2/commissions/flagged"],
    queryFn: async () => {
      const res = await fetch("/api/admin/affiliates-v2/commissions/flagged", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch flagged commissions");
      return res.json();
    },
    enabled: activeTab === "review",
  });

  // Fetch affiliate invites
  const { data: affiliateInvites, isLoading: loadingInvites } = useQuery<AffiliateInvite[]>({
    queryKey: ["/api/admin/affiliate-invites"],
    queryFn: async () => {
      const res = await fetch("/api/admin/affiliate-invites", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json();
    },
    enabled: activeTab === "invites",
  });

  // Create invite mutation — uses /send endpoint so the email is delivered
  const createInviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      const res = await fetch("/api/admin/affiliate-invites/send", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: data.targetEmail || undefined,
          targetName: data.targetName || undefined,
          maxUses: data.maxUses,
          expiresInDays: data.expiresInDays > 0 ? data.expiresInDays : undefined,
          notes: data.notes || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create invite");
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-invites"] });
      setShowCreateInvite(false);
      setInviteForm({ targetEmail: "", targetName: "", maxUses: 1, expiresInDays: 7, notes: "" });
      if (data.emailSent) {
        toast({ title: "Invite created & sent", description: `Email sent to ${data.invite?.targetEmail}` });
      } else {
        toast({ title: "Invite created", description: data.emailError ? `Email could not be sent: ${data.emailError}` : "Invite link created (no email sent)" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Resend invite email for an existing invite
  const resendInviteMutation = useMutation({
    mutationFn: async (invite: AffiliateInvite) => {
      const res = await fetch(`/api/admin/affiliate-invites/${invite.id}/resend`, {
        credentials: "include",
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to resend invite");
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-invites"] });
      if (data.emailSent) {
        toast({ title: "Invite resent", description: `Email sent to ${data.invite?.targetEmail}` });
      } else {
        toast({ title: "Failed to send", description: data.emailError || "Email could not be sent", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete invite mutation
  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(`/api/admin/affiliate-invites/${inviteId}`, {
        credentials: "include",
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete invite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-invites"] });
      toast({ title: "Invite deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete affiliate mutation
  const deleteAffiliateMutation = useMutation({
    mutationFn: async (affiliateId: string) => {
      const res = await fetch(`/api/admin/affiliates-v2/${affiliateId}`, {
        credentials: "include",
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete affiliate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2/leaderboard"] });
      setSelectedAffiliateId(null);
      toast({ title: "Affiliate deleted", description: "The affiliate and all related data have been permanently removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleFfMutation = useMutation({
    mutationFn: async ({ affiliateId, ffEnabled }: { affiliateId: string; ffEnabled: boolean }) => {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ffEnabled }),
      });
      if (!res.ok) throw new Error("Failed to update F&F setting");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2", variables.affiliateId, "profile"] });
      toast({ title: variables.ffEnabled ? "F&F enabled" : "F&F disabled", description: `Friends & Family code has been ${variables.ffEnabled ? "enabled" : "disabled"} for this affiliate.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Review approve mutation
  const reviewApproveMutation = useMutation({
    mutationFn: async ({ commissionId, notes }: { commissionId: string; notes?: string }) => {
      const res = await fetch(`/api/admin/affiliates-v2/commissions/${commissionId}/review-approve`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2/commissions/flagged"] });
      setSelectedFlaggedId(null);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Review void mutation
  const reviewVoidMutation = useMutation({
    mutationFn: async ({ commissionId, notes }: { commissionId: string; notes: string }) => {
      const res = await fetch(`/api/admin/affiliates-v2/commissions/${commissionId}/review-void`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to void");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2/commissions/flagged"] });
      setSelectedFlaggedId(null);
      setReviewNotes("");
      toast({ title: "Commission voided" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Approve commission
  const approveCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const res = await fetch(`/api/admin/affiliates-v2/commissions/${commissionId}/approve`, {
        credentials: "include",
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Void commission
  const voidCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const res = await fetch(`/api/admin/affiliates-v2/commissions/${commissionId}/void`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin voided" }),
      });
      if (!res.ok) throw new Error("Failed to void");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2"] });
      toast({ title: "Commission voided" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Record payout
  const recordPayoutMutation = useMutation({
    mutationFn: async ({ affiliateId, amount, notes }: { affiliateId: string; amount: number; notes: string }) => {
      const res = await fetch(`/api/admin/affiliates-v2/${affiliateId}/payouts`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethod: "paypal", notes }),
      });
      if (!res.ok) throw new Error("Failed to record payout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2"] });
      setPayoutAmount("");
      setPayoutNote("");
      toast({ title: "Payout recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update payout status (for payouts tab)
  const updatePayoutMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update payout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2"] });
      toast({ title: "Payout updated" });
    },
  });

  // Auto-approve commissions
  const autoApproveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/affiliates-v2/commissions/auto-approve", {
        credentials: "include",
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to auto-approve");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2"] });
      toast({ title: `Auto-approved ${data.approved} commissions` });
    },
  });

  // Run batch payout (Stripe Connect)
  const runBatchPayoutMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await fetch("/api/admin/affiliate-payouts/run", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to run batch payout");
      }
      return res.json();
    },
    onSuccess: (data: BatchRunResult, dryRun) => {
      setBatchResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ 
        title: dryRun ? "Dry Run Complete" : "Batch Payout Executed", 
        description: `${data.count} payouts processed, total: $${(data.totals / 100).toFixed(2)}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Batch Error", description: error.message, variant: "destructive" });
    },
  });

  // Filtered payouts for display
  const displayedPayouts = useMemo(() => {
    if (!allPayouts) return [];
    return batchOnlyFilter ? allPayouts.filter((p) => p.payoutBatchId) : allPayouts;
  }, [allPayouts, batchOnlyFilter]);

  // Pending payouts for bulk selection
  const pendingPayouts = useMemo(() => {
    return displayedPayouts.filter((p) => p.status === "pending");
  }, [displayedPayouts]);

  // Bulk selection for payouts
  const {
    selectedItems: selectedPayouts,
    toggleItem: togglePayout,
    toggleAll: toggleAllPayouts,
    clearSelection: clearPayoutSelection,
    isSelected: isPayoutSelected,
    isAllSelected: isAllPayoutsSelected,
  } = useBulkSelection(pendingPayouts);

  // Bulk approve payouts
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/payouts/${id}`, {
        credentials: "include",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      return { total: ids.length, failed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2"] });
      clearPayoutSelection();
      if (data.failed > 0) {
        toast({ title: `Approved ${data.total - data.failed} payouts, ${data.failed} failed`, variant: "destructive" });
      } else {
        toast({ title: `Approved ${data.total} payouts` });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve payouts", description: error.message, variant: "destructive" });
    },
  });

  // Bulk reject payouts
  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/payouts/${id}`, {
        credentials: "include",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "rejected" }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      return { total: ids.length, failed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates-v2"] });
      clearPayoutSelection();
      if (data.failed > 0) {
        toast({ title: `Rejected ${data.total - data.failed} payouts, ${data.failed} failed`, variant: "destructive" });
      } else {
        toast({ title: `Rejected ${data.total} payouts` });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject payouts", description: error.message, variant: "destructive" });
    },
  });

  // Clear selection when filters or tab change
  useEffect(() => {
    clearPayoutSelection();
  }, [batchOnlyFilter, activeTab]);

  // Calculate totals from leaderboard
  const totalRevenue = leaderboard?.reduce((sum, a) => sum + a.totalRevenue, 0) || 0;
  const totalCommission = leaderboard?.reduce((sum, a) => sum + a.totalCommission, 0) || 0;
  const pendingCommission = leaderboard?.reduce((sum, a) => sum + a.pendingCommission, 0) || 0;
  const activeAffiliates = leaderboard?.filter(a => a.status === "active").length || 0;

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
              <p className="text-gray-400">You don't have permission to access affiliates. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="affiliates" role={role} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">Affiliate Revenue Engine</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab("invites")}
              data-testid="button-invite-affiliates"
            >
              <Ticket className="w-4 h-4 mr-2" />
              Invite Affiliates
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => autoApproveMutation.mutate()}
              disabled={autoApproveMutation.isPending}
              data-testid="button-auto-approve"
            >
              <Clock className="w-4 h-4 mr-2" />
              Auto-Approve Old Commissions
            </Button>
            <Link href="/admin/affiliate-settings">
              <Button variant="outline" className="gap-2" data-testid="button-affiliate-settings">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Affiliates</p>
                  <p className="text-2xl font-bold">{activeAffiliates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
                  <p className="text-2xl font-bold">${(totalRevenue / 100).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Commission</p>
                  <p className="text-2xl font-bold">${(totalCommission / 100).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Wallet className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Commission</p>
                  <p className="text-2xl font-bold">${(pendingCommission / 100).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant={activeTab === "leaderboard" ? "secondary" : "ghost"} 
            onClick={() => { setActiveTab("leaderboard"); setSelectedAffiliateId(null); }}
            data-testid="tab-leaderboard"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </Button>
          <Button 
            variant={activeTab === "payouts" ? "secondary" : "ghost"} 
            onClick={() => { setActiveTab("payouts"); setSelectedAffiliateId(null); }}
            data-testid="tab-payouts"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Payout Queue
          </Button>
          <Button 
            variant={activeTab === "review" ? "secondary" : "ghost"} 
            onClick={() => { setActiveTab("review"); setSelectedAffiliateId(null); }}
            data-testid="tab-review"
            className="relative"
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            Fraud Review
            {flaggedCommissions && flaggedCommissions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {flaggedCommissions.length}
              </span>
            )}
          </Button>
          <Button 
            variant={activeTab === "invites" ? "secondary" : "ghost"} 
            onClick={() => { setActiveTab("invites"); setSelectedAffiliateId(null); }}
            data-testid="tab-invites"
          >
            <Ticket className="w-4 h-4 mr-2" />
            Invites
          </Button>
        </div>

        {activeTab === "leaderboard" && !selectedAffiliateId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Affiliate Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLeaderboard ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : !leaderboard?.length ? (
                <p className="text-muted-foreground">No affiliates yet</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((affiliate, index) => (
                      <TableRow 
                        key={affiliate.affiliateId} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAffiliateId(affiliate.affiliateId)}
                        data-testid={`leaderboard-row-${affiliate.affiliateId}`}
                      >
                        <TableCell className="font-bold">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{affiliate.customerName}</p>
                            <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                            <p className="text-xs text-muted-foreground">{affiliate.affiliateCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[affiliate.status]}>{affiliate.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(affiliate.totalRevenue / 100).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-500 font-medium">
                          ${(affiliate.totalCommission / 100).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-yellow-500">
                          ${(affiliate.pendingCommission / 100).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{affiliate.totalOrders}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setSelectedAffiliateId(affiliate.affiliateId); }}
                              data-testid={`button-view-${affiliate.affiliateId}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Permanently delete affiliate "${affiliate.customerName}" (${affiliate.affiliateCode})? This will remove all their commissions, referrals, payouts, and click data. This cannot be undone.`)) {
                                  deleteAffiliateMutation.mutate(affiliate.affiliateId);
                                }
                              }}
                              disabled={deleteAffiliateMutation.isPending}
                              data-testid={`button-delete-affiliate-${affiliate.affiliateId}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Affiliate Profile Drill-down */}
        {activeTab === "leaderboard" && selectedAffiliateId && affiliateProfile && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setSelectedAffiliateId(null)} data-testid="button-back">
              ← Back to Leaderboard
            </Button>

            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{affiliateProfile.customerName}</h3>
                    <p className="text-muted-foreground">{affiliateProfile.customerEmail}</p>
                    <p className="text-sm mt-1">Code: {affiliateProfile.affiliateCode}</p>
                    {affiliateProfile.paypalEmail && (
                      <p className="text-sm mt-1">PayPal: {affiliateProfile.paypalEmail}</p>
                    )}
                    <Badge className={`mt-2 ${statusColors[affiliateProfile.status]}`}>{affiliateProfile.status}</Badge>
                    <div className="flex items-center gap-2 mt-3">
                      <Switch
                        checked={affiliateProfile.ffEnabled !== false}
                        onCheckedChange={(checked) => toggleFfMutation.mutate({ affiliateId: affiliateProfile.id, ffEnabled: checked })}
                        disabled={toggleFfMutation.isPending}
                        data-testid="switch-affiliate-ff"
                      />
                      <Label className="text-sm text-muted-foreground">
                        Friends & Family Code {affiliateProfile.ffEnabled !== false ? (
                          <span className="text-primary font-mono ml-1">FF{affiliateProfile.affiliateCode}</span>
                        ) : (
                          <span className="text-muted-foreground/50 ml-1">(disabled)</span>
                        )}
                      </Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Total Earnings</p>
                      <p className="text-xl font-bold">${(affiliateProfile.totalEarnings / 100).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10" title="Commissions awaiting approval">
                      <p className="text-sm text-muted-foreground">Pending Commission</p>
                      <p className="text-xl font-bold text-yellow-500">${(affiliateProfile.pendingBalance / 100).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/10" title="Approved and ready to pay out">
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-xl font-bold text-blue-500">${(affiliateProfile.approvedBalance / 100).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10">
                      <p className="text-sm text-muted-foreground">Paid</p>
                      <p className="text-xl font-bold text-green-500">${(affiliateProfile.paidBalance / 100).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Payout */}
                {affiliateProfile.approvedBalance > 0 && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Record Payout</h4>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground">Amount (cents)</label>
                        <Input
                          type="number"
                          placeholder={`Max: ${affiliateProfile.approvedBalance}`}
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          max={affiliateProfile.approvedBalance}
                          data-testid="input-payout-amount"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground">Note (optional)</label>
                        <Input
                          placeholder="PayPal transaction ID..."
                          value={payoutNote}
                          onChange={(e) => setPayoutNote(e.target.value)}
                          data-testid="input-payout-note"
                        />
                      </div>
                      <Button
                        onClick={() => {
                          const amt = parseInt(payoutAmount);
                          if (amt > 0 && amt <= affiliateProfile.approvedBalance) {
                            recordPayoutMutation.mutate({ affiliateId: selectedAffiliateId!, amount: amt, notes: payoutNote });
                          }
                        }}
                        disabled={!payoutAmount || parseInt(payoutAmount) <= 0 || recordPayoutMutation.isPending}
                        data-testid="button-record-payout"
                      >
                        Record Payout
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stripe Payout Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="w-5 h-5" />
                  Stripe Payout Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!affiliateProfile.payoutAccount?.payoutsEnabled || !affiliateProfile.payoutAccount?.detailsSubmitted) && (
                  <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-yellow-500 font-medium">Payout setup incomplete</span>
                  </div>
                )}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <Badge className={affiliateProfile.payoutAccount?.detailsSubmitted 
                        ? "bg-green-500/20 text-green-500 border-green-500/30" 
                        : "bg-red-500/20 text-red-500 border-red-500/30"
                      }>
                        {affiliateProfile.payoutAccount?.detailsSubmitted ? "Details Submitted" : "Details Required"}
                      </Badge>
                      <Badge className={affiliateProfile.payoutAccount?.payoutsEnabled 
                        ? "bg-green-500/20 text-green-500 border-green-500/30" 
                        : "bg-red-500/20 text-red-500 border-red-500/30"
                      }>
                        {affiliateProfile.payoutAccount?.payoutsEnabled ? "Payouts Enabled" : "Payouts Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Country: </span>
                      <span className="font-medium">{affiliateProfile.payoutAccount?.country || "US"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Currency: </span>
                      <span className="font-medium">{affiliateProfile.payoutAccount?.currency?.toUpperCase() || "USD"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Tabs */}
            <Tabs value={profileTab} onValueChange={(v) => setProfileTab(v as typeof profileTab)}>
              <TabsList>
                <TabsTrigger value="commissions" data-testid="tab-commissions">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Commission Ledger
                </TabsTrigger>
                <TabsTrigger value="customers" data-testid="tab-customers">
                  <Users className="w-4 h-4 mr-2" />
                  Referred Customers
                </TabsTrigger>
                <TabsTrigger value="payouts" data-testid="tab-affiliate-payouts">
                  <Wallet className="w-4 h-4 mr-2" />
                  Payout History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="commissions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Commission Ledger</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!commissions?.length ? (
                      <p className="text-muted-foreground">No commissions yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Order Amount</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission) => (
                            <TableRow key={commission.id} data-testid={`commission-${commission.id}`}>
                              <TableCell>{format(new Date(commission.createdAt), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-xs">{commission.orderId.slice(0, 8)}...</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{commission.customerName}</p>
                                  <p className="text-xs text-muted-foreground">{commission.customerEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">${(commission.orderAmount / 100).toFixed(2)}</TableCell>
                              <TableCell className="text-right">{commission.commissionRate}%</TableCell>
                              <TableCell className="text-right font-medium text-green-500">
                                ${(commission.commissionAmount / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[commission.status]}>{commission.status}</Badge>
                              </TableCell>
                              <TableCell>
                                {commission.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                      onClick={() => approveCommissionMutation.mutate(commission.id)}
                                      disabled={approveCommissionMutation.isPending}
                                      data-testid={`button-approve-commission-${commission.id}`}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                      onClick={() => voidCommissionMutation.mutate(commission.id)}
                                      disabled={voidCommissionMutation.isPending}
                                      data-testid={`button-void-commission-${commission.id}`}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                                {commission.status === "approved" && (
                                  <p className="text-xs text-green-600 font-medium">
                                    Approved {commission.approvedAt && format(new Date(commission.approvedAt), "MMM d")}
                                  </p>
                                )}
                                {commission.status === "paid" && (
                                  <p className="text-xs text-blue-600 font-medium">
                                    Paid {commission.paidAt && format(new Date(commission.paidAt), "MMM d")}
                                  </p>
                                )}
                                {commission.status === "void" && (
                                  <p className="text-xs text-red-600 font-medium">Voided</p>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customers" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Referred Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!referredCustomers?.length ? (
                      <p className="text-muted-foreground">No referred customers yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Total Spent</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead>First Order</TableHead>
                            <TableHead>Last Order</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {referredCustomers.map((customer) => (
                            <TableRow key={customer.customerId} data-testid={`customer-${customer.customerId}`}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customer.customerName}</p>
                                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${(customer.totalSpent / 100).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">{customer.orderCount}</TableCell>
                              <TableCell>{customer.firstOrderDate ? format(new Date(customer.firstOrderDate), "MMM d, yyyy") : "-"}</TableCell>
                              <TableCell>{customer.lastOrderDate ? format(new Date(customer.lastOrderDate), "MMM d, yyyy") : "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payouts" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!affiliatePayouts?.length ? (
                      <p className="text-muted-foreground">No payouts yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {affiliatePayouts.map((payout) => (
                            <TableRow key={payout.id} data-testid={`payout-history-${payout.id}`}>
                              <TableCell>{format(new Date(payout.requestedAt), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-right font-medium">
                                ${(payout.amount / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>{payout.paymentMethod}</TableCell>
                              <TableCell>
                                <Badge className={statusColors[payout.status]}>{payout.status}</Badge>
                              </TableCell>
                              <TableCell><CollapsiblePayoutNotes notes={payout.notes} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Payout Queue Tab */}
        {activeTab === "payouts" && (
          <div className="space-y-4">
            {/* Batch Summary Card */}
            {batchResult && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">
                        {batchResult.preview ? "Dry Run Preview" : "Batch Payout Complete"}
                      </h4>
                      <div className="grid grid-cols-4 gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground">Batch ID</p>
                          <p className="font-medium">{batchResult.batchId?.slice(0, 8) || "N/A"}...</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payout Count</p>
                          <p className="font-medium">{batchResult.count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-medium text-green-500">${(batchResult.totals / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Failed</p>
                          <p className={`font-medium ${batchResult.errors?.length ? "text-red-500" : "text-muted-foreground"}`}>
                            {batchResult.errors?.length || 0}
                          </p>
                        </div>
                      </div>
                      {batchResult.errors && batchResult.errors.length > 0 && (
                        <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30">
                          <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-2">
                            <AlertCircle className="w-4 h-4" />
                            Errors
                          </div>
                          <ul className="text-sm text-red-400 space-y-1">
                            {batchResult.errors.slice(0, 5).map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                            {batchResult.errors.length > 5 && (
                              <li className="text-muted-foreground">...and {batchResult.errors.length - 5} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {batchResult.preview && batchResult.preview.length > 0 && (
                        <div className="mt-4 p-3 rounded bg-muted border">
                          <p className="text-sm font-medium mb-2">Preview ({batchResult.preview.length} affiliates)</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {batchResult.preview.slice(0, 5).map((p, i) => (
                              <li key={i}>• {p.email}: ${(p.amount / 100).toFixed(2)}</li>
                            ))}
                            {batchResult.preview.length > 5 && (
                              <li>...and {batchResult.preview.length - 5} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setBatchResult(null)} data-testid="button-dismiss-batch">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payout Queue</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="batch-filter"
                        checked={batchOnlyFilter}
                        onCheckedChange={setBatchOnlyFilter}
                        data-testid="switch-batch-filter"
                      />
                      <Label htmlFor="batch-filter" className="text-sm">Batch payouts only</Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runBatchPayoutMutation.mutate(true)}
                      disabled={runBatchPayoutMutation.isPending}
                      data-testid="button-dry-run"
                    >
                      <FileSearch className="w-4 h-4 mr-2" />
                      Dry Run Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => runBatchPayoutMutation.mutate(false)}
                      disabled={runBatchPayoutMutation.isPending}
                      data-testid="button-run-batch"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Run Weekly Batch
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!displayedPayouts?.length ? (
                  <p className="text-muted-foreground">No payout requests</p>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          {pendingPayouts.length > 0 && (
                            <Checkbox
                              checked={isAllPayoutsSelected}
                              onCheckedChange={toggleAllPayouts}
                              data-testid="checkbox-select-all-payouts"
                            />
                          )}
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Affiliate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Stripe Transfer</TableHead>
                        <TableHead>Connect Status</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedPayouts.map((payout) => (
                        <TableRow key={payout.id} className={isPayoutSelected(payout.id) ? "bg-primary/10" : ""} data-testid={`payout-queue-${payout.id}`}>
                          <TableCell>
                            {payout.status === "pending" ? (
                              <Checkbox
                                checked={isPayoutSelected(payout.id)}
                                onCheckedChange={() => togglePayout(payout.id)}
                                data-testid={`checkbox-payout-${payout.id}`}
                              />
                            ) : (
                              <span className="w-4 h-4 block" />
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(payout.requestedAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <p className="font-medium">{payout.paymentDetails || "Unknown"}</p>
                          </TableCell>
                          <TableCell className="text-right font-medium">${(payout.amount / 100).toFixed(2)}</TableCell>
                          <TableCell>{payout.paymentMethod}</TableCell>
                          <TableCell>
                            {payout.payoutBatchId ? (
                              <span className="text-xs">{payout.payoutBatchId.slice(0, 8)}...</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {payout.stripeTransferId ? (
                              <span className="text-xs">{payout.stripeTransferId.slice(0, 12)}...</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {payout.connectStatus ? (
                              <Badge className={
                                payout.connectStatus === "paid" ? statusColors.paid :
                                payout.connectStatus === "pending" ? statusColors.pending :
                                payout.connectStatus === "failed" ? statusColors.rejected :
                                "bg-gray-500/20 text-gray-500"
                              }>
                                {payout.connectStatus}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[payout.status]}>{payout.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {payout.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "approved" })}
                                  data-testid={`button-approve-payout-${payout.id}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "rejected" })}
                                  data-testid={`button-reject-payout-${payout.id}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                            {payout.status === "approved" && (
                              <Button
                                size="sm"
                                onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "paid" })}
                                data-testid={`button-mark-paid-${payout.id}`}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fraud Review Queue */}
        {activeTab === "review" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
                Flagged Commissions Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFlagged ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : !flaggedCommissions?.length ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No flagged commissions</p>
                  <p className="text-muted-foreground">All commissions are clear!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {flaggedCommissions.map((flagged) => (
                    <Card 
                      key={flagged.id} 
                      className={`border-l-4 ${flagged.flagReason === "self_referral" ? "border-l-red-500" : "border-l-amber-500"}`}
                      data-testid={`flagged-commission-${flagged.id}`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={statusColors[flagged.flagReason || "flagged"]}>
                                {flagged.flagReason === "self_referral" ? "Self-Referral" : 
                                 flagged.flagReason === "coupon_abuse" ? "Coupon Abuse" : 
                                 "Suspicious"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                ${(flagged.commissionAmount / 100).toFixed(2)} commission
                              </span>
                            </div>
                            
                            <p className="text-sm font-medium">{flagged.flagDetails}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Affiliate:</span>{" "}
                                <span className="font-medium">{flagged.affiliateName}</span>
                                <span className="text-muted-foreground ml-1">({flagged.affiliateEmail})</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Customer:</span>{" "}
                                <span className="font-medium">{flagged.customerName}</span>
                                <span className="text-muted-foreground ml-1">({flagged.customerEmail})</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Order:</span>{" "}
                                <span className="text-xs">{flagged.orderId.slice(0, 8)}...</span>
                                <span className="text-muted-foreground ml-1">
                                  (${(flagged.orderAmount / 100).toFixed(2)})
                                </span>
                              </div>
                              {flagged.customerIp && (
                                <div>
                                  <span className="text-muted-foreground">Customer IP:</span>{" "}
                                  <span className="text-xs">{flagged.customerIp}</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground">
                              Flagged: {flagged.flaggedAt ? format(new Date(flagged.flaggedAt), "MMM d, yyyy 'at' h:mm a") : "N/A"}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedFlaggedId(flagged.id === selectedFlaggedId ? null : flagged.id)}
                              data-testid={`button-review-${flagged.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>
                        
                        {/* Review Actions Panel */}
                        {selectedFlaggedId === flagged.id && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            <div>
                              <Label htmlFor="review-notes">Review Notes</Label>
                              <Textarea
                                id="review-notes"
                                placeholder="Add notes about your decision..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                className="mt-1"
                                data-testid="input-review-notes"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => reviewApproveMutation.mutate({ commissionId: flagged.id, notes: reviewNotes })}
                                disabled={reviewApproveMutation.isPending}
                                data-testid={`button-approve-flagged-${flagged.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve Commission
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  if (!reviewNotes.trim()) {
                                    toast({ title: "Error", description: "Please provide a reason for voiding", variant: "destructive" });
                                    return;
                                  }
                                  reviewVoidMutation.mutate({ commissionId: flagged.id, notes: reviewNotes });
                                }}
                                disabled={reviewVoidMutation.isPending}
                                data-testid={`button-void-flagged-${flagged.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Void Commission
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => { setSelectedFlaggedId(null); setReviewNotes(""); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Affiliate Invites Tab */}
        {activeTab === "invites" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Affiliate Invites
                </CardTitle>
                <Button onClick={() => setShowCreateInvite(true)} data-testid="button-create-invite">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invite
                </Button>
              </CardHeader>
              <CardContent>
                {loadingInvites ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : !affiliateInvites?.length ? (
                  <div className="text-center py-8">
                    <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No invites created yet</p>
                    <Button onClick={() => setShowCreateInvite(true)}>Create First Invite</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {affiliateInvites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm" data-testid={`text-invite-code-${invite.id}`}>
                                {invite.inviteCode}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const url = `${window.location.origin}/become-affiliate?code=${invite.inviteCode}`;
                                  navigator.clipboard.writeText(url);
                                  toast({ title: "Link copied to clipboard" });
                                }}
                                data-testid={`button-copy-invite-${invite.id}`}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {invite.targetEmail ? (
                              <div>
                                <span className="font-medium">{invite.targetName || "—"}</span>
                                <span className="text-muted-foreground text-sm block">{invite.targetEmail}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Anyone</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="">{invite.timesUsed}</span>
                            <span className="text-muted-foreground">/{invite.maxUses ?? "∞"}</span>
                          </TableCell>
                          <TableCell>
                            {invite.usedByAffiliate ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Used
                              </Badge>
                            ) : invite.isExpired ? (
                              <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">
                                <Clock className="w-3 h-3 mr-1" />
                                Expired
                              </Badge>
                            ) : invite.isExhausted ? (
                              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Exhausted
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                                <Clock className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(invite.createdAt), "MMM d, yyyy")}
                            {invite.expiresAt && (
                              <div className="text-xs">
                                Expires: {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {invite.targetEmail && !invite.isExpired && !invite.isExhausted && !invite.usedByAffiliate && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => resendInviteMutation.mutate(invite)}
                                  disabled={resendInviteMutation.isPending}
                                  title="Resend invite email"
                                  data-testid={`button-resend-invite-${invite.id}`}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm("Delete this invite?")) {
                                    deleteInviteMutation.mutate(invite.id);
                                  }
                                }}
                                disabled={deleteInviteMutation.isPending}
                                data-testid={`button-delete-invite-${invite.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Used Invites Summary */}
            {affiliateInvites && affiliateInvites.filter(i => i.usedByAffiliate).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recently Joined via Invite</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {affiliateInvites
                      .filter(i => i.usedByAffiliate)
                      .slice(0, 5)
                      .map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <span className="font-medium">{invite.usedByAffiliate?.customerName}</span>
                            <span className="text-muted-foreground text-sm ml-2">{invite.usedByAffiliate?.customerEmail}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Code: {invite.usedByAffiliate?.code}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Invite Dialog */}
        <Dialog open={showCreateInvite} onOpenChange={setShowCreateInvite}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Affiliate Invite</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Create an invite link to share with potential affiliates. Leave email blank for a generic invite anyone can use.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="target-email">Target Email (optional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="target-email"
                    type="email"
                    placeholder="Leave blank for anyone"
                    value={inviteForm.targetEmail}
                    onChange={(e) => setInviteForm({ ...inviteForm, targetEmail: e.target.value })}
                    className="pl-10"
                    data-testid="input-target-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-name">Target Name (optional)</Label>
                <Input
                  id="target-name"
                  placeholder="Pre-fill name on signup"
                  value={inviteForm.targetName}
                  onChange={(e) => setInviteForm({ ...inviteForm, targetName: e.target.value })}
                  data-testid="input-target-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-uses">Max Uses</Label>
                  <Input
                    id="max-uses"
                    type="number"
                    min={1}
                    value={inviteForm.maxUses}
                    onChange={(e) => setInviteForm({ ...inviteForm, maxUses: parseInt(e.target.value) || 1 })}
                    data-testid="input-max-uses"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires-in">Expires in (days)</Label>
                  <Input
                    id="expires-in"
                    type="number"
                    min={0}
                    value={inviteForm.expiresInDays}
                    onChange={(e) => setInviteForm({ ...inviteForm, expiresInDays: parseInt(e.target.value) || 0 })}
                    data-testid="input-expires-in"
                  />
                  <p className="text-xs text-muted-foreground">Set to 0 for no expiration</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (internal)</Label>
                <Textarea
                  id="notes"
                  placeholder="Optional notes about this invite..."
                  value={inviteForm.notes}
                  onChange={(e) => setInviteForm({ ...inviteForm, notes: e.target.value })}
                  data-testid="input-notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateInvite(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createInviteMutation.mutate(inviteForm)}
                  disabled={createInviteMutation.isPending}
                  data-testid="button-submit-invite"
                >
                  {createInviteMutation.isPending ? "Creating..." : "Create Invite"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Actions Bar for Payouts */}
        <BulkActionsBar
          selectedCount={selectedPayouts.length}
          onClear={clearPayoutSelection}
          actions={[
            {
              label: "Approve All",
              onClick: () => bulkApproveMutation.mutate(selectedPayouts.map(String)),
              icon: <CheckCircle className="w-4 h-4" />,
              variant: "default" as const,
              disabled: bulkApproveMutation.isPending || bulkRejectMutation.isPending,
            },
            {
              label: "Reject All",
              onClick: () => bulkRejectMutation.mutate(selectedPayouts.map(String)),
              icon: <XCircle className="w-4 h-4" />,
              variant: "destructive" as const,
              disabled: bulkApproveMutation.isPending || bulkRejectMutation.isPending,
            },
          ]}
        />
      </main>
    </div>
  );
}
