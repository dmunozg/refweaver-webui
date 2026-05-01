import { FormEvent, useState } from "react";

type LoginFormProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export function LoginForm({ onLogin, isSubmitting, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    await onLogin(email, password);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          name="email"
          autoComplete="email"
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
