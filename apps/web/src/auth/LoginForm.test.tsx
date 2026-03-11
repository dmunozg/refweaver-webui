import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("renders error message when login fails", () => {
    const html = renderToStaticMarkup(
      <LoginForm onLogin={async () => {}} isSubmitting={false} error="Invalid credentials" />
    );

    expect(html).toContain("Invalid credentials");
  });

  it("renders default submit label when ready to login", () => {
    const html = renderToStaticMarkup(
      <LoginForm onLogin={async () => {}} isSubmitting={false} error={null} />
    );

    expect(html).toContain("Log in");
  });

  it("renders loading label while submitting", () => {
    const html = renderToStaticMarkup(
      <LoginForm onLogin={async () => {}} isSubmitting={true} error={null} />
    );

    expect(html).toContain("Logging in...");
    expect(html).toContain("disabled");
  });

  it("renders auth field hints and accessibility attributes", () => {
    const html = renderToStaticMarkup(
      <LoginForm onLogin={async () => {}} isSubmitting={false} error="Invalid credentials" />
    );

    expect(html).toContain("autoComplete=\"username\"");
    expect(html).toContain("autoComplete=\"current-password\"");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("required");
  });
});
