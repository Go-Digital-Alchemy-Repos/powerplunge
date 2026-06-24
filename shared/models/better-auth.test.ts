import { describe, expect, it } from "vitest";
import { getTableName, is, Table } from "drizzle-orm";
import * as schema from "../schema";

describe("Better Auth schema exports", () => {
  it("exposes Better Auth tables through the Drizzle schema entrypoint", () => {
    const tableNames = Object.values(schema)
      .filter((value) => is(value, Table))
      .map((table) => getTableName(table as Table));

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "better_auth_user",
        "better_auth_session",
        "better_auth_account",
        "better_auth_verification",
      ]),
    );
  });
});
