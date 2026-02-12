import crypto from "crypto";

const OTP_PEPPER = process.env.OTP_HASH_PEPPER || process.env.APP_SECRETS_ENCRYPTION_KEY || "default-otp-pepper-change-me";

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function hashOtp(code: string, salt: string): string {
  return crypto
    .createHmac("sha256", OTP_PEPPER)
    .update(`${salt}:${code}`)
    .digest("hex");
}

export function verifyOtp(code: string, salt: string, storedHash: string): boolean {
  const candidateHash = hashOtp(code, salt);
  if (candidateHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(candidateHash, "hex"),
    Buffer.from(storedHash, "hex"),
  );
}

export function generateOtpCode(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 900000 + 100000;
  return num.toString();
}
