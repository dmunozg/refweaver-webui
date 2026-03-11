import { useAuth } from "./auth/use-auth";

export function App() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return <main>Checking session...</main>;
  }

  if (state.status === "authenticated") {
    return <main>Welcome, {state.user.name}</main>;
  }

  if (state.status === "error") {
    return <main>{state.error}</main>;
  }

  return <main>Please log in</main>;
}
