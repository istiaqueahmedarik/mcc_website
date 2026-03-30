"use client";
import React, { memo } from "react";
import {
  MarkdownEditorView,
  MarkupString,
  useMarkdownEditor,
} from "@gravity-ui/markdown-editor";
import { Button } from "@gravity-ui/uikit";
import * as htmlExtension from "@diplodoc/html-extension";
import { useYfmHtmlBlockStyles } from "../hooks/useYfmHtmlBlockStyles";
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

export const Editor = memo(({ onChange, value }) => {
  const yfmHtmlBlockStyles = useYfmHtmlBlockStyles();
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
