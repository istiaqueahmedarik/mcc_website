"use client";

import {
  ThemeProvider,
  Toaster,
  ToasterComponent,
  ToasterProvider,
} from "@gravity-ui/uikit";
import "@gravity-ui/uikit/styles/styles.css";
import "@gravity-ui/uikit/styles/fonts.css";
import { Editor } from "./Editor";
import { useTheme } from "next-themes";
const toaster = new Toaster();

const MarkdownEditor = ({ handleChange, value }) => {
  const { theme } = useTheme();
  return (
    <div className="rounded-full">
      <ThemeProvider
        theme={theme == "light" ? "light-hc" : "dark-hc"}
        rootClassName="arik"
        layout={"children"}
        scoped
      >
        <ToasterProvider toaster={toaster}>
          <ToasterComponent />
          <Editor
            className="text-[var(--g-color-text-primary)]"
            onChange={handleChange}
            value={value}
          />
        </ToasterProvider>
      </ThemeProvider>
    </div>
  );
};

export default MarkdownEditor;
