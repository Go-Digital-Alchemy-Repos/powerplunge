import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Headset, MessageSquare, CheckCircle, Clock, AlertCircle, Eye, Search, Filter, RefreshCw, Plus, User, Settings, Package, ChevronDown, ChevronRight, ShoppingBag, DollarSign, ExternalLink, Mail, ArrowUpRight, ArrowDownLeft, X, AlertTriangle, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface AdminNote {
  text: string;
  adminId: string;
  adminName: string;
  createdAt: string;
}

interface CustomerReply {
  text: string;
  customerName: string;
  createdAt: string;
}

interface ThreadEntry {
  type: "customer_original" | "customer_reply" | "admin_reply";
  text: string;
  author: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  priority: string;
  orderId: string | null;
  adminNotes: AdminNote[] | null;
  customerReplies: CustomerReply[] | null;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

function buildThread(ticket: SupportTicket): ThreadEntry[] {
  const entries: ThreadEntry[] = [];
  entries.push({
    type: "customer_original",
    text: ticket.message,
    author: ticket.customerName || "Customer",
    createdAt: ticket.createdAt,
  });
  if (Array.isArray(ticket.adminNotes)) {
    for (const note of ticket.adminNotes) {
      entries.push({
        type: "admin_reply",
        text: note.text,
        author: note.adminName || "Support Team",
        createdAt: note.createdAt,
      });
    }
  }
  if (Array.isArray(ticket.customerReplies)) {
    for (const reply of ticket.customerReplies) {
      entries.push({
        type: "customer_reply",
        text: reply.text,
        author: reply.customerName || "Customer",
        createdAt: reply.createdAt,
      });
    }
  }
  entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return entries;
}

interface CustomerOrderItem {
  id: string;
  orderId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface CustomerOrder {
  id: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  shippingName: string | null;
  items: CustomerOrderItem[];
}

interface CustomerOrderHistory {
  customer: { id: string; name: string; email: string; createdAt: string };
  orders: CustomerOrder[];
  totalSpent: number;
  orderCount: number;
}

interface TicketStats {
  status: string;
  count: number;
}

interface CustomerSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface EmailLogEntry {
  id: string;
  ticketId: string | null;
  direction: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  htmlBody: string | null;
  textBody: string | null;
  emailType: string;
  status: string;
  error: string | null;
  messageId: string | null;
  createdAt: string;
}

const emailTypeLabels: Record<string, string> = {
  admin_notification: "Admin Notification",
  customer_confirmation: "Auto-Reply Confirmation",
  admin_reply: "Admin Reply to Customer",
  status_change: "Status Change Notification",
  inbound_reply: "Customer Email Reply",
  inbound_new_ticket: "New Ticket via Email",
};

const statusColors: Record<string, string> = {
  open: "bg-yellow-500/20 text-yellow-500",
  in_progress: "bg-blue-500/20 text-blue-500",
  resolved: "bg-green-500/20 text-green-500",
  closed: "bg-gray-500/20 text-gray-500",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-500",
  normal: "bg-blue-500/20 text-blue-500",
  high: "bg-orange-500/20 text-orange-500",
  urgent: "bg-red-500/20 text-red-500",
};

const typeLabels: Record<string, string> = {
  general: "General",
  return: "Return",
  refund: "Refund",
  shipping: "Shipping",
  technical: "Technical",
};

export default function AdminSupport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, isLoading: adminLoading } = useAdmin();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showOrderHistory, setShowOrderHistory] = useState(true);

  const [emailLogTicketId, setEmailLogTicketId] = useState<string | null>(null);
  const [emailLogTicketSubject, setEmailLogTicketSubject] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: "",
    message: "",
    type: "general",
    priority: "normal",
  });

  const { data: emailLogsData, isLoading: emailLogsLoading } = useQuery<{ logs: EmailLogEntry[] }>({
    queryKey: ["/api/admin/support/email-logs", emailLogTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/support/email-logs/${emailLogTicketId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch email logs");
      return res.json();
    },
    enabled: !!emailLogTicketId,
  });

  const { data: orderHistoryData, isLoading: orderHistoryLoading } = useQuery<CustomerOrderHistory>({
    queryKey: ["/api/admin/support/customers", selectedTicket?.customerId, "orders"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/support/customers/${selectedTicket!.customerId}/orders`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch order history");
      return res.json();
    },
    enabled: !!selectedTicket?.customerId,
  });

  const { data, isLoading, refetch } = useQuery<{ tickets: SupportTicket[]; stats: TicketStats[] }>({
    queryKey: ["/api/admin/support", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all"
        ? "/api/admin/support"
        : `/api/admin/support?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (data: { id: string; status?: string; priority?: string; noteText?: string }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support"] });
      setSelectedTicket(null);
      toast({ title: "Ticket updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { customerId: string; subject: string; message: string; type: string; priority: string }) => {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support"] });
      setShowCreateDialog(false);
      resetCreateForm();
      toast({ title: "Support ticket created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support"] });
      toast({ title: "Ticket deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setCustomerSearch("");
    setCustomerResults([]);
    setSelectedCustomer(null);
    setCreateForm({ subject: "", message: "", type: "general", priority: "normal" });
  };

  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    setCustomerSearching(true);
    try {
      const res = await fetch(`/api/admin/support/customers/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCustomerResults(data.customers || []);
      }
    } catch {
      console.error("Customer search failed");
    } finally {
      setCustomerSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.trim().length >= 2) {
        searchCustomers(customerSearch.trim());
      } else {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const getStatCount = (status: string) => {
    return data?.stats?.find((s) => s.status === status)?.count || 0;
  };

  const filteredTickets = data?.tickets?.filter((ticket) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(search) ||
      ticket.customerName?.toLowerCase().includes(search) ||
      ticket.customerEmail?.toLowerCase().includes(search) ||
      ticket.id.toLowerCase().includes(search)
    );
  });

  const openTicketModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNewNoteText("");
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
    setExpandedOrderId(null);
    setShowOrderHistory(true);
  };

  const handleUpdateTicket = () => {
    if (!selectedTicket) return;
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      status: newStatus !== selectedTicket.status ? newStatus : undefined,
      priority: newPriority !== selectedTicket.priority ? newPriority : undefined,
      noteText: newNoteText.trim() || undefined,
    });
  };

  const handleCreateTicket = () => {
    if (!selectedCustomer) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }
    if (!createForm.subject.trim()) {
      toast({ title: "Subject is required", variant: "destructive" });
      return;
    }
    if (!createForm.message.trim()) {
      toast({ title: "Message is required", variant: "destructive" });
      return;
    }
    createTicketMutation.mutate({
      customerId: selectedCustomer.id,
      subject: createForm.subject,
      message: createForm.message,
      type: createForm.type,
      priority: createForm.priority,
    });
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="support" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Headset className="w-8 h-8 text-primary" />
              Support
            </h1>
            <p className="text-muted-foreground mt-1">Manage customer inquiries and support conversations</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <Button
              onClick={() => {
                resetCreateForm();
                setShowCreateDialog(true);
              }}
              className="gap-2 w-full sm:w-auto flex-1"
              data-testid="button-create-ticket"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </Button>
            <Link href="/admin/support/settings">
              <Button variant="outline" className="gap-2 w-full sm:w-auto flex-1" data-testid="button-support-settings">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
            <Button variant="outline" className="w-full sm:w-auto flex-1" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-open-tickets" className="bg-yellow-500/5 border-yellow-500/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Open</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-500">{getStatCount("open")}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 h-8 text-yellow-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-progress-tickets" className="bg-blue-500/5 border-blue-500/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Progress</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-500">{getStatCount("in_progress")}</p>
                </div>
                <AlertCircle className="w-6 h-6 sm:w-8 h-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-resolved-tickets" className="bg-green-500/5 border-green-500/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Resolved</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-500">{getStatCount("resolved")}</p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 h-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-closed-tickets" className="bg-gray-500/5 border-gray-500/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Closed</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-400">{getStatCount("closed")}</p>
                </div>
                <MessageSquare className="w-6 h-6 sm:w-8 h-8 text-gray-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by subject, customer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tickets</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : !filteredTickets?.length ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No support tickets found</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} data-testid={`ticket-row-${ticket.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium line-clamp-1">{ticket.subject}</p>
                              <p className="text-xs text-muted-foreground">#{ticket.id.slice(0, 8)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ticket.customerName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{ticket.customerEmail}</p>
                              <p className="text-xs text-muted-foreground">ID: {ticket.customerId.slice(0, 8)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeLabels[ticket.type] || ticket.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={priorityColors[ticket.priority]}>
                              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[ticket.status]}>
                              {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTicketModal(ticket)}
                                data-testid={`button-view-${ticket.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmailLogTicketId(ticket.id);
                                  setEmailLogTicketSubject(ticket.subject);
                                  setExpandedLogId(null);
                                }}
                                title="Email Logs"
                                data-testid={`button-email-log-${ticket.id}`}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Delete Ticket"
                                    data-testid={`button-delete-${ticket.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{ticket.subject}" and all associated data. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteTicketMutation.mutate(ticket.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      data-testid={`button-confirm-delete-${ticket.id}`}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden divide-y">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 active:bg-muted/50 transition-colors"
                      onClick={() => openTicketModal(ticket)}
                      data-testid={`ticket-card-${ticket.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <p className="font-medium line-clamp-1">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">#{ticket.id.slice(0, 8)}</p>
                        </div>
                        <Badge className={`${statusColors[ticket.status]} ml-2`}>
                          {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          {ticket.customerName || "Unknown"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5">{typeLabels[ticket.type] || ticket.type}</Badge>
                          <Badge className={`${priorityColors[ticket.priority]} text-[10px] px-1.5`}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmailLogTicketId(ticket.id);
                              setEmailLogTicketSubject(ticket.subject);
                              setExpandedLogId(null);
                            }}
                            title="Email Logs"
                            data-testid={`button-email-log-mobile-${ticket.id}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                                title="Delete Ticket"
                                data-testid={`button-delete-mobile-${ticket.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{ticket.subject}" and all associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTicketMutation.mutate(ticket.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail Drawer */}
      <Sheet open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Ticket #{selectedTicket?.id.slice(0, 8)}
            </SheetTitle>
          </SheetHeader>

          {selectedTicket && (
            <div className="space-y-6 mt-6">
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Customer</h4>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium">{selectedTicket.customerName || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{selectedTicket.customerEmail}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="text-muted-foreground">ID: {selectedTicket.customerId.slice(0, 8)}</p>
                    {selectedTicket.orderId && (
                      <p className="mt-1">
                        <span className="text-muted-foreground">Order:</span>{" "}
                        <span>#{selectedTicket.orderId.slice(0, 8)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {orderHistoryData && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-sm">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Orders:</span>
                      <span className="font-medium">{orderHistoryData.orderCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Total Spent:</span>
                      <span className="font-medium">${(orderHistoryData.totalSpent / 100).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order History Section */}
              {selectedTicket.customerId && (
                <div className="rounded-lg border" data-testid="order-history-section">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    onClick={() => setShowOrderHistory(!showOrderHistory)}
                    data-testid="button-toggle-order-history"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Order History</span>
                      {orderHistoryData && (
                        <Badge variant="outline" className="text-xs">{orderHistoryData.orderCount} orders</Badge>
                      )}
                    </div>
                    {showOrderHistory ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {showOrderHistory && (
                    <div className="border-t px-4 pb-4">
                      {orderHistoryLoading ? (
                        <div className="py-4 text-center">
                          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                          <p className="text-xs text-muted-foreground mt-2">Loading orders...</p>
                        </div>
                      ) : !orderHistoryData?.orders?.length ? (
                        <div className="py-4 text-center">
                          <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No orders found for this customer</p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-3 max-h-[300px] overflow-y-auto">
                          {orderHistoryData.orders.map((order) => (
                            <div
                              key={order.id}
                              className={`rounded-lg border transition-colors ${selectedTicket.orderId === order.id ? "border-primary/50 bg-primary/5" : "bg-muted/20"}`}
                              data-testid={`order-card-${order.id}`}
                            >
                              <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 text-left"
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                data-testid={`button-expand-order-${order.id}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">#{order.id.slice(0, 8)}</span>
                                      {selectedTicket.orderId === order.id && (
                                        <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0">Related</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className="text-sm font-medium">${(order.totalAmount / 100).toFixed(2)}</p>
                                    <Badge className={`text-[10px] px-1.5 py-0 ${
                                      order.status === "delivered" ? "bg-green-500/20 text-green-500" :
                                      order.status === "shipped" ? "bg-blue-500/20 text-blue-500" :
                                      order.status === "cancelled" ? "bg-red-500/20 text-red-500" :
                                      order.status === "paid" ? "bg-emerald-500/20 text-emerald-500" :
                                      "bg-yellow-500/20 text-yellow-500"
                                    }`}>
                                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </Badge>
                                  </div>
                                  {expandedOrderId === order.id ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                              </button>

                              {expandedOrderId === order.id && order.items.length > 0 && (
                                <div className="border-t px-3 py-2 space-y-1.5" data-testid={`order-items-${order.id}`}>
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground truncate max-w-[60%]">{item.productName} x{item.quantity}</span>
                                      <span className="font-medium">${((item.unitPrice * item.quantity) / 100).toFixed(2)}</span>
                                    </div>
                                  ))}
                                  <div className="pt-1.5 border-t">
                                    <Link href={`/admin/orders`}>
                                      <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer" data-testid={`link-view-order-${order.id}`}>
                                        <ExternalLink className="w-3 h-3" />
                                        View full order details
                                      </span>
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <h4 className="font-medium text-lg min-w-0 flex-1">{selectedTicket.subject}</h4>
                  <div className="flex gap-2">
                    <Badge className={statusColors[selectedTicket.status]}>{selectedTicket.status.replace("_", " ")}</Badge>
                    <Badge className={priorityColors[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                  </div>
                </div>

                <div className="space-y-3" data-testid="ticket-thread">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Conversation</Label>
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1" data-testid="thread-container">
                    {buildThread(selectedTicket).map((entry, idx) => {
                      const isAdmin = entry.type === "admin_reply";
                      const isHtml = entry.text.includes("<") && entry.text.includes(">");
                      return (
                        <div
                          key={idx}
                          className="flex gap-3"
                          data-testid={`thread-entry-${idx}`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? "bg-blue-500/20 text-blue-400" : "bg-primary/20 text-primary"}`}>
                            {isAdmin ? <Headset className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`text-sm font-medium ${isAdmin ? "text-blue-400" : ""}`}>
                                {entry.author}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {isAdmin ? "Staff" : "Customer"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground ml-auto sm:ml-0">{new Date(entry.createdAt).toLocaleString()}</span>
                            </div>
                            <div className={`rounded-lg p-3 text-sm ${isAdmin ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/50 border"}`}>
                              {isHtml ? (
                                <div className="prose prose-sm prose-invert max-w-none [&_p]:my-2 [&_p:empty]:h-4 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5" dangerouslySetInnerHTML={{ __html: entry.text }} data-testid={`thread-text-${idx}`} />
                              ) : (
                                <p className="whitespace-pre-wrap break-words" data-testid={`thread-text-${idx}`}>{entry.text}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6">
                <div>
                  <Label>Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger data-testid="select-update-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger data-testid="select-update-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTicket.status !== "closed" && (
                <div className="space-y-2">
                  <Label>Add Reply</Label>
                  <RichTextEditor
                    value={newNoteText}
                    onChange={setNewNoteText}
                    placeholder="Type your reply to the customer..."
                    data-testid="input-admin-notes"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(selectedTicket.createdAt).toLocaleString()}
                  {selectedTicket.resolvedAt && ` · Resolved ${new Date(selectedTicket.resolvedAt).toLocaleString()}`}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateTicket}
                    disabled={updateTicketMutation.isPending}
                    data-testid="button-update-ticket"
                  >
                    {updateTicketMutation.isPending ? "Updating..." : "Update Ticket"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetCreateForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Support Ticket
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Assign to Customer *</Label>
              {selectedCustomer ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                    <p className="text-xs text-muted-foreground">Client ID: {selectedCustomer.id.slice(0, 8)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                      setCustomerResults([]);
                    }}
                    data-testid="button-change-customer"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-customer-search"
                    />
                  </div>
                  {customerSearching && (
                    <p className="text-sm text-muted-foreground px-1">Searching...</p>
                  )}
                  {customerResults.length > 0 && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto" data-testid="customer-search-results">
                      {customerResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearch("");
                            setCustomerResults([]);
                          }}
                          data-testid={`customer-result-${customer.id}`}
                        >
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground">{customer.phone}</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground ml-auto shrink-0">
                            {customer.id.slice(0, 8)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {customerSearch.length >= 2 && !customerSearching && customerResults.length === 0 && (
                    <p className="text-sm text-muted-foreground px-1">No customers found</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={(v) => setCreateForm({ ...createForm, type: v })}>
                  <SelectTrigger data-testid="select-create-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={createForm.priority} onValueChange={(v) => setCreateForm({ ...createForm, priority: v })}>
                  <SelectTrigger data-testid="select-create-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief description of the issue..."
                value={createForm.subject}
                onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                maxLength={200}
                data-testid="input-create-subject"
              />
            </div>

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Detailed description of the customer's issue..."
                value={createForm.message}
                onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                rows={5}
                maxLength={5000}
                data-testid="input-create-message"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTicket}
                disabled={createTicketMutation.isPending || !selectedCustomer}
                data-testid="button-submit-ticket"
              >
                {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Log Dialog */}
      <Dialog open={!!emailLogTicketId} onOpenChange={(open) => { if (!open) { setEmailLogTicketId(null); setExpandedLogId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="email-log-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Log
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              Ticket: {emailLogTicketSubject} (#{emailLogTicketId?.slice(0, 8)})
            </p>
          </DialogHeader>

          <div className="mt-4">
            {emailLogsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading email logs...</p>
              </div>
            ) : !emailLogsData?.logs?.length ? (
              <div className="text-center py-8">
                <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No email activity recorded for this ticket</p>
                <p className="text-xs text-muted-foreground mt-1">Emails will appear here once sent or received</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{emailLogsData.logs.length} email{emailLogsData.logs.length !== 1 ? "s" : ""} logged (kept for 7 days)</p>
                {emailLogsData.logs.map((log) => {
                  const isOutbound = log.direction === "outbound";
                  const isFailed = log.status === "failed";
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      className={`rounded-lg border transition-colors ${isFailed ? "border-red-500/30 bg-red-500/5" : isOutbound ? "border-blue-500/20 bg-blue-500/5" : "border-green-500/20 bg-green-500/5"}`}
                      data-testid={`email-log-entry-${log.id}`}
                    >
                      <button
                        type="button"
                        className="w-full text-left p-3"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        data-testid={`button-expand-log-${log.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${isOutbound ? "bg-blue-500/20" : "bg-green-500/20"}`}>
                            {isOutbound ? (
                              <ArrowUpRight className={`w-4 h-4 ${isFailed ? "text-red-400" : "text-blue-400"}`} />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {emailTypeLabels[log.emailType] || log.emailType}
                              </span>
                              {isFailed && (
                                <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0">
                                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                                  Failed
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {isOutbound ? "Sent" : "Received"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{log.subject}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              <span>{isOutbound ? `To: ${log.toAddress}` : `From: ${log.fromAddress}`}</span>
                              <span>
                                {new Date(log.createdAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t px-3 pb-3 pt-2 space-y-2" data-testid={`email-log-detail-${log.id}`}>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">From: </span>
                              <span>{log.fromAddress}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">To: </span>
                              <span>{log.toAddress}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status: </span>
                              <span className={isFailed ? "text-red-400" : "text-green-400"}>
                                {log.status}
                              </span>
                            </div>
                            {log.messageId && (
                              <div>
                                <span className="text-muted-foreground">Message ID: </span>
                                <span className="font-mono text-[10px]">{log.messageId}</span>
                              </div>
                            )}
                          </div>
                          {isFailed && log.error && (
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                              <p className="text-xs text-red-400"><strong>Error:</strong> {log.error}</p>
                            </div>
                          )}
                          {log.htmlBody && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 font-medium">Email Body Preview:</p>
                              <div className="rounded border bg-white overflow-hidden">
                                <iframe
                                  srcDoc={log.htmlBody}
                                  sandbox=""
                                  title="Email body preview"
                                  className="w-full border-0"
                                  style={{ minHeight: "150px", maxHeight: "300px" }}
                                  data-testid={`email-log-body-${log.id}`}
                                />
                              </div>
                            </div>
                          )}
                          {!log.htmlBody && log.textBody && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 font-medium">Email Body:</p>
                              <div className="rounded border bg-muted/30 p-3 max-h-[200px] overflow-y-auto">
                                <p className="text-xs whitespace-pre-wrap" data-testid={`email-log-body-${log.id}`}>{log.textBody}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
