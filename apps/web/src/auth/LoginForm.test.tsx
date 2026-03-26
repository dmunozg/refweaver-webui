import { FormEvent } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("LoginForm", () => {
  it("calls onLogin with entered credentials on submit", async () => {
    const onLogin = vi.fn(async () => {});
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <LoginForm onLogin={onLogin} isSubmitting={false} error={null} />
      );
    });

    const inputs = renderer!.root.findAllByType("input");
    const form = renderer!.root.findByType("form");

    await act(async () => {
      inputs[0]!.props.onChange({ target: { value: "ada" } });
    });

    await act(async () => {
      inputs[1]!.props.onChange({ target: { value: "safe-pass" } });
    });

    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} } as FormEvent<HTMLFormElement>);
    });

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledWith("ada", "safe-pass");
  });

  it("does not submit while already submitting", async () => {
    const onLogin = vi.fn(async () => {});
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <LoginForm onLogin={onLogin} isSubmitting={true} error={null} />
      );
    });

    const form = renderer!.root.findByType("form");
    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} } as FormEvent<HTMLFormElement>);
    });

    expect(onLogin).not.toHaveBeenCalled();
    expect(renderer!.toJSON()).toBeTruthy();
  });

  it("renders accessibility hints and error text", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <LoginForm onLogin={async () => {}} isSubmitting={false} error="Invalid credentials" />
      );
    });

    const inputs = renderer!.root.findAllByType("input");
    const error = renderer!.root.findByType("p");

    expect(inputs[0]!.props.autoComplete).toBe("email");
    expect(inputs[1]!.props.autoComplete).toBe("current-password");
    expect(inputs[0]!.props.required).toBe(true);
    expect(inputs[1]!.props.required).toBe(true);
    expect(error.props["aria-live"]).toBe("polite");
    expect(error.children.join(" ")).toContain("Invalid credentials");
  });
});
