import { useAuth } from "./auth/use-auth";
import { useState } from "react";
import { LoginForm } from "./auth/LoginForm";

export function App() {
  const { state, login, logout } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(identifier: string, password: string) {
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch {
      setLoginError("Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return <main>Checking session...</main>;
  }

  if (state.status === "authenticated") {
    return (
      <main>
        <p>Welcome, {state.user.name}</p>
        <button type="button" onClick={() => void logout()}>
          Log out
        </button>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main>
        <p>{state.error}</p>
        <LoginForm onLogin={handleLogin} isSubmitting={isSubmitting} error={loginError} />
      </main>
    );
  }

  return (
    <main>
      <p>Please log in</p>
      <LoginForm onLogin={handleLogin} isSubmitting={isSubmitting} error={loginError} />
    </main>
  );
}
