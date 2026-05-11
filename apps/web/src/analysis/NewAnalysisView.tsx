import { FormEvent, useRef, useState } from "react";
import { createRun } from "./api";
import { useDefaultProject } from "../projects/use-default-project";

type NewAnalysisViewProps = {
  onSubmitSuccess: () => void;
};

export function NewAnalysisView({ onSubmitSuccess }: NewAnalysisViewProps) {
  const project = useDefaultProject();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitInFlightRef.current || project.status !== "ready") {
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      setError("Analysis text is required.");
      return;
    }

    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const trimmedTitle = title.trim();
      await createRun(project.projectId, {
        text: trimmedText,
        title: trimmedTitle ? trimmedTitle : null
      });
      onSubmitSuccess();
    } catch {
      setError("Could not start analysis. Please try again.");
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (project.status === "loading") {
    return (
      <section>
        <h1>New analysis</h1>
        <p>Loading your project...</p>
      </section>
    );
  }

  if (project.status === "error") {
    return (
      <section>
        <h1>New analysis</h1>
        <p aria-live="polite">{project.error}</p>
      </section>
    );
  }

  return (
    <section>
      <h1>New analysis</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Title (optional)
          <input value={title} onChange={(event) => setTitle(event.target.value)} name="title" />
        </label>
        <label>
          Analysis text
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            name="text"
            rows={12}
            required
          />
        </label>
        {error ? <p aria-live="polite">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Starting analysis..." : "Start analysis"}
        </button>
      </form>
    </section>
  );
}
