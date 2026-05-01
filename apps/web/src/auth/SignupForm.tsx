import { FormEvent, useState } from "react";

type SignupFormProps = {
  onSignup: (input: { email: string; password: string; name: string; username?: string }) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export function SignupForm({ onSignup, isSubmitting, error }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    await onSignup({
      email,
      password,
      name,
      ...(username.trim() ? { username: username.trim() } : {})
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} name="name" required disabled={isSubmitting} />
      </label>
      <label>
        Username (optional)
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          name="username"
          autoComplete="username"
          disabled={isSubmitting}
        />
      </label>
      <label>
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          name="email"
          type="email"
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
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />
      </label>
      {error ? <p aria-live="polite">{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
