import { useAuth } from "./auth/use-auth";
import { useRef, useState } from "react";
import { LoginForm } from "./auth/LoginForm";
import { SignupForm } from "./auth/SignupForm";
import { getUserDisplayName } from "./auth/display-name";

export function App() {
  const { state, login, signup, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formInFlightRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutInFlightRef = useRef(false);

  async function handleLogin(email: string, password: string) {
    if (formInFlightRef.current) {
      return;
    }

    formInFlightRef.current = true;
    setFormError(null);
    setSessionError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Login failed. Please try again.");
    } finally {
      formInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleSignup(input: { email: string; password: string; name: string; username?: string }) {
    if (formInFlightRef.current) {
      return;
    }

    formInFlightRef.current = true;
    setFormError(null);
    setSessionError(null);
    setIsSubmitting(true);
    try {
      await signup(input);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Signup failed. Please try again.");
    } finally {
      formInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    if (logoutInFlightRef.current) {
      return;
    }

    logoutInFlightRef.current = true;
    setIsLoggingOut(true);
    setSessionError(null);
    try {
      await logout();
      setMode("login");
    } catch {
      setSessionError("Could not log out. Please try again.");
    } finally {
      logoutInFlightRef.current = false;
      setIsLoggingOut(false);
    }
  }

  if (state.status === "loading") {
    return <main>Checking session...</main>;
  }

  if (state.status === "authenticated") {
    return (
      <main>
        {sessionError ? <p>{sessionError}</p> : null}
        <p>Welcome, {getUserDisplayName(state.user)}</p>
        <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
          Log out
        </button>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main>
        <p>{state.error}</p>
        {mode === "login" ? (
          <LoginForm onLogin={handleLogin} isSubmitting={isSubmitting} error={formError} />
        ) : (
          <SignupForm onSignup={handleSignup} isSubmitting={isSubmitting} error={formError} />
        )}
      </main>
    );
  }

  return (
    <main>
      <p>{mode === "login" ? "Please log in" : "Create your account"}</p>
      {mode === "login" ? (
        <>
          <LoginForm onLogin={handleLogin} isSubmitting={isSubmitting} error={formError} />
          <button type="button" onClick={() => setMode("signup")}>
            Create account
          </button>
        </>
      ) : (
        <>
          <SignupForm onSignup={handleSignup} isSubmitting={isSubmitting} error={formError} />
          <button type="button" onClick={() => setMode("login")}>
            Back to log in
          </button>
        </>
      )}
    </main>
  );
}
