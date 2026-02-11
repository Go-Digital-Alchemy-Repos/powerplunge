import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads with presigned URLs.
 *
 * This hook implements the two-step presigned URL upload flow:
 * 1. Request a presigned URL from your backend (sends JSON metadata, NOT the file)
 * 2. Upload the file directly to the presigned URL
 *
 * @example
 * ```tsx
 * function FileUploader() {
 *   const { uploadFile, isUploading, error } = useUpload({
 *     onSuccess: (response) => {
 *       console.log("Uploaded to:", response.objectPath);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await uploadFile(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *       {isUploading && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Upload a file through server proxy to avoid CORS issues.
   * File is uploaded to server which then uploads to R2/storage.
   *
   * @param file - The file to upload
   * @returns The upload response containing the object path
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        setProgress(10);

        // Use FormData for multipart upload through server proxy
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "uploads");

        let response: Response;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          response = await fetch("/api/r2/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch {
          response = new Response(null, { status: 503 });
        }

        if (response.status === 404 || response.status === 500 || response.status === 503) {
          // Fall back to Replit object storage proxy endpoint (avoids CORS)
          const fallbackFormData = new FormData();
          fallbackFormData.append("file", file);

          const fallbackResponse = await fetch("/api/uploads/upload", {
            method: "POST",
            body: fallbackFormData,
          });

          if (!fallbackResponse.ok) {
            let errorMessage = "Failed to upload file";
            try {
              const contentType = fallbackResponse.headers.get("content-type") || "";
              if (contentType.includes("application/json")) {
                const errorData = await fallbackResponse.json();
                errorMessage = errorData.error || errorMessage;
              }
            } catch {
              // Ignore JSON parse errors
            }
            throw new Error(errorMessage);
          }

          const fallbackData = await fallbackResponse.json();
          setProgress(100);

          const uploadResponse: UploadResponse = {
            uploadURL: "",
            objectPath: fallbackData.objectPath,
            metadata: fallbackData.metadata || {
              name: file.name,
              size: file.size,
              contentType: file.type,
              publicUrl: fallbackData.objectPath,
            },
          };
          options.onSuccess?.(uploadResponse);
          return uploadResponse;
        }

        setProgress(50);

        if (!response.ok) {
          let errorMessage = "Failed to upload file";
          try {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            }
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setProgress(100);

        const uploadResponse: UploadResponse = {
          uploadURL: "",
          objectPath: data.objectPath,
          metadata: data.metadata || {
            name: file.name,
            size: file.size,
            contentType: file.type,
            publicUrl: data.objectPath,
          },
        };
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  /**
   * Get upload parameters for Uppy's AWS S3 plugin.
   *
   * IMPORTANT: This function receives the UppyFile object from Uppy.
   * Use file.name, file.size, file.type to request per-file presigned URLs.
   *
   * Use this with the ObjectUploader component:
   * ```tsx
   * <ObjectUploader onGetUploadParameters={getUploadParameters}>
   *   Upload
   * </ObjectUploader>
   * ```
   */
  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      // Use the actual file properties to request a per-file presigned URL
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      return {
        method: "PUT",
        url: data.uploadURL,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      };
    },
    []
  );

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}

