import type { CmsV2HealthResponse } from "../schemas/cms-v2.schema";

export class CmsV2Service {
  getHealth(): CmsV2HealthResponse {
    return { ok: true };
  }
}

export const cmsV2Service = new CmsV2Service();
