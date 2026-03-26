import { describe, expect, it } from "vitest";
import { accounts, analysisRuns, projects, sessions, users, verifications } from "./index";

describe("schema", () => {
  it("includes nullable team placeholders", () => {
    expect(users.teamId).toBeDefined();
    expect(projects.teamId).toBeDefined();
  });

  it("includes Better Auth compatible user fields", () => {
    expect(users.emailVerified).toBeDefined();
    expect(users.image).toBeDefined();
    expect(users.adminRole).toBeDefined();
    expect(users.projectId).toBeDefined();
    expect(users.passwordHash).toBeDefined();
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
