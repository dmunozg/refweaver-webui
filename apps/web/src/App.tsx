import { useAuth } from "./auth/use-auth";
import { useRef, useState } from "react";
import { LoginForm } from "./auth/LoginForm";
import { SignupForm } from "./auth/SignupForm";
import { DashboardView } from "./analysis/DashboardView";
import { AnalysisListView } from "./analysis/AnalysisListView";
import { AnalysisDetailView } from "./analysis/AnalysisDetailView";
import { NewAnalysisView } from "./analysis/NewAnalysisView";
import { AnalysisRouteView } from "./navigation/AnalysisRouteView";
import { useRoute } from "./navigation/use-route";

export function App() {
  const { state, login, logout, signup } = useAuth();
  const { route, navigate } = useRoute();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginInFlightRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutInFlightRef = useRef(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

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
      setAuthMode("login");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed. Please try again.");
    } finally {
      loginInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleSignup(input: { email: string; password: string; name: string; username?: string }) {
    if (loginInFlightRef.current) {
      return;
    }

    loginInFlightRef.current = true;
    setLoginError(null);
    setSessionError(null);
    setIsSubmitting(true);
    try {
      await signup(input);
      setAuthMode("login");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Signup failed. Please try again.");
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
          <DashboardView
            onCreateNewAnalysis={() => navigate({ kind: "new" })}
            onViewAllAnalyses={() => navigate({ kind: "list" })}
          />
        ) : route.kind === "list" ? (
          <AnalysisListView onRunSelect={(runId) => navigate({ kind: "detail", runId })} />
        ) : route.kind === "detail" ? (
          <AnalysisDetailView runId={route.runId} onCreateNewAnalysis={() => navigate({ kind: "new" })} />
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
        {authMode === "login" ? (
          <>
            <LoginForm onLogin={handleLogin} isSubmitting={isSubmitting} error={loginError} />
            <button type="button" onClick={() => setAuthMode("signup")}>
              Create account
            </button>
          </>
        ) : (
          <>
            <SignupForm onSignup={handleSignup} isSubmitting={isSubmitting} error={loginError} />
            <button type="button" onClick={() => setAuthMode("login")}>
              Back to log in
            </button>
          </>
        )}
      </main>
    );
  }

  return (
    <main>
      {authMode === "login" ? (
        <>
          <p>Please log in</p>
          <LoginForm onLogin={handleLogin} isSubmitting={isSubmitting} error={loginError} />
          <button type="button" onClick={() => setAuthMode("signup")}>
            Create account
          </button>
        </>
      ) : (
        <>
          <p>Create your account</p>
          <SignupForm onSignup={handleSignup} isSubmitting={isSubmitting} error={loginError} />
          <button type="button" onClick={() => setAuthMode("login")}>
            Back to log in
          </button>
        </>
      )}
    </main>
  );
}
