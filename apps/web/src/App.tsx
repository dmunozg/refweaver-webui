import { useAuth } from "./auth/use-auth";
import { useRef, useState } from "react";
import { LoginForm } from "./auth/LoginForm";
import { AuthClientError } from "./auth/api";
import { DashboardView } from "./analysis/DashboardView";
import { AnalysisListView } from "./analysis/AnalysisListView";
import { NewAnalysisView } from "./analysis/NewAnalysisView";
import { AnalysisRouteView } from "./navigation/AnalysisRouteView";
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
    return (
      <main>
        <header>
          {sessionError ? <p>{sessionError}</p> : null}
          <p>Welcome, {state.user.name}</p>
          <nav aria-label="Analysis navigation">
            <button type="button" onClick={() => navigate({ kind: "dashboard" })}>
              Dashboard
            </button>
            <button type="button" onClick={() => navigate({ kind: "new" })}>
              New analysis
            </button>
            <button type="button" onClick={() => navigate({ kind: "list" })}>
              Analysis list
            </button>
          </nav>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            Log out
          </button>
        </header>
        {route.kind === "dashboard" ? (
          <DashboardView onCreateNewAnalysis={() => navigate({ kind: "new" })} />
        ) : route.kind === "list" ? (
          <AnalysisListView />
        ) : route.kind === "new" ? (
          <NewAnalysisView onSubmitSuccess={() => navigate({ kind: "dashboard" })} />
        ) : (
          <AnalysisRouteView route={route} />
        )}
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
