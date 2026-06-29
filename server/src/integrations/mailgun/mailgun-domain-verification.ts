export interface MailgunDomainVerificationDetails {
  name?: string | null;
  state?: string | null;
  is_disabled?: boolean | null;
  domain?: {
    name?: string | null;
    state?: string | null;
    is_disabled?: boolean | null;
  } | null;
}

export function getMailgunDomainVerificationError(
  domainDetails: MailgunDomainVerificationDetails,
  expectedDomain: string,
): string | null {
  const actualDomain = domainDetails.domain?.name || domainDetails.name || expectedDomain;
  const state = domainDetails.domain?.state || domainDetails.state || "unknown";

  if (state !== "active") {
    return `Mailgun domain ${actualDomain} is ${state}`;
  }

  if (domainDetails.domain?.is_disabled || domainDetails.is_disabled) {
    return `Mailgun domain ${actualDomain} is disabled`;
  }

  return null;
}
