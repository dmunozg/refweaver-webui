import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth/use-auth", () => ({
  useAuth: vi.fn()
}));

import { useAuth } from "./auth/use-auth";
import { App } from "./App";

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.resetAllMocks();
});

describe("App auth shell", () => {
  it("renders authenticated shell when user is authenticated", () => {
    mockedUseAuth.mockReturnValue({
      state: {
        status: "authenticated",
        user: {
          id: "user-1",
          username: "ada",
          email: "ada@example.com",
          name: "Ada",
          teamId: null
        },
        error: null
      },
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Welcome, Ada");
    expect(html).toContain("Log out");
  });

  it("renders signed-out shell when session is missing", () => {
    mockedUseAuth.mockReturnValue({
      state: {
        status: "signed_out",
        user: null,
        error: null
      },
      refresh: async () => {},
      login: async () => {},
      logout: async () => {}
    });

    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Please log in");
  });
});
