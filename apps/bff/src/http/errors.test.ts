import { describe, expect, it } from "vitest";
import { RefweaverHttpError, RefweaverNetworkError } from "../refweaver/client";
import { ProjectNotFoundError, ProjectValidationError } from "../projects/service";
import { ProjectInactiveError, RunNotFoundError, RunValidationError } from "../runs/service";
import { toErrorResponse } from "./errors";

describe("toErrorResponse", () => {
  it("maps domain errors", () => {
    expect(toErrorResponse(new ProjectValidationError("bad")).status).toBe(422);
    expect(toErrorResponse(new ProjectNotFoundError()).body.error.code).toBe("project_not_found");
    expect(toErrorResponse(new ProjectInactiveError()).body.error.code).toBe("project_inactive");
    expect(toErrorResponse(new RunValidationError("bad run")).status).toBe(422);
    expect(toErrorResponse(new RunValidationError("bad run")).body.error.code).toBe("validation_error");
    expect(toErrorResponse(new RunNotFoundError()).body.error.code).toBe("run_not_found");
  });

  it("maps upstream HTTP classes 400/401/404/413/422/429", () => {
    const statuses = [400, 401, 404, 413, 422, 429] as const;
    for (const status of statuses) {
      const result = toErrorResponse(new RefweaverHttpError(status, `code_${status}`, `m_${status}`, null));
      expect(result.status).toBe(status);
      expect(result.body.error.code).toBe(`code_${status}`);
      expect(result.body.error.message).toBe(`m_${status}`);
    }
  });

  it("normalizes upstream 5xx responses to upstream_unavailable", () => {
    const statuses = [500, 502, 503] as const;
    for (const status of statuses) {
      const result = toErrorResponse(new RefweaverHttpError(status, "raw_upstream", "raw message", null));
      expect(result.status).toBe(502);
      expect(result.body.error.code).toBe("upstream_unavailable");
    }
  });

  it("maps network errors to upstream_unavailable", () => {
    const result = toErrorResponse(new RefweaverNetworkError("down"));
    expect(result.status).toBe(502);
    expect(result.body.error.code).toBe("upstream_unavailable");
  });

  it("maps unknown errors to internal_error", () => {
    const result = toErrorResponse(new Error("boom"));
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("internal_error");
  });
});
