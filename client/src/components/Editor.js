"use client";
import React, { memo } from "react";
import {
  MarkdownEditorView,
  useMarkdownEditor,
} from "@gravity-ui/markdown-editor";
import * as htmlExtension from "@diplodoc/html-extension";
import { wYfmHtmlBlockItemData } from "@gravity-ui/markdown-editor";

const resolveHtmlTransform = () => {
  if (typeof htmlExtension.transform === "function") {
    return htmlExtension.transform;
  }

  if (typeof htmlExtension.default?.transform === "function") {
    return htmlExtension.default.transform;
  }

  return null;
};

const htmlTransform = resolveHtmlTransform();

export const Editor = memo(
  ({ className = "", minHeightClassName = "min-h-[80vh]", onChange, value }) => {
    const mdPlugins = htmlTransform ? [htmlTransform({ bundle: false })] : [];

    const editor = useMarkdownEditor({
      md: {
        html: true,
        plugins: mdPlugins,
      },
      initialValue: value,
      initial: {
        markup: value,
      },
      extensionOptions: {
        commandMenu: { actions: [wYfmHtmlBlockItemData] },
      },
    });

    React.useEffect(() => {
      const changeHandler = () => {
        const value = editor.getValue();
        onChange(value);
      };
      editor.on("change", changeHandler);
      return () => {
        editor.off("change", changeHandler);
      };
    }, [onChange, editor]);

    return (
      <MarkdownEditorView
        settingsVisible
        enableSubmitInPreview={true}
        hidePreviewAfterSubmit
        stickyToolbar
        autofocus
        editor={editor}
        className={`${minHeightClassName} ${className}`.trim()}
      />
    );
  }
);
