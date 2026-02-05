export interface OrderStatusConfig {
  label: string;
  subtext: string;
  color: string;
  bgColor: string;
  icon: "clock" | "check" | "truck" | "delivered" | "cancelled";
}

export const ORDER_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
  pending: {
    label: "Order Received",
    subtext: "We've received your order and are processing payment.",
    color: "#ca8a04",
    bgColor: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    icon: "clock",
  },
  paid: {
    label: "Order Confirmed",
    subtext: "Payment complete — your order is being prepared for shipment.",
    color: "#059669",
    bgColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    icon: "check",
  },
  shipped: {
    label: "Shipped",
    subtext: "Your order is on its way! Check your email for tracking details.",
    color: "#2563eb",
    bgColor: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    icon: "truck",
  },
  delivered: {
    label: "Delivered",
    subtext: "Your order has been delivered. Enjoy your Power Plunge!",
    color: "#059669",
    bgColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    icon: "delivered",
  },
  cancelled: {
    label: "Cancelled",
    subtext: "This order has been cancelled. Contact us if you have questions.",
    color: "#dc2626",
    bgColor: "bg-red-500/20 text-red-400 border border-red-500/30",
    icon: "cancelled",
  },
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_CONFIG[status]?.label || status;
}

export function getOrderStatusSubtext(status: string): string {
  return ORDER_STATUS_CONFIG[status]?.subtext || "";
}

export function getOrderStatusColor(status: string): string {
  return ORDER_STATUS_CONFIG[status]?.color || "#6b7280";
}

export function getOrderStatusBgColor(status: string): string {
  return ORDER_STATUS_CONFIG[status]?.bgColor || "bg-gray-100 text-gray-800";
}
