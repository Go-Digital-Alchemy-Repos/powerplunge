import { Clock, CheckCircle, Truck, Package, PackageCheck } from "lucide-react";

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Shipment {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  status: string;
  shippedAt: string;
  updatedAt?: string;
  estimatedDelivery?: string;
}

export type ShipmentStatus = "pending" | "shipped" | "in_transit" | "delivered";

export const shipmentSteps: { status: ShipmentStatus; label: string; icon: any }[] = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "shipped", label: "Shipped", icon: Package },
  { status: "in_transit", label: "In Transit", icon: Truck },
  { status: "delivered", label: "Delivered", icon: PackageCheck },
];

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  affiliateDiscountAmount?: number | null;
  couponDiscountAmount?: number | null;
  couponCode?: string | null;
  createdAt: string;
  items: OrderItem[];
  shipments?: Shipment[];
  isManualOrder?: boolean;
  stripePaymentIntentId?: string | null;
}

export interface CustomerData {
  customer?: {
    name: string;
    email: string;
  };
  orders: Order[];
}

export interface VipData {
  isVip: boolean;
  vipStatus: {
    id: string;
    status: string;
    tier: string;
    lifetimeSpendAtPromotion: number;
    orderCountAtPromotion: number;
    promotedAt: string;
    promotionType: string;
  } | null;
  benefits: {
    isVip: boolean;
    freeShipping: boolean;
    freeShippingThreshold: number;
    discountPercent: number;
    prioritySupport: boolean;
    earlyAccess: boolean;
  };
  eligibility: {
    isEligible: boolean;
    isCurrentVip: boolean;
    lifetimeSpend: number;
    orderCount: number;
    spendThreshold: number;
    orderThreshold: number;
  };
}

export interface AffiliateData {
  affiliate: {
    id: string;
    code: string;
    status: string;
    totalEarnings: number;
    pendingEarnings: number;
    approvedEarnings: number;
    paidEarnings: number;
    totalReferrals: number;
    totalConversions: number;
    totalRevenue: number;
    createdAt: string;
  } | null;
  referrals: Array<{
    id: string;
    orderTotal: number;
    commission: number;
    status: string;
    createdAt: string;
    approvedAt?: string;
    paidAt?: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    requestedAt: string;
    processedAt?: string;
    notes?: string;
  }>;
  commissionRate: number;
  minimumPayout: number;
  approvalDays: number;
  agreementText: string;
  ffEnabled?: boolean;
  programTerms?: {
    standard: {
      commission: { type: string; value: number };
      discount: { type: string; value: number };
    };
    friendsAndFamily: {
      enabled: boolean;
      commission: { type: string; value: number };
      discount: { type: string; value: number };
    };
  };
}

export interface ConnectStatus {
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };
  country?: string;
  currency?: string;
}

export interface AdminNote {
  text: string;
  adminId: string;
  adminName: string;
  createdAt: string;
}

export interface CustomerReply {
  text: string;
  customerName: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  type: string;
  status: string;
  priority: string;
  orderId: string | null;
  adminNotes: AdminNote[] | null;
  customerReplies: CustomerReply[] | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-yellow-500" },
  paid: { icon: CheckCircle, label: "Paid", color: "text-green-500" },
  shipped: { icon: Truck, label: "Shipped", color: "text-blue-500" },
  delivered: { icon: Package, label: "Delivered", color: "text-emerald-500" },
  cancelled: { icon: Clock, label: "Cancelled", color: "text-red-500" },
};

export interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SupportForm {
  subject: string;
  message: string;
  orderId: string;
  type: string;
}
