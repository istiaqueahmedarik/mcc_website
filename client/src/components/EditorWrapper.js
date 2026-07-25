"use client";
import dynamic from "next/dynamic";
import React from "react"; // Import React

const MarkdownEditor = dynamic(() => import("./MarkdownEditor"), {
  ssr: false,
});

const EditorWrapper = React.memo(
  ({ handleChange, value, editorClassName = "", minHeightClassName }) => {
    return (
      <div className="w-full">
        <MarkdownEditor
          editorClassName={editorClassName}
          handleChange={handleChange}
          minHeightClassName={minHeightClassName}
          value={value}
        />
      </div>
    );
  }
);

// Set display name for better debugging
EditorWrapper.displayName = "EditorWrapper";

export default EditorWrapper;
