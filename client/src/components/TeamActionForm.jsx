"use client";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * Generic client wrapper to invoke a Server Action with toast feedback.
 * Pass a server action (expects FormData) and render any form fields + a submit button as children.
 */
export function TeamActionForm({ action, pending = "Processing...", success = "Success", error = "Failed", resetOnSuccess = false, children }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          const id = toast.loading(pending);
            try {
              await action(fd);
              toast.success(success, { id });
              if (resetOnSuccess) form.reset();
            } catch (err) {
              console.error(err);
              toast.error(error, { id });
            }
        });
      }}
    >
      {/* Disable interactive elements while pending */}
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
