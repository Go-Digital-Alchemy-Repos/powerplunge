import { registerCmsV1Blocks } from "./entries";

let initialized = false;

export function ensureBlocksRegistered() {
  if (!initialized) {
    registerCmsV1Blocks();
    initialized = true;
  }
}
