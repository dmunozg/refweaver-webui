import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("workspace", () => {
  it("declares bun workspaces", () => {
    const root = join(import.meta.dir, "..", "..", "..");
    const pkgRaw = readFileSync(join(root, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw) as { workspaces?: string[] };

    expect(pkg.workspaces).toEqual(["apps/*", "packages/*"]);
  });
});
