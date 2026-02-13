import { Router, Request, Response } from "express";
import { z } from "zod";

const router = Router();

const subscribeSchema = z.object({
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  email: z.string().email("Please enter a valid email address"),
});

router.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
    }

    const { firstName, lastName, email } = parsed.data;

    const { mailchimpService } = await import("../../integrations/mailchimp/MailchimpService");
    const result = await mailchimpService.addSubscriber(email, firstName, lastName);

    if (!result.success) {
      console.error("[NEWSLETTER] Mailchimp subscribe error:", result.error);
      return res.status(500).json({ error: "Unable to subscribe at this time. Please try again later." });
    }

    res.json({ success: true, message: "Successfully subscribed!" });
  } catch (error: any) {
    console.error("[NEWSLETTER] Subscribe error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
});

export default router;
