"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Generic client wrapper to invoke a Server Action with toast feedback.
 * Pass a server action (expects FormData) and render any form fields + a submit button as children.
 */
export function TeamActionForm({ action, pending = "Processing...", success = "Success", error = "Failed", resetOnSuccess = false, onSuccess, redirectTo, confirmMessage, confirmConfig, children }) {
  const [isPending, setIsPending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const submissionRef = useRef(null);
  const router = useRouter();

  const effectiveConfirm =
    confirmConfig ||
    (confirmMessage
      ? {
          title: "Please confirm",
          description: confirmMessage,
          confirmText: "Confirm",
          cancelText: "Cancel",
          confirmVariant: "destructive",
        }
      : null);

  const runAction = async ({ form, fd }) => {
    setIsPending(true);
    const id = toast.loading(pending);
    try {
      await action(fd);
      toast.success(success, { id });
      if (resetOnSuccess) form.reset();
      if (redirectTo) router.push(redirectTo);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(error, { id });
    } finally {
      setIsPending(false);
    }
  };

  const handleConfirm = async () => {
    if (!submissionRef.current) return;
    const submission = submissionRef.current;
    submissionRef.current = null;
    setIsConfirmOpen(false);
    await runAction(submission);
  };

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (isPending) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isPending]);

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const submission = { form, fd };

          if (effectiveConfirm) {
            submissionRef.current = submission;
            setIsConfirmOpen(true);
            return;
          }

          await runAction(submission);
        }}
      >
        {/* Disable interactive elements while pending */}
        <fieldset disabled={isPending} className="contents">
          {children}
        </fieldset>
      </form>

      {isPending && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-sm"
          role="status"
          aria-live="assertive"
        >
          <div className="px-6 py-5 pointer-events-none">
            <span
              className="inline-block h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {effectiveConfirm && (
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{effectiveConfirm.title || "Please confirm"}</DialogTitle>
              {effectiveConfirm.description ? (
                <DialogDescription>{effectiveConfirm.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  submissionRef.current = null;
                  setIsConfirmOpen(false);
                }}
              >
                {effectiveConfirm.cancelText || "Cancel"}
              </Button>
              <Button
                type="button"
                variant={effectiveConfirm.confirmVariant || "destructive"}
                onClick={handleConfirm}
              >
                {effectiveConfirm.confirmText || "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
