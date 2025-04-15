'use client';;
import React from 'react';

import { getEditorDOMFromHtmlString } from '@udecode/plate';
import { MarkdownPlugin } from '@udecode/plate-markdown';
import { useEditorRef } from '@udecode/plate/react';
import { ArrowUpToLineIcon } from 'lucide-react';
import { useFilePicker } from 'use-file-picker';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useOpenState,
} from './dropdown-menu';
import { ToolbarButton } from './toolbar';

export function ImportToolbarButton({
  children,
  ...props
}) {
  const editor = useEditorRef();
  const openState = useOpenState();

  const [type, setType] = React.useState('html');
  const accept = type === 'html' ? ['text/html'] : ['.md'];

  const getFileNodes = (text, type) => {
    if (type === 'html') {
      const editorNode = getEditorDOMFromHtmlString(text);
      const nodes = editor.api.html.deserialize({
        element: editorNode,
      });

      return nodes;
    }

    const nodes = editor.getApi(MarkdownPlugin).markdown.deserialize(text);

    return nodes;
  };

  const { openFilePicker } = useFilePicker({
    accept,
    multiple: false,
    onFilesSelected: async ({ plainFiles }) => {
      const text = await plainFiles[0].text();

      const nodes = getFileNodes(text, type);

      editor.tf.insertNodes(nodes);
    },
  });

  return (
    <DropdownMenu modal={false} {...openState} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={openState.open} tooltip="Import" isDropdown>
          <ArrowUpToLineIcon className="size-4" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              setType('html');
              openFilePicker();
            }}>
            Import from HTML
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              setType('markdown');
              openFilePicker();
            }}>
            Import from Markdown
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
