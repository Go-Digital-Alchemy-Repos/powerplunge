import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Send, MessageSquare, Loader2, ChevronRight, User, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccountSupport } from "../hooks/useAccountSupport";
import { useAccountOrders } from "../hooks/useAccountOrders";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import type { SupportTicket } from "../types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    general: "General",
    return: "Return",
    refund: "Refund",
    shipping: "Shipping",
    technical: "Technical",
  };
  return labels[type] || type;
}

function statusBadgeClass(status: string) {
  if (status === "resolved" || status === "closed") return "border-green-500 text-green-500";
  if (status === "in_progress") return "border-blue-500 text-blue-500";
  return "border-yellow-500 text-yellow-500";
}

function statusLabel(status: string) {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface ThreadEntry {
  type: "customer_original" | "customer_reply" | "admin_reply";
  text: string;
  author: string;
  createdAt: string;
}

function buildThread(ticket: SupportTicket, customerName: string): ThreadEntry[] {
  const entries: ThreadEntry[] = [];
  entries.push({
    type: "customer_original",
    text: ticket.message,
    author: customerName,
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
        author: reply.customerName || customerName,
        createdAt: reply.createdAt,
      });
    }
  }
  entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return entries;
}

function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
  replyMutation,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyMutation: ReturnType<typeof useAccountSupport>["replyMutation"];
}) {
  const { customer } = useCustomerAuth();
  const [replyText, setReplyText] = useState("");
  if (!ticket) return null;

  const thread = buildThread(ticket, customer?.name || "You");
  const isClosed = ticket.status === "closed";

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    replyMutation.mutate(
      { ticketId: ticket.id, message: replyText.trim() },
      { onSuccess: () => setReplyText("") }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" data-testid="dialog-ticket-detail">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base leading-snug" data-testid="text-ticket-detail-subject">
                {ticket.subject}
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">{typeLabel(ticket.type)}</Badge>
                <Badge variant="outline" className={statusBadgeClass(ticket.status)} data-testid="text-ticket-detail-status">
                  {statusLabel(ticket.status)}
                </Badge>
                <span className="text-xs">{formatDate(ticket.createdAt)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-0" data-testid="ticket-conversation-thread">
          {thread.map((entry, idx) => {
            const isAdmin = entry.type === "admin_reply";
            const isHtml = isAdmin && entry.text.includes("<") && entry.text.includes(">");
            return (
              <div key={idx} className="flex gap-3" data-testid={`thread-entry-${idx}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAdmin ? "bg-blue-500/20 text-blue-400" : "bg-primary/20 text-primary"}`}>
                  {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${isAdmin ? "text-blue-400" : ""}`}>
                      {isAdmin ? entry.author : "You"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <div className={`rounded-lg p-3 text-sm ${isAdmin ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/50 border"}`}>
                    {isHtml ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1" dangerouslySetInnerHTML={{ __html: entry.text }} data-testid={`thread-text-${idx}`} />
                    ) : (
                      <p className="whitespace-pre-wrap" data-testid={`thread-text-${idx}`}>{entry.text}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {thread.length === 1 && (
            <div className="text-center py-4" data-testid="text-no-replies">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Waiting for a response from our support team</p>
              <p className="text-xs text-muted-foreground mt-1">We'll get back to you as soon as possible</p>
            </div>
          )}

          {ticket.resolvedAt && (
            <div className="text-center py-2">
              <Badge variant="outline" className="border-green-500 text-green-500">
                Resolved on {formatDate(ticket.resolvedAt)}
              </Badge>
            </div>
          )}
        </div>

        {!isClosed && (
          <div className="border-t pt-3 flex gap-2" data-testid="reply-section">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={2}
              className="flex-1 resize-none"
              maxLength={5000}
              data-testid="input-customer-reply"
            />
            <Button
              size="sm"
              onClick={handleSendReply}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="self-end"
              data-testid="button-send-reply"
            >
              {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
        {isClosed && (
          <div className="border-t pt-3 text-center text-sm text-muted-foreground">
            This ticket is closed. No further replies can be added.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SupportTab() {
  const { toast } = useToast();
  const {
    supportForm,
    setSupportForm,
    supportTickets,
    ticketsLoading,
    createTicketMutation,
    replyMutation,
  } = useAccountSupport();
  const { orders } = useAccountOrders();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const selectedTicket = selectedTicketId
    ? supportTickets?.tickets?.find((t) => t.id === selectedTicketId) ?? null
    : null;

  return (
    <>
      <h1 className="font-display text-3xl font-bold mb-8" data-testid="text-support-title">Customer Support</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Submit a Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!supportForm.subject.trim() || !supportForm.message.trim()) {
                  toast({ title: "Please fill in all required fields", variant: "destructive" });
                  return;
                }
                createTicketMutation.mutate({
                  subject: supportForm.subject,
                  message: supportForm.message,
                  orderId: supportForm.orderId || undefined,
                  type: supportForm.type,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="ticket-type">Request Type</Label>
                <Select
                  value={supportForm.type}
                  onValueChange={(value) => setSupportForm({ ...supportForm, type: value })}
                >
                  <SelectTrigger id="ticket-type" data-testid="select-ticket-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="return">Return Request</SelectItem>
                    <SelectItem value="refund">Refund Request</SelectItem>
                    <SelectItem value="shipping">Shipping Issue</SelectItem>
                    <SelectItem value="technical">Technical Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ticket-order">Related Order (Optional)</Label>
                <Select
                  value={supportForm.orderId || "none"}
                  onValueChange={(value) => setSupportForm({ ...supportForm, orderId: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="ticket-order" data-testid="select-order">
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific order</SelectItem>
                    {orders?.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        Order #{order.id.slice(0, 8)} - ${(order.totalAmount / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ticket-subject">Subject *</Label>
                <Input
                  id="ticket-subject"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  maxLength={200}
                  data-testid="input-ticket-subject"
                />
              </div>

              <div>
                <Label htmlFor="ticket-message">Message *</Label>
                <Textarea
                  id="ticket-message"
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  placeholder="Please describe your issue in detail..."
                  rows={5}
                  maxLength={5000}
                  data-testid="input-ticket-message"
                />
              </div>

              <Button
                type="submit"
                disabled={createTicketMutation.isPending}
                className="w-full"
                data-testid="button-submit-ticket"
              >
                {createTicketMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Your Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : !supportTickets?.tickets?.length ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No support requests yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {supportTickets.tickets.map((ticket) => {
                  const adminCount = Array.isArray(ticket.adminNotes) ? ticket.adminNotes.length : 0;
                  const customerCount = Array.isArray(ticket.customerReplies) ? ticket.customerReplies.length : 0;
                  const replyCount = adminCount + customerCount;
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className="w-full text-left p-4 rounded-lg border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-colors cursor-pointer group"
                      data-testid={`ticket-card-${ticket.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">{ticket.subject}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={statusBadgeClass(ticket.status)}
                            data-testid={`ticket-status-${ticket.id}`}
                          >
                            {statusLabel(ticket.status)}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {typeLabel(ticket.type)}
                        </Badge>
                        <span>•</span>
                        <span>{formatDate(ticket.createdAt)}</span>
                        {replyCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-400 font-medium" data-testid={`ticket-reply-count-${ticket.id}`}>
                              {replyCount} {replyCount === 1 ? "reply" : "replies"}
                            </span>
                          </>
                        )}
                        {ticket.resolvedAt && (
                          <>
                            <span>•</span>
                            <span className="text-green-500">Resolved</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TicketDetailDialog
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={(open) => { if (!open) setSelectedTicketId(null); }}
        replyMutation={replyMutation}
      />
    </>
  );
}
