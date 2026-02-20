import { APIRequestContext } from "@playwright/test";

interface WaitForEmailLinkParams {
  to: string;
  subjectContains?: string;
  pathIncludes: string;
  timeoutMs?: number;
}

interface OutboxMessage {
  html?: string;
  text?: string;
}

interface OutboxListResponse {
  count: number;
}

const POLL_INTERVAL_MS = 300;

function extractLinkFromHtml(html: string, pathIncludes: string): string | null {
  const hrefPattern = /href="([^"]+)"/gi;
  let match: RegExpExecArray | null = null;
  while ((match = hrefPattern.exec(html)) !== null) {
    const link = match[1].replace(/&amp;/g, "&");
    if (link.includes(pathIncludes)) {
      return link;
    }
  }
  return null;
}

function extractLinkFromText(text: string, pathIncludes: string): string | null {
  const urlPattern = /https?:\/\/[^\s)]+/gi;
  let match: RegExpExecArray | null = null;
  while ((match = urlPattern.exec(text)) !== null) {
    const link = match[0].replace(/&amp;/g, "&");
    if (link.includes(pathIncludes)) {
      return link;
    }
  }
  return null;
}

function buildMissingOutboxMessage(): string {
  return "Email outbox API unavailable. Start Playwright server with E2E_TEST_MODE=true and E2E_EMAIL_MODE=outbox.";
}

export async function clearEmailOutbox(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/test/email-outbox/clear");
  if (response.status() === 404) {
    throw new Error(buildMissingOutboxMessage());
  }
  if (!response.ok()) {
    throw new Error(`Failed to clear email outbox (status ${response.status()})`);
  }
}

export async function getEmailOutboxCount(
  request: APIRequestContext,
  params: { to?: string; subjectContains?: string } = {},
): Promise<number> {
  const query = new URLSearchParams();
  if (params.to) query.set("to", params.to);
  if (params.subjectContains) query.set("subjectContains", params.subjectContains);

  const response = await request.get(`/api/test/email-outbox?${query.toString()}`);
  if (response.status() === 404) {
    throw new Error(buildMissingOutboxMessage());
  }
  if (!response.ok()) {
    throw new Error(`Failed to fetch email outbox (status ${response.status()})`);
  }

  const body = (await response.json()) as OutboxListResponse;
  return body.count;
}

export async function waitForEmailLink(
  request: APIRequestContext,
  params: WaitForEmailLinkParams,
): Promise<string> {
  const timeoutMs = params.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const query = new URLSearchParams();
    query.set("to", params.to);
    if (params.subjectContains) query.set("subjectContains", params.subjectContains);

    const response = await request.get(`/api/test/email-outbox/latest?${query.toString()}`);
    if (response.status() === 404) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    if (!response.ok()) {
      throw new Error(`Failed to fetch email from outbox (status ${response.status()})`);
    }

    const message = (await response.json()) as OutboxMessage;
    const htmlLink = message.html ? extractLinkFromHtml(message.html, params.pathIncludes) : null;
    if (htmlLink) return htmlLink;

    const textLink = message.text ? extractLinkFromText(message.text, params.pathIncludes) : null;
    if (textLink) return textLink;

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for email link containing "${params.pathIncludes}" for ${params.to}`);
}
