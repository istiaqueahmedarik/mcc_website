"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContestReportSubmitButton({
  children,
  pendingLabel,
  className,
  variant,
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
