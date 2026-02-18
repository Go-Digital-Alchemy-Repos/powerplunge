import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ADMIN_STATE = path.join(__dirname, ".auth/admin.json");
export const CUSTOMER_STATE = path.join(__dirname, ".auth/customer.json");
export const AFFILIATE_STATE = path.join(__dirname, ".auth/affiliate.json");
