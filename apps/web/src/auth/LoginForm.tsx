import { FormEvent, useState } from "react";

type LoginFormProps = {
  onLogin: (identifier: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export function LoginForm({ onLogin, isSubmitting, error }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    await onLogin(identifier, password);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Username or email
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          name="identifier"
          autoComplete="username"
          required
          disabled={isSubmitting}
        />
      </label>
      <label>
        Password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isSubmitting}
        />
      </label>
      {error ? <p aria-live="polite">{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
