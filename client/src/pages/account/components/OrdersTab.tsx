import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, Clock, ExternalLink, MapPinned, PackageCheck, Headset, MessageSquare } from "lucide-react";
import { useAccountOrders } from "../hooks/useAccountOrders";
import { statusConfig, shipmentSteps } from "../types";
import type { ShipmentStatus } from "../types";

function getShipmentStepIndex(status: string): number {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "_") as ShipmentStatus;
  const index = shipmentSteps.findIndex((s) => s.status === normalizedStatus);
  return index >= 0 ? index : 0;
}

function ShipmentTimeline({ status, updatedAt }: { status: string; updatedAt?: string }) {
  const currentStepIndex = getShipmentStepIndex(status);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(currentStepIndex / (shipmentSteps.length - 1)) * 100}%` }}
        />

        {shipmentSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.status} className="flex flex-col items-center z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                      : "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`timeline-step-${step.status}`}
              >
                <StepIcon className="w-5 h-5" />
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isCompleted ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {updatedAt && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Last updated: {new Date(updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

export default function OrdersTab({ onContactSupport }: { onContactSupport?: (orderId?: string) => void }) {
  const [, setLocation] = useLocation();
  const { orders, isLoading } = useAccountOrders();

  return (
    <>
      <h1 className="font-display text-3xl font-bold mb-8" data-testid="text-page-title">My Orders</h1>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">When you place an order, it will appear here.</p>
            <Button onClick={() => setLocation("/")} data-testid="button-shop">
              Start Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 ${status.color}`}>
                    <StatusIcon className="w-5 h-5" />
                    <span className="font-medium">{status.label}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">${((item.unitPrice * item.quantity) / 100).toLocaleString()}</p>
                      </div>
                    ))}
                    {(order.subtotalAmount != null || (order.affiliateDiscountAmount ?? 0) > 0 || (order.couponDiscountAmount ?? 0) > 0 || (order.taxAmount ?? 0) > 0) && (
                      <div className="space-y-1 pt-3 border-t border-border">
                        {order.subtotalAmount != null && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>${(order.subtotalAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {(order.affiliateDiscountAmount ?? 0) > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Affiliate Discount</span>
                            <span className="text-green-500">-${(order.affiliateDiscountAmount! / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {(order.couponDiscountAmount ?? 0) > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                            <span className="text-green-500">-${(order.couponDiscountAmount! / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {(order.taxAmount ?? 0) > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Tax</span>
                            <span>${(order.taxAmount! / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between pt-4 font-semibold">
                      <span>Total</span>
                      <span className="text-primary">{`$${(order.totalAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                    </div>
                  </div>

                  {(order.status === "shipped" || order.status === "delivered" || order.shipments?.length) && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border" data-testid={`shipment-section-${order.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MapPinned className="w-5 h-5 text-primary" />
                          <span className="font-medium">Shipment Tracking</span>
                        </div>
                        {order.shipments && order.shipments.length > 0 && order.shipments[0].trackingUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-track-package-${order.id}`}
                          >
                            <a
                              href={order.shipments[0].trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Track Package
                            </a>
                          </Button>
                        )}
                      </div>

                      <ShipmentTimeline 
                        status={order.shipments?.[0]?.status || order.status}
                        updatedAt={order.shipments?.[0]?.updatedAt || order.shipments?.[0]?.shippedAt}
                      />

                      {order.shipments && order.shipments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {order.shipments.map((shipment) => (
                            <div 
                              key={shipment.id} 
                              className="flex items-center justify-between bg-background/50 rounded-lg p-3"
                              data-testid={`shipment-details-${shipment.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{shipment.carrier}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {shipment.trackingNumber}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge 
                                  variant="outline"
                                  className={
                                    shipment.status === "delivered" ? "border-emerald-500 text-emerald-500" :
                                    shipment.status === "in_transit" ? "border-blue-500 text-blue-500" :
                                    shipment.status === "shipped" ? "border-primary text-primary" :
                                    "border-yellow-500 text-yellow-500"
                                  }
                                  data-testid={`badge-shipment-status-${shipment.id}`}
                                >
                                  {shipment.status === "in_transit" ? "In Transit" : 
                                   shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
                                </Badge>
                                {shipment.shippedAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(shipment.shippedAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!order.shipments || order.shipments.length === 0) && order.status === "shipped" && (
                        <p className="text-sm text-muted-foreground text-center mt-2">
                          Tracking details will be available shortly.
                        </p>
                      )}

                      {order.status === "delivered" && (
                        <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                          <div className="flex items-center justify-center gap-2 text-emerald-500">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Package delivered!</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Thank you for your purchase. Enjoy your Power Plunge!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(order.status === "pending" || order.status === "paid") && !order.shipments?.length && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border" data-testid={`pending-section-${order.id}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-yellow-500" />
                        <span className="font-medium">Order Processing</span>
                      </div>
                      <ShipmentTimeline status="pending" />
                      <p className="text-sm text-muted-foreground text-center">
                        Your order is being prepared. Tracking information will be available once shipped.
                      </p>
                    </div>
                  )}

                  {onContactSupport && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => onContactSupport(order.id)}
                        data-testid={`button-order-help-${order.id}`}
                      >
                        <Headset className="w-4 h-4 mr-2" />
                        Need help with this order?
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {onContactSupport && (
        <Card className="mt-8 bg-muted/20 border-dashed" data-testid="card-contact-support-cta">
          <CardContent className="py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Have a question or need assistance?</h3>
                  <p className="text-xs text-muted-foreground">Our support team is here to help with any questions or concerns.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContactSupport()}
                data-testid="button-contact-support"
              >
                <Headset className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
