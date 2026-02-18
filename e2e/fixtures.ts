import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { ADMIN_STATE, CUSTOMER_STATE, AFFILIATE_STATE } from "./auth-paths";

type Fixtures = {
  adminPage: Page;
  customerPage: Page;
  affiliatePage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  customerPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: CUSTOMER_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  affiliatePage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AFFILIATE_STATE,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
