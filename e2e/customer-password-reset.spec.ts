import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers/test-data";
import { clearEmailOutbox, waitForEmailLink } from "./helpers/email-outbox";

test.describe("Customer Password Reset Email @customer", () => {
  test("customer can reset password from emailed link", async ({ page, request }) => {
    const email = uniqueEmail();
    const initialPassword = "Start123!";
    const newPassword = "Reset123!";

    const registerResponse = await request.post("/api/customer/auth/register", {
      data: {
        email,
        name: "E2E Reset Customer",
        password: initialPassword,
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    await clearEmailOutbox(request);

    await page.goto("/reset-password");
    await page.locator('[data-testid="input-email"]').fill(email);
    await page.locator('[data-testid="button-send-reset"]').click();

    await expect(page.locator('[data-testid="card-email-sent"]')).toBeVisible({
      timeout: 10000,
    });

    const resetLink = await waitForEmailLink(request, {
      to: email,
      subjectContains: "Reset Your Password",
      pathIncludes: "/reset-password?token=",
      timeoutMs: 15000,
    });

    await page.goto(resetLink);
    await expect(page.locator('[data-testid="card-set-new-password"]')).toBeVisible({
      timeout: 10000,
    });

    await page.locator('[data-testid="input-new-password"]').fill(newPassword);
    await page.locator('[data-testid="input-confirm-password"]').fill(newPassword);
    await page.locator('[data-testid="button-set-password"]').click();

    await expect(page.locator('[data-testid="card-reset-complete"]')).toBeVisible({
      timeout: 10000,
    });

    const loginResponse = await request.post("/api/customer/auth/login", {
      data: {
        email,
        password: newPassword,
      },
    });
    expect(loginResponse.ok()).toBeTruthy();
  });
});
