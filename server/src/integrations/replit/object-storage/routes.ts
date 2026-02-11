import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "server/public/uploads");

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Proxy upload endpoint - uploads file through server.
   * Tries Object Storage first, falls back to local filesystem.
   * 
   * Request: multipart/form-data with 'file' field
   * Response: { objectPath, metadata }
   */
  app.post("/api/uploads/upload", upload.single("file"), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { randomUUID } = await import("crypto");
    const objectId = randomUUID().split("-")[0];
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `${Date.now()}_${objectId}_${sanitizedName}`;

    try {
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${privateObjectDir}/uploads/${uniqueFilename}`;
      const pathParts = fullPath.startsWith("/") ? fullPath.slice(1).split("/") : fullPath.split("/");
      const bucketName = pathParts[0];
      const objectName = pathParts.slice(1).join("/");

      const bucket = objectStorageClient.bucket(bucketName);
      const gcsFile = bucket.file(objectName);

      await Promise.race([
        gcsFile.save(file.buffer, {
          contentType: file.mimetype || "application/octet-stream",
          resumable: false,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Object Storage upload timeout (3s)")), 3000))
      ]);

      const objectPath = `/objects/uploads/${uniqueFilename}`;
      console.log("[Object Storage] File uploaded successfully:", objectPath);

      return res.json({
        objectPath,
        metadata: {
          name: file.originalname,
          size: file.size,
          contentType: file.mimetype,
          publicUrl: objectPath,
        },
      });
    } catch (objStorageError) {
      const errMsg = (objStorageError as Error).message;
      console.warn("[Object Storage] Cloud upload failed, using local filesystem fallback:", errMsg);
    }

    try {
      fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
      const filePath = path.join(LOCAL_UPLOADS_DIR, uniqueFilename);
      fs.writeFileSync(filePath, file.buffer);

      const objectPath = `/local-uploads/${uniqueFilename}`;
      console.log("[Local Storage] File saved to local filesystem:", objectPath);

      res.json({
        objectPath,
        metadata: {
          name: file.originalname,
          size: file.size,
          contentType: file.mimetype,
          publicUrl: objectPath,
        },
      });
    } catch (localError) {
      console.error("[Local Storage] Error saving file locally:", localError);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/local-uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(LOCAL_UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.sendFile(filePath);
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

