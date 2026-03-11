import { randomUUID } from "node:crypto";
import { verifyPassword } from "./password";
import { hashSessionToken } from "./session";

type LoginInput = {
  identifier: string;
  password: string;
};

type LoginStore = {
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
  findUserByIdentifier(identifier: string): Promise<{ id: string; passwordHash: string } | null>;
  createSession(input: {
    userId: string;
    sessionTokenHash: string;
    expiresAt: Date;
  }): Promise<{ id: string }>;
};

type LoginResult = {
  userId: string;
  sessionId: string;
  sessionToken: string;
  sessionExpiresAt: Date;
};

export async function login(input: LoginInput, store: LoginStore): Promise<LoginResult> {
  return store.withTransaction(async () => {
    const user = await store.findUserByIdentifier(input.identifier);
    if (!user) {
      throw new Error("invalid_credentials");
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) {
      throw new Error("invalid_credentials");
    }

    const sessionToken = randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const session = await store.createSession({
      userId: user.id,
      sessionTokenHash: hashSessionToken(sessionToken),
      expiresAt: sessionExpiresAt
    });

    return {
      userId: user.id,
      sessionId: session.id,
      sessionToken,
      sessionExpiresAt
    };
  });
}
