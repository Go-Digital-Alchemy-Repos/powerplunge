import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { loginAsAdmin, loginAsCustomer } from "./helpers/auth";

type Fixtures = {
  adminPage: Page;
  customerPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);
    await use(page);
    await context.close();
  },
  customerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsCustomer(page);
    await use(page);
    await context.close();
  },
});

export { expect };
