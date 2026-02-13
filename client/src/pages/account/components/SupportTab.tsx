import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccountSupport } from "../hooks/useAccountSupport";
import { useAccountOrders } from "../hooks/useAccountOrders";

export default function SupportTab() {
  const { toast } = useToast();
  const {
    supportForm,
    setSupportForm,
    supportTickets,
    ticketsLoading,
    createTicketMutation,
  } = useAccountSupport();
  const { orders } = useAccountOrders();

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
                {supportTickets.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg border bg-muted/30"
                    data-testid={`ticket-card-${ticket.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm line-clamp-1">{ticket.subject}</h4>
                      <Badge
                        variant="outline"
                        className={
                          ticket.status === "resolved" || ticket.status === "closed"
                            ? "border-green-500 text-green-500"
                            : ticket.status === "in_progress"
                            ? "border-blue-500 text-blue-500"
                            : "border-yellow-500 text-yellow-500"
                        }
                        data-testid={`ticket-status-${ticket.id}`}
                      >
                        {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {ticket.type === "general" ? "General" :
                         ticket.type === "return" ? "Return" :
                         ticket.type === "refund" ? "Refund" :
                         ticket.type === "shipping" ? "Shipping" : "Technical"}
                      </Badge>
                      <span>•</span>
                      <span>
                        {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {ticket.resolvedAt && (
                        <>
                          <span>•</span>
                          <span className="text-green-500">Resolved</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
