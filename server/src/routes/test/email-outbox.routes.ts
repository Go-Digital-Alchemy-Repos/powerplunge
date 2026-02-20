import { Router } from "express";
import {
  clearEmailOutbox,
  getLatestOutboxEmail,
  getOutboxEmails,
  isEmailOutboxEnabled,
} from "../../testing/email-outbox";

const router = Router();

function parseStringQuery(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

router.use((_req, res, next) => {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.E2E_TEST_MODE !== "true" ||
    !isEmailOutboxEnabled()
  ) {
    return res.status(404).json({ message: "Not found" });
  }
  next();
});

router.post("/clear", (_req, res) => {
  clearEmailOutbox();
  res.json({ success: true });
});

router.get("/latest", (req, res) => {
  const to = parseStringQuery(req.query.to);
  const subjectContains = parseStringQuery(req.query.subjectContains);
  const message = getLatestOutboxEmail({ to, subjectContains });

  if (!message) {
    return res.status(404).json({ message: "No matching email found" });
  }

  res.json(message);
});

router.get("/", (req, res) => {
  const to = parseStringQuery(req.query.to);
  const subjectContains = parseStringQuery(req.query.subjectContains);
  const messages = getOutboxEmails({ to, subjectContains });
  res.json({ count: messages.length, messages });
});

export default router;
