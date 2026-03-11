import type { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { isUniqueViolation } from "../auth/errors";
import { signup, type SignupStore } from "../auth/signup";

type SignupBody = {
  username: string;
  email: string;
  name: string;
  password: string;
};

function isSignupBody(input: unknown): input is SignupBody {
  if (!input || typeof input !== "object") {
    return false;
  }

  const body = input as Record<string, unknown>;
  return (
    typeof body.username === "string" &&
    typeof body.email === "string" &&
    typeof body.name === "string" &&
    typeof body.password === "string"
  );
}

export function registerAuthRoutes(app: Hono, store: SignupStore): void {
  app.post("/auth/signup", async (c) => {
    const body = await c.req.json();

    if (!isSignupBody(body)) {
      return c.json({ error: "invalid_signup_payload" }, 422);
    }

    let result;
    try {
      result = await signup(body, store);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ error: "signup_conflict" }, 409);
      }

      throw error;
    }

    setCookie(c, "rw_session", result.sessionToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      expires: result.sessionExpiresAt,
      path: "/"
    });

    return c.json(
      {
        userId: result.userId,
        projectId: result.projectId
      },
      201
    );
  });
}
