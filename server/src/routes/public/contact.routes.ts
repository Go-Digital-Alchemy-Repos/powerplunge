import { Router } from "express";
import { z } from "zod";
import { db } from "../../../db";
import { supportTickets, customers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createRateLimiter } from "../../middleware/rate-limiter";

const router = Router();

const contactRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many contact submissions. Please try again in a few minutes.",
  name: "contact_form",
});

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  type: z.enum(["general", "return", "refund", "shipping", "technical"]).default("general"),
  honeypot: z.string().max(0).optional(),
});

router.post("/", contactRateLimiter, async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    if (parsed.data.honeypot) {
      return res.status(201).json({
        success: true,
        ticketId: "ok",
        message: "Your message has been received.",
      });
    }

    const { name, email, subject, message, type } = parsed.data;

    let customer = await db.query.customers.findFirst({
      where: eq(customers.email, email),
    });

    if (!customer) {
      const [newCustomer] = await db.insert(customers).values({
        email,
        name,
      }).returning();
      customer = newCustomer;
    }

    const contactName = customer.name !== name ? `${name} (via contact form)` : undefined;

    const [ticket] = await db.insert(supportTickets).values({
      customerId: customer.id,
      subject: contactName ? `[${contactName}] ${subject}` : subject,
      message,
      type,
    }).returning();

    res.status(201).json({
      success: true,
      ticketId: ticket.id,
      message: "Your message has been received. We'll get back to you as soon as possible.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
