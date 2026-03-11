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

  it("renders loading label while submitting", () => {
    const html = renderToStaticMarkup(
      <LoginForm onLogin={async () => {}} isSubmitting={true} error={null} />
    );

    expect(html).toContain("Logging in...");
  });
});
