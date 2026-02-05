import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function getEncryptionKey(): Buffer {
  const key = process.env.APP_SECRETS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("APP_SECRETS_ENCRYPTION_KEY environment variable is not set");
  }
  return crypto.scryptSync(key, "salt", 32);
}

export function encrypt(text: string): string {
  if (!text) return "";
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed");
    throw new Error("Failed to encrypt data");
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption failed");
    throw new Error("Failed to decrypt data");
  }
}

export function maskSecret(secret: string, showChars: number = 4): string {
  if (!secret || secret.length <= showChars) {
    return "****";
  }
  const lastChars = secret.slice(-showChars);
  return `****${lastChars}`;
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  
  if (key.startsWith("pk_test_") || key.startsWith("pk_live_")) {
    const prefix = key.substring(0, 8);
    return `${prefix}****${key.slice(-4)}`;
  }
  
  if (key.startsWith("sk_test_") || key.startsWith("sk_live_")) {
    const prefix = key.substring(0, 8);
    return `${prefix}****${key.slice(-4)}`;
  }
  
  if (key.startsWith("whsec_")) {
    return `whsec_****${key.slice(-4)}`;
  }
  
  if (key.startsWith("key-")) {
    return `key-****${key.slice(-4)}`;
  }
  
  return maskSecret(key, 4);
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.APP_SECRETS_ENCRYPTION_KEY;
}

// Legacy alias for backward compatibility
export const maskKey = maskApiKey;
