const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const ESCAPE_RE = /[&<>"'\/`]/g;

export function escapeHtml(input: string): string {
  return input.replace(ESCAPE_RE, (char) => ESCAPE_MAP[char] || char);
}
