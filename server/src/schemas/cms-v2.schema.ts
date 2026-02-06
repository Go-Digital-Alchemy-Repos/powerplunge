import { z } from "zod";

export const cmsV2HealthResponseSchema = z.object({
  ok: z.boolean(),
});

export type CmsV2HealthResponse = z.infer<typeof cmsV2HealthResponseSchema>;
