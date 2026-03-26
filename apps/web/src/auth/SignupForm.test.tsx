import { FormEvent } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { SignupForm } from "./SignupForm";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("SignupForm", () => {
  it("calls onSignup with entered values on submit", async () => {
    const onSignup = vi.fn(async () => {});
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SignupForm onSignup={onSignup} isSubmitting={false} error={null} />
      );
    });

    const inputs = renderer!.root.findAllByType("input");
    const form = renderer!.root.findByType("form");

    await act(async () => {
      inputs[0]!.props.onChange({ target: { value: "Ada Lovelace" } });
      inputs[1]!.props.onChange({ target: { value: "ada" } });
      inputs[2]!.props.onChange({ target: { value: "ada@example.com" } });
      inputs[3]!.props.onChange({ target: { value: "safe-pass" } });
    });

    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} } as FormEvent<HTMLFormElement>);
    });

    expect(onSignup).toHaveBeenCalledTimes(1);
    expect(onSignup).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "safe-pass",
      name: "Ada Lovelace",
      username: "ada"
    });
  });
});
