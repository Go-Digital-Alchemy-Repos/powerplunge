import type { Express, Response, Request } from "express";
import multer from "multer";
import { R2StorageService, isR2Configured } from "./r2Storage";

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Register Cloudflare R2 storage routes for file uploads.
 * 
 * These routes provide the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading to R2
 * 2. The client uploads directly to the presigned URL
 * 3. GET /r2/:objectKey(*) - Redirect to presigned download URL
 */
export function registerR2Routes(app: Express): void {
  if (!isR2Configured()) {
    console.log("[R2] Cloudflare R2 not configured - R2 routes disabled");
    return;
  }

  const r2Service = new R2StorageService();
  console.log("[R2] Cloudflare R2 configured - registering R2 routes");

  /**
   * Request a presigned URL for file upload to R2.
   * 
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg",
   *   "folder": "uploads" (optional)
   * }
   */
  app.post("/api/r2/request-upload-url", async (req, res) => {
    try {
      const { name, size, contentType, folder = "uploads" } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Missing required field: name" });
      }

      const result = await r2Service.getUploadPresignedUrl(
        name,
        contentType || "application/octet-stream",
        folder
      );

      res.json({
        uploadURL: result.uploadURL,
        objectPath: result.objectPath,
        objectKey: result.objectKey,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("[R2] Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Proxy upload endpoint - uploads file through server to R2.
   * This bypasses CORS issues with direct browser-to-R2 uploads.
   * 
   * Request: multipart/form-data with 'file' field
   * Response: { objectPath, objectKey, metadata }
   */
  app.post("/api/r2/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const folder = (req.body.folder as string) || "uploads";
      
      const result = await r2Service.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folder
      );

      res.json({
        objectPath: result.objectPath,
        objectKey: result.objectKey,
        metadata: {
          name: file.originalname,
          size: file.size,
          contentType: file.mimetype,
        },
      });
    } catch (error) {
      console.error("[R2] Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  /**
   * Serve files from R2 via presigned download URLs.
   * Redirects to a temporary presigned URL for the object.
   */
  app.get("/r2/*", async (req, res) => {
    try {
      const objectKey = req.path.substring(4); // Remove /r2/ prefix
      
      if (!objectKey) {
        return res.status(400).json({ error: "Missing object key" });
      }

      const downloadUrl = await r2Service.getDownloadPresignedUrl(objectKey);
      res.redirect(downloadUrl);
    } catch (error) {
      console.error("[R2] Error serving object:", error);
      res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
