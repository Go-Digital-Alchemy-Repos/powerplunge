import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";
import { Headset, MessageSquare, CheckCircle, Clock, AlertCircle, Eye, Search, Filter, RefreshCw } from "lucide-react";

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  priority: string;
  orderId: string | null;
  adminNotes: string | null;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface TicketStats {
  status: string;
  count: number;
}

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
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");

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
    mutationFn: async (data: { id: string; status?: string; priority?: string; adminNotes?: string }) => {
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
    setAdminNotes(ticket.adminNotes || "");
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
  };

  const handleUpdateTicket = () => {
    if (!selectedTicket) return;
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      status: newStatus !== selectedTicket.status ? newStatus : undefined,
      priority: newPriority !== selectedTicket.priority ? newPriority : undefined,
      adminNotes: adminNotes !== selectedTicket.adminNotes ? adminNotes : undefined,
    });
  };

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access support. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="support" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Headset className="w-8 h-8 text-primary" />
            Support Tickets
          </h1>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-open-tickets">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold text-yellow-500">{getStatCount("open")}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-progress-tickets">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-500">{getStatCount("in_progress")}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-resolved-tickets">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-500">{getStatCount("resolved")}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-closed-tickets">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Closed</p>
                  <p className="text-2xl font-bold text-gray-500">{getStatCount("closed")}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-gray-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
          </CardHeader>
          <CardContent>
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
                          <p className="text-xs text-muted-foreground font-mono">#{ticket.id.slice(0, 8)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ticket.customerName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{ticket.customerEmail}</p>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTicketModal(ticket)}
                          data-testid={`button-view-${ticket.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Ticket #{selectedTicket?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Customer</h4>
                <p className="font-medium">{selectedTicket.customerName || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{selectedTicket.customerEmail}</p>
                {selectedTicket.orderId && (
                  <p className="text-sm mt-2">
                    <span className="text-muted-foreground">Related Order:</span>{" "}
                    <span className="font-mono">#{selectedTicket.orderId.slice(0, 8)}</span>
                  </p>
                )}
              </div>

              {/* Ticket Content */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Subject</h4>
                <p className="font-medium">{selectedTicket.subject}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Message</h4>
                <div className="p-4 rounded-lg bg-muted/30 whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Status & Priority Controls */}
              <div className="grid grid-cols-2 gap-4">
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

              {/* Admin Notes */}
              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this ticket..."
                  rows={4}
                  data-testid="input-admin-notes"
                />
              </div>

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(selectedTicket.updatedAt).toLocaleString()}</p>
                {selectedTicket.resolvedAt && (
                  <p>Resolved: {new Date(selectedTicket.resolvedAt).toLocaleString()}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
