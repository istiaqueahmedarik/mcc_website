"use client";
import dynamic from "next/dynamic";
import React from "react"; // Import React

const MarkdownEditor = dynamic(() => import("./MarkdownEditor"), {
  ssr: false,
});

const EditorWrapper = React.memo(({ handleChange, value }) => {
  return (
    <div className="w-full">
      <MarkdownEditor handleChange={handleChange} value={value} />
    </div>
  );
});

// Set display name for better debugging
EditorWrapper.displayName = "EditorWrapper";

export default EditorWrapper;
