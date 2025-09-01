"use client";
import React, { memo } from "react";
import {
  MarkdownEditorView,
  MarkupString,
  useMarkdownEditor,
} from "@gravity-ui/markdown-editor";
import { Button } from "@gravity-ui/uikit";
import { transform as transformHTML } from "@diplodoc/html-extension";
import { useYfmHtmlBlockStyles } from "../hooks/useYfmHtmlBlockStyles";
import { wYfmHtmlBlockItemData } from "@gravity-ui/markdown-editor";

export const Editor = memo(({ onChange, value }) => {
  const yfmHtmlBlockStyles = useYfmHtmlBlockStyles();

  const editor = useMarkdownEditor({
    md: {
      html: true,
      plugins: [transformHTML({ bundle: false })],
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
    const changeHandler = (e) => {
      const value = editor.getValue();
      onChange(value);
    };
    editor.on("change", changeHandler);
    return () => {
      editor.off("change", changeHandler);
    };
  }, [onChange, editor]);

  return (
    <>
      <MarkdownEditorView
        settingsVisible
        enableSubmitInPreview={true}
        hidePreviewAfterSubmit
        stickyToolbar
        autofocus
        editor={editor}
        className="min-h-[80vh]"
      />
    </>
  );
});
