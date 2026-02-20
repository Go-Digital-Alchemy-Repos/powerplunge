export interface OutboxEmailMessage {
  id: string;
  createdAt: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface OutboxFilter {
  to?: string;
  subjectContains?: string;
}

const MAX_OUTBOX_MESSAGES = 250;
const emailOutbox: OutboxEmailMessage[] = [];

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  return list.map((entry) => entry.trim()).filter(Boolean);
}

function matchesFilter(message: OutboxEmailMessage, filter: OutboxFilter): boolean {
  if (filter.to) {
    const toAddress = normalizeAddress(filter.to);
    const recipientMatch = message.to.some((recipient) => normalizeAddress(recipient) === toAddress);
    if (!recipientMatch) return false;
  }

  if (filter.subjectContains) {
    const haystack = message.subject.toLowerCase();
    const needle = filter.subjectContains.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export function isEmailOutboxEnabled(): boolean {
  return process.env.E2E_EMAIL_MODE === "outbox";
}

export function addEmailToOutbox(params: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}): OutboxEmailMessage {
  const message: OutboxEmailMessage = {
    id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    to: normalizeRecipients(params.to),
    subject: params.subject,
    html: params.html,
    text: params.text,
    from: params.from,
    replyTo: params.replyTo,
  };

  emailOutbox.push(message);
  if (emailOutbox.length > MAX_OUTBOX_MESSAGES) {
    emailOutbox.splice(0, emailOutbox.length - MAX_OUTBOX_MESSAGES);
  }

  return message;
}

export function clearEmailOutbox(): void {
  emailOutbox.length = 0;
}

export function getOutboxEmails(filter: OutboxFilter = {}): OutboxEmailMessage[] {
  return emailOutbox.filter((message) => matchesFilter(message, filter));
}

export function getLatestOutboxEmail(filter: OutboxFilter = {}): OutboxEmailMessage | undefined {
  for (let index = emailOutbox.length - 1; index >= 0; index -= 1) {
    const message = emailOutbox[index];
    if (matchesFilter(message, filter)) {
      return message;
    }
  }
  return undefined;
}
