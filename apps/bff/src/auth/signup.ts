import { randomUUID } from "node:crypto";
import { hashPassword } from "./password";
import { hashSessionToken } from "./session";

export type SignupInput = {
  username: string;
  email: string;
  name: string;
  password: string;
};

type CreateUserInput = {
  username: string;
  email: string;
  name: string;
  passwordHash: string;
  teamId: string | null;
};

type CreateProjectInput = {
  name: string;
  ownerUserId: string;
  teamId: string | null;
};

type CreateSessionInput = {
  userId: string;
  sessionTokenHash: string;
  expiresAt: Date;
};

export type SignupStore = {
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
  createUser(input: CreateUserInput): Promise<{ id: string }>;
  createProject(input: CreateProjectInput): Promise<{ id: string }>;
  createSession(input: CreateSessionInput): Promise<{ id: string }>;
};

export type SignupResult = {
  userId: string;
  projectId: string;
  sessionId: string;
  sessionToken: string;
  sessionExpiresAt: Date;
};

export async function signup(input: SignupInput, store: SignupStore): Promise<SignupResult> {
  return store.withTransaction(async () => {
    const passwordHash = await hashPassword(input.password);
    const user = await store.createUser({
      username: input.username,
      email: input.email,
      name: input.name,
      passwordHash,
      teamId: null
    });

    const project = await store.createProject({
      name: "My First Project",
      ownerUserId: user.id,
      teamId: null
    });

    const sessionToken = randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const session = await store.createSession({
      userId: user.id,
      sessionTokenHash: hashSessionToken(sessionToken),
      expiresAt: sessionExpiresAt
    });

    return {
      userId: user.id,
      projectId: project.id,
      sessionId: session.id,
      sessionToken,
      sessionExpiresAt
    };
  });
}
