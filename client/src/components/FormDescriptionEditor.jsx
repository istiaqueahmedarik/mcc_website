"use client";

import React, { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FormDescriptionRenderer from "./FormDescriptionRenderer";

/**
 * FormDescriptionEditor
 * Admin Markdown editor with Write and Preview modes for campaign and template descriptions.
 * Keyboard accessible, responsive on mobile (390px), following Apple-inspired neutral styling.
 */
export default function FormDescriptionEditor({
  id: explicitId,
  label = "Description",
  value = "",
  onChange,
  placeholder = "Write a description in Markdown (newlines, bold, lists, and links are supported)...",
  className = "",
  rows = 5,
}) {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const writeTabId = `${inputId}-tab-write`;
  const previewTabId = `${inputId}-tab-preview`;
  const writePanelId = `${inputId}-panel-write`;
  const previewPanelId = `${inputId}-panel-preview`;

  const [activeTab, setActiveTab] = useState("write");

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </Label>
        <div
          role="tablist"
          aria-label="Description editor mode"
          className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-xs font-medium"
        >
          <button
            type="button"
            role="tab"
            id={writeTabId}
            aria-selected={activeTab === "write"}
            aria-controls={writePanelId}
            onClick={() => setActiveTab("write")}
            className={`rounded-md px-3 py-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "write"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            id={previewTabId}
            aria-selected={activeTab === "preview"}
            aria-controls={previewPanelId}
            onClick={() => setActiveTab("preview")}
            className={`rounded-md px-3 py-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "preview"
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {activeTab === "write" ? (
        <div id={writePanelId} role="tabpanel" aria-labelledby={writeTabId} className="space-y-1">
          <Textarea
            id={inputId}
            value={value || ""}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="min-h-[120px] font-normal leading-relaxed resize-y focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <p className="text-xs text-muted-foreground">
            Markdown supported: <strong>**bold**</strong>, <em>*italic*</em>, [link](url), lists (- item), and newlines.
          </p>
        </div>
      ) : (
        <div
          id={previewPanelId}
          role="tabpanel"
          aria-labelledby={previewTabId}
          tabIndex={0}
          className="min-h-[120px] rounded-xl border bg-muted/20 p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {value && value.trim() ? (
            <FormDescriptionRenderer content={value} />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Nothing to preview. Switch to Write to enter a description.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
