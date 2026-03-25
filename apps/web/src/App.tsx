import { useAuth } from "./auth/use-auth";
import { useRef, useState } from "react";
import { LoginForm } from "./auth/LoginForm";
import { AuthClientError } from "./auth/api";
import { analysisRoutes } from "./navigation/routes";
import { useRoute } from "./navigation/use-route";

export function App() {
  const { state, login, logout } = useAuth();
  const { route, navigate } = useRoute();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginInFlightRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutInFlightRef = useRef(false);

  async function handleLogin(identifier: string, password: string) {
    if (loginInFlightRef.current) {
      return;
    }

    loginInFlightRef.current = true;
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
      loginInFlightRef.current = false;
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
    const content = (() => {
      switch (route.kind) {
        case "new":
          return {
            title: "New analysis",
            description: "Start a new analysis run."
          };
        case "list":
          return {
            title: "Analysis list",
            description: "Review saved analysis runs."
          };
        case "detail":
          return {
            title: `Analysis ${route.runId}`,
            description: "Review analysis run details."
          };
        case "dashboard":
        default:
          return {
            title: "Dashboard",
            description: "Review the latest analysis activity."
          };
      }
    })();

    return (
      <main>
        <header>
          {sessionError ? <p>{sessionError}</p> : null}
          <p>Welcome, {state.user.name}</p>
          <nav aria-label="Analysis navigation">
            <button type="button" onClick={() => navigate(analysisRoutes.dashboard)}>
              Dashboard
            </button>
            <button type="button" onClick={() => navigate(analysisRoutes.new)}>
              New analysis
            </button>
            <button type="button" onClick={() => navigate(analysisRoutes.list)}>
              Analysis list
            </button>
          </nav>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            Log out
          </button>
        </header>
        <section>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </section>
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
