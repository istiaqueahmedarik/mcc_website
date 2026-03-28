"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";

export default function EditableIdForm({
  action,
  fieldName,
  inputId,
  current,
  placeholder,
  saveVariant = "default",
  saveLabel = "Save",
  label,
  className = "",
  inputClassName = "",
  saveClassName = "",
}) {
  const initialValue = current || "";
  const [value, setValue] = useState(initialValue);

  const canSubmit = useMemo(() => {
    const changed = value.trim() !== initialValue.trim();
    return changed && value.trim().length > 0;
  }, [value, initialValue]);

  return (
    <form action={action} className={`${className} flex items-center gap-2`.trim()}>
      {label && (
        <Label htmlFor={inputId} className="text-sm">
          {label}
        </Label>
      )}
      <Input
        id={inputId}
        name={fieldName}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={inputClassName || "text-xs h-8 profile-focus-ring flex-1"}
        style={{ borderRadius: "var(--profile-radius-sm)" }}
      />
      <Button
        type="submit"
        size="sm"
        variant={saveVariant}
        disabled={!canSubmit}
        className={`${saveClassName || "text-xs h-8 px-3 profile-focus-ring"} ${
          !canSubmit ? "opacity-60 cursor-not-allowed" : ""
        }`.trim()}
        style={{
          borderRadius: "var(--profile-radius-sm)",
          ...(saveVariant === "default" && {
            background: "hsl(var(--profile-primary))",
            color: "white",
          }),
        }}
      >
        {saveLabel}
      </Button>
    </form>
  );
}
