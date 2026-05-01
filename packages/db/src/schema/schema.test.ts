import { describe, expect, it } from "vitest";
import { accounts, analysisRuns, projects, sessions, users, verifications } from "./index";

// Drizzle stores table name via Symbol(drizzle:Name)
const drizzleNameSym = Symbol.for("drizzle:Name");

// Helper to access Drizzle inline foreign keys from a table
function getInlineForeignKeys(
  table: Record<string, unknown>
): Array<{
  reference: () => {
    foreignTable: Record<string, unknown>;
    foreignColumns: Array<{ name: string }>;
  };
}> {
  const sym = Symbol.for("drizzle:PgInlineForeignKeys");
  return (table[sym] as Array<{ reference: () => { foreignTable: Record<string, unknown>; foreignColumns: Array<{ name: string }> } }>) ?? [];
}

// Helper: checks if table has an inline FK to targetTable.targetColumn
function hasInlineFkTo(
  table: Record<string, unknown>,
  targetTableName: string,
  targetColumnName: string
): boolean {
  const ifks = getInlineForeignKeys(table);
  for (const ifk of ifks) {
    const ref = ifk.reference();
    const ft = ref?.foreignTable;
    if (ft && ft[drizzleNameSym] === targetTableName && ref.foreignColumns.some((c) => c.name === targetColumnName)) {
      return true;
    }
  }
  return false;
}

describe("schema", () => {
  describe("auth ID type invariants (Better Auth uses text-backed IDs)", () => {
    it("users.id is text-backed", () => {
      expect(users.id.dataType).toBe("string");
    });

    it("accounts.id is text-backed", () => {
      expect(accounts.id.dataType).toBe("string");
    });

    it("sessions.id is text-backed", () => {
      expect(sessions.id.dataType).toBe("string");
    });
  });

  describe("FK invariants", () => {
    it("users.projectId has FK reference to projects.id", () => {
      expect(hasInlineFkTo(users as unknown as Record<string, unknown>, "projects", "id")).toBe(true);
    });
  });

  describe("session compatibility invariant", () => {
    it("sessions.sessionTokenHash is nullable (not required)", () => {
      expect(sessions.sessionTokenHash.notNull).toBe(false);
    });
  });

  it("includes Better Auth compatible user fields", () => {
    expect(users.emailVerified).toBeDefined();
    expect(users.image).toBeDefined();
    expect(users.adminRole).toBeDefined();
    expect(users.projectId).toBeDefined();
    expect(users.username).toBeDefined();
  });

  it("includes Better Auth compatible session fields", () => {
    expect(sessions.token).toBeDefined();
    expect(sessions.sessionTokenHash).toBeDefined();
    expect(sessions.expiresAt).toBeDefined();
  });

  it("includes Better Auth account and verification tables", () => {
    expect(accounts.id).toBeDefined();
    expect(accounts.userId).toBeDefined();
    expect(accounts.providerId).toBeDefined();
    expect(verifications.identifier).toBeDefined();
    expect(verifications.value).toBeDefined();
    expect(verifications.expiresAt).toBeDefined();
  });

  it("supports project soft deletion", () => {
    expect(projects.deletedAt).toBeDefined();
  });

  it("includes analysis run tracking table", () => {
    expect(analysisRuns.projectId).toBeDefined();
    expect(analysisRuns.userId).toBeDefined();
    expect(analysisRuns.refweaverRunId).toBeDefined();
    expect(analysisRuns.refweaverJobId).toBeDefined();
    expect(analysisRuns.status).toBeDefined();
  });
});