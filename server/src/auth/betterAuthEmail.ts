import { emailService } from "../integrations/mailgun/EmailService";

interface AuthLinkEmail {
  email: string;
  name?: string | null;
  url: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendAuthLinkEmail({
  email,
  name,
  url,
  subject,
  heading,
  body,
  buttonLabel,
}: AuthLinkEmail & {
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string;
}): Promise<void> {
  const safeName = escapeHtml(name?.trim() || "there");
  const normalizedUrl = normalizeAuthEmailUrl(url);
  const safeUrl = escapeHtml(normalizedUrl);

  const result = await emailService.sendEmail({
    to: email,
    subject,
    text: `${body}\n\n${normalizedUrl}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f4f5;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#0891b2;padding:28px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">${escapeHtml(heading)}</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 20px;color:#374151;font-size:16px;">Hi ${safeName},</p>
        <p style="margin:0 0 28px;color:#374151;font-size:16px;line-height:1.5;">${escapeHtml(body)}</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${safeUrl}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:16px;">${escapeHtml(buttonLabel)}</a>
        </div>
        <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.5;">If you did not request this email, you can safely ignore it.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to send auth email");
  }
}

function normalizeAuthEmailUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const resetMatch = parsed.pathname.match(/\/reset-password\/([^/]+)$/);
    if (resetMatch) {
      parsed.pathname = "/reset-password";
      parsed.search = "";
      parsed.searchParams.set("token", resetMatch[1]);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function sendBetterAuthPasswordReset(data: AuthLinkEmail): Promise<void> {
  await sendAuthLinkEmail({
    ...data,
    subject: "Reset Your Password - Power Plunge",
    heading: "Reset Your Password",
    body: "Use this secure link to reset your Power Plunge password. The link expires in 1 hour.",
    buttonLabel: "Reset Password",
  });
}

export async function sendBetterAuthMagicLink(data: AuthLinkEmail): Promise<void> {
  await sendAuthLinkEmail({
    ...data,
    subject: "Sign in to Power Plunge",
    heading: "Sign in to Power Plunge",
    body: "Use this secure link to sign in to your Power Plunge account. The link expires shortly.",
    buttonLabel: "Sign In",
  });
}
