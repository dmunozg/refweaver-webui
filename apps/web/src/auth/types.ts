export type AuthUser = {
  id: string;
  username: string | null;
  email: string;
  name: string;
  adminRole: "user" | "admin";
  projectId: string | null;
  teamId: string | null;
};

export type AuthState =
  | { status: "loading"; user: null; error: null }
  | { status: "authenticated"; user: AuthUser; error: null }
  | { status: "signed_out"; user: null; error: null }
  | { status: "error"; user: null; error: string };
