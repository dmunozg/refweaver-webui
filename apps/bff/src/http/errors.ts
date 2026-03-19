import { RefweaverHttpError, RefweaverNetworkError } from "../refweaver/client";
import { ProjectNotFoundError, ProjectValidationError } from "../projects/service";
import { ProjectInactiveError, RunNotFoundError } from "../runs/service";

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string> | null;
  };
};

export function toErrorResponse(error: unknown): { status: number; body: ErrorEnvelope } {
  if (error instanceof ProjectValidationError) {
    return {
      status: 422,
      body: {
        error: {
          code: "validation_error",
          message: error.message
        }
      }
    };
  }

  if (error instanceof ProjectNotFoundError) {
    return {
      status: 404,
      body: {
        error: {
          code: "project_not_found",
          message: "Project not found"
        }
      }
    };
  }

  if (error instanceof ProjectInactiveError) {
    return {
      status: 409,
      body: {
        error: {
          code: "project_inactive",
          message: "Project is archived"
        }
      }
    };
  }

  if (error instanceof RunNotFoundError) {
    return {
      status: 404,
      body: {
        error: {
          code: "run_not_found",
          message: "Run not found"
        }
      }
    };
  }

  if (error instanceof RefweaverHttpError) {
    if (error.status >= 500) {
      return {
        status: 502,
        body: {
          error: {
            code: "upstream_unavailable",
            message: "Unable to reach RefWeaver"
          }
        }
      };
    }

    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }
    };
  }

  if (error instanceof RefweaverNetworkError) {
    return {
      status: 502,
      body: {
        error: {
          code: "upstream_unavailable",
          message: "Unable to reach RefWeaver"
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        message: "Internal server error"
      }
    }
  };
}
