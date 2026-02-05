import { z } from "zod";

export const payoutRequestSchema = z.object({
  amount: z.number().int().positive("Amount must be a positive integer (cents)").optional(),
  paymentMethod: z.enum(["stripe_connect", "paypal", "bank_transfer"]).optional().default("stripe_connect"),
  notes: z.string().max(500).optional(),
});

export const adminPayoutSchema = z.object({
  amount: z.number().int().positive("Amount must be a positive integer (cents)"),
  paymentMethod: z.enum(["stripe_connect", "paypal", "bank_transfer", "check", "other"]).optional().default("paypal"),
  paymentDetails: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const approvePayoutSchema = z.object({
  payoutId: z.string().uuid("Invalid payout ID"),
});

export const rejectPayoutSchema = z.object({
  payoutId: z.string().uuid("Invalid payout ID"),
  reason: z.string().min(1, "Reason is required").max(500),
});

export const commissionIdSchema = z.object({
  commissionId: z.string().uuid("Invalid commission ID"),
});

export const affiliateIdSchema = z.object({
  affiliateId: z.string().uuid("Invalid affiliate ID"),
});

export const voidCommissionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const bulkApproveSchema = z.object({
  commissionIds: z.array(z.string().uuid("Invalid commission ID")).min(1, "At least one commission ID required"),
});

export const limitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const runPayoutBatchSchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

export type PayoutRequest = z.infer<typeof payoutRequestSchema>;
export type AdminPayout = z.infer<typeof adminPayoutSchema>;
export type ApprovePayout = z.infer<typeof approvePayoutSchema>;
export type RejectPayout = z.infer<typeof rejectPayoutSchema>;
export type VoidCommission = z.infer<typeof voidCommissionSchema>;
export type BulkApprove = z.infer<typeof bulkApproveSchema>;
