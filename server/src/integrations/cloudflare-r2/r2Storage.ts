import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

// Environment variables (fallback)
const ENV_R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ENV_R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const ENV_R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const ENV_R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

// Cached credentials from database
let cachedDbCredentials: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string | null;
} | null = null;
let credentialsCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

// Get R2 credentials from database or environment
async function getR2Credentials(): Promise<{
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string | null;
} | null> {
  // Check cache first
  if (cachedDbCredentials && Date.now() - credentialsCacheTime < CACHE_TTL) {
    return cachedDbCredentials;
  }

  // Try to get credentials from database first
  try {
    const settings = await storage.getIntegrationSettings();
    if (settings?.r2Configured && 
        settings.r2AccountId && 
        settings.r2AccessKeyIdEncrypted && 
        settings.r2SecretAccessKeyEncrypted && 
        settings.r2BucketName) {
      cachedDbCredentials = {
        accountId: settings.r2AccountId,
        accessKeyId: decrypt(settings.r2AccessKeyIdEncrypted),
        secretAccessKey: decrypt(settings.r2SecretAccessKeyEncrypted),
        bucketName: settings.r2BucketName,
        publicUrl: settings.r2PublicUrl || null,
      };
      credentialsCacheTime = Date.now();
      return cachedDbCredentials;
    }
  } catch (error) {
    console.error("[R2] Error loading credentials from database:", error);
  }

  // Fall back to environment variables
  if (ENV_R2_ACCOUNT_ID && ENV_R2_ACCESS_KEY_ID && ENV_R2_SECRET_ACCESS_KEY && ENV_R2_BUCKET_NAME) {
    return {
      accountId: ENV_R2_ACCOUNT_ID,
      accessKeyId: ENV_R2_ACCESS_KEY_ID,
      secretAccessKey: ENV_R2_SECRET_ACCESS_KEY,
      bucketName: ENV_R2_BUCKET_NAME,
      publicUrl: null,
    };
  }

  return null;
}

// Check if R2 is configured (sync version for route registration)
export function isR2Configured(): boolean {
  // Check environment variables first (sync check)
  if (ENV_R2_ACCOUNT_ID && ENV_R2_ACCESS_KEY_ID && ENV_R2_SECRET_ACCESS_KEY && ENV_R2_BUCKET_NAME) {
    return true;
  }
  // For database credentials, we'll return true if cache exists
  // The actual check happens async in the route handlers
  return !!cachedDbCredentials;
}

// Async check for R2 configuration
export async function isR2ConfiguredAsync(): Promise<boolean> {
  const creds = await getR2Credentials();
  return !!creds;
}

// Create S3 client configured for Cloudflare R2
async function getR2Client(): Promise<{ client: S3Client; bucketName: string; publicUrl: string | null }> {
  const creds = await getR2Credentials();
  
  if (!creds) {
    throw new Error("Cloudflare R2 is not configured. Please configure it in the admin Integrations page or set environment variables.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${creds.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return { client, bucketName: creds.bucketName, publicUrl: creds.publicUrl };
}

// Clear cached credentials (call after settings update)
export function clearR2CredentialsCache(): void {
  cachedDbCredentials = null;
  credentialsCacheTime = 0;
}

export class R2StorageService {
  /**
   * Generate a presigned URL for uploading a file to R2
   */
  async getUploadPresignedUrl(
    filename: string,
    contentType: string,
    folder: string = "uploads"
  ): Promise<{ uploadURL: string; objectPath: string; objectKey: string }> {
    const { client, bucketName } = await getR2Client();
    
    const timestamp = Date.now();
    const uuid = randomUUID().split("-")[0];
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const objectKey = `${folder}/${timestamp}_${uuid}_${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadURL = await getSignedUrl(client, command, {
      expiresIn: 3600, // URL valid for 1 hour
    });

    // The objectPath that will be used to access the file
    const objectPath = `/r2/${objectKey}`;

    return { uploadURL, objectPath, objectKey };
  }

  /**
   * Generate a presigned URL for downloading/viewing a file from R2
   */
  async getDownloadPresignedUrl(objectKey: string): Promise<string> {
    const { client, bucketName } = await getR2Client();
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    return getSignedUrl(client, command, {
      expiresIn: 3600, // URL valid for 1 hour
    });
  }

  /**
   * Get the public URL for an object (if bucket has public access)
   * For R2 with public access enabled via custom domain or R2.dev subdomain
   */
  getPublicUrl(objectKey: string): string {
    // If you have a custom domain configured for R2, update this
    // For now, we'll use presigned URLs for access
    return `/r2/${objectKey}`;
  }

  /**
   * Extract object key from an object path
   */
  extractObjectKey(objectPath: string): string {
    // Remove the /r2/ prefix if present
    if (objectPath.startsWith("/r2/")) {
      return objectPath.substring(4);
    }
    return objectPath;
  }

  /**
   * Upload a file directly to R2 (server-side upload)
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder: string = "uploads"
  ): Promise<{ objectPath: string; objectKey: string }> {
    const { client, bucketName } = await getR2Client();
    
    const timestamp = Date.now();
    const uuid = randomUUID().split("-")[0];
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const objectKey = `${folder}/${timestamp}_${uuid}_${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    const objectPath = `/r2/${objectKey}`;
    return { objectPath, objectKey };
  }
}
