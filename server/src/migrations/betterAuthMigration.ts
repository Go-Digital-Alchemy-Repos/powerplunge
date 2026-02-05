import { db } from "../db";
import { sql } from "drizzle-orm";
import { 
  betterAuthUser, 
  betterAuthAccount 
} from "@shared/models/better-auth";
import { customers, adminUsers } from "@shared/schema";

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errors: string[];
}

export async function migrateCustomersToBetterAuth(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    const existingCustomers = await db.select().from(customers);
    
    for (const customer of existingCustomers) {
      try {
        const existingUser = await db
          .select()
          .from(betterAuthUser)
          .where(sql`email = ${customer.email}`)
          .limit(1);

        if (existingUser.length > 0) {
          console.log(`[MIGRATION] Skipping customer ${customer.email} - already exists in Better Auth`);
          result.skippedCount++;
          continue;
        }

        const userId = crypto.randomUUID();
        
        await db.insert(betterAuthUser).values({
          id: userId,
          email: customer.email,
          name: customer.name || customer.email.split("@")[0],
          emailVerified: false,
          role: "customer",
          customerId: customer.id,
          createdAt: customer.createdAt || new Date(),
          updatedAt: new Date(),
        });

        if (customer.passwordHash) {
          console.log(`[MIGRATION] Note: Customer ${customer.email} has existing password hash. User may need to reset password if hash formats differ.`);
          await db.insert(betterAuthAccount).values({
            id: crypto.randomUUID(),
            userId: userId,
            accountId: userId,
            providerId: "credential",
            password: customer.passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        console.log(`[MIGRATION] Migrated customer ${customer.email} (linked to customerId: ${customer.id})`);
        result.migratedCount++;
      } catch (error: any) {
        result.errors.push(`Customer ${customer.email}: ${error.message}`);
        console.error(`[MIGRATION] Failed to migrate customer ${customer.email}:`, error);
      }
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Migration failed: ${error.message}`);
  }

  return result;
}

export async function migrateAdminsToBetterAuth(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    const existingAdmins = await db.select().from(adminUsers);
    
    for (const admin of existingAdmins) {
      try {
        const existingUser = await db
          .select()
          .from(betterAuthUser)
          .where(sql`email = ${admin.email}`)
          .limit(1);

        if (existingUser.length > 0) {
          console.log(`[MIGRATION] Skipping admin ${admin.email} - already exists in Better Auth`);
          result.skippedCount++;
          continue;
        }

        const betterAuthRole = mapAdminRoleToBetterAuth(admin.role);
        const userId = crypto.randomUUID();
        
        await db.insert(betterAuthUser).values({
          id: userId,
          email: admin.email,
          name: admin.name || admin.email.split("@")[0],
          emailVerified: true,
          role: betterAuthRole,
          adminUserId: admin.id,
          createdAt: admin.createdAt || new Date(),
          updatedAt: new Date(),
        });

        if (admin.password) {
          console.log(`[MIGRATION] Note: Admin ${admin.email} has existing password hash. User may need to reset password if hash formats differ.`);
          await db.insert(betterAuthAccount).values({
            id: crypto.randomUUID(),
            userId: userId,
            accountId: userId,
            providerId: "credential",
            password: admin.password,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        console.log(`[MIGRATION] Migrated admin ${admin.email} with role ${betterAuthRole} (linked to adminUserId: ${admin.id})`);
        result.migratedCount++;
      } catch (error: any) {
        result.errors.push(`Admin ${admin.email}: ${error.message}`);
        console.error(`[MIGRATION] Failed to migrate admin ${admin.email}:`, error);
      }
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Migration failed: ${error.message}`);
  }

  return result;
}

function mapAdminRoleToBetterAuth(role: string | null): string {
  switch (role) {
    case "superadmin":
      return "superadmin";
    case "store_manager":
      return "store_manager";
    case "fulfillment":
      return "fulfillment";
    case "admin":
    default:
      return "admin";
  }
}

export async function runFullMigration(): Promise<{
  customers: MigrationResult;
  admins: MigrationResult;
}> {
  console.log("[MIGRATION] Starting full user migration to Better Auth...");
  
  const customerResult = await migrateCustomersToBetterAuth();
  const adminResult = await migrateAdminsToBetterAuth();
  
  console.log("[MIGRATION] Migration complete.");
  console.log(`[MIGRATION] Customers: ${customerResult.migratedCount} migrated, ${customerResult.skippedCount} skipped`);
  console.log(`[MIGRATION] Admins: ${adminResult.migratedCount} migrated, ${adminResult.skippedCount} skipped`);
  
  if (customerResult.errors.length > 0 || adminResult.errors.length > 0) {
    console.log("[MIGRATION] Errors:", [...customerResult.errors, ...adminResult.errors]);
  }
  
  return {
    customers: customerResult,
    admins: adminResult,
  };
}
