import { useAuth } from "./auth/use-auth";
import { useState } from "react";
import { LoginForm } from "./auth/LoginForm";
import { AuthClientError } from "./auth/api";

export function App() {
  const { state, login, logout } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(identifier: string, password: string) {
    setLoginError(null);
    setSessionError(null);
    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch (error) {
      if (error instanceof AuthClientError && error.code === "invalid_credentials") {
        setLoginError("Invalid credentials");
      } else {
        setLoginError("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setSessionError(null);
    try {
      await logout();
    } catch {
      setSessionError("Could not log out. Please try again.");
    }
  }

  if (state.status === "loading") {
    return <main>Checking session...</main>;
  }

  if (state.status === "authenticated") {
    return (
      <main>
        {sessionError ? <p>{sessionError}</p> : null}
        <p>Welcome, {state.user.name}</p>
        <button type="button" onClick={() => void handleLogout()}>
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
