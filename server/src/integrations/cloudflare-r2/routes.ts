import type { Express, Response, Request } from "express";
import multer from "multer";
import { R2StorageService, isR2ConfiguredAsync } from "./r2Storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerR2Routes(app: Express): void {
  console.log("[R2] Registering R2 upload routes (credentials checked per-request)");

  app.post("/api/r2/request-upload-url", async (req, res) => {
    try {
      const configured = await isR2ConfiguredAsync();
      if (!configured) {
        return res.status(503).json({ error: "Cloudflare R2 is not configured. Please configure it in Admin > Integrations." });
      }

      const r2Service = new R2StorageService();
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

  app.post("/api/r2/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const configured = await isR2ConfiguredAsync();
      if (!configured) {
        return res.status(503).json({ error: "Cloudflare R2 is not configured. Please configure it in Admin > Integrations." });
      }

      const r2Service = new R2StorageService();
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

  app.get("/r2/*", async (req, res) => {
    try {
      const configured = await isR2ConfiguredAsync();
      if (!configured) {
        return res.status(503).json({ error: "Cloudflare R2 is not configured" });
      }

      const r2Service = new R2StorageService();
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
