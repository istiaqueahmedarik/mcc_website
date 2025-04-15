'use client';;
import { isSlateString } from '@udecode/plate';
import { BaseCommentsPlugin } from '@udecode/plate-comments';
import { toTPlatePlugin, useHotkeys } from '@udecode/plate/react';

export const commentsPlugin = toTPlatePlugin(BaseCommentsPlugin, {
  handlers: {
    onClick: ({ api, event, setOption, type }) => {
      let leaf = event.target;
      let isSet = false;

      const unsetActiveSuggestion = () => {
        setOption('activeId', null);
        isSet = true;
      };

      if (!isSlateString(leaf)) unsetActiveSuggestion();

      while (leaf.parentElement) {
        if (leaf.classList.contains(`slate-${type}`)) {
          const commentsEntry = api.comment.node();

          if (!commentsEntry) {
            unsetActiveSuggestion();

            break;
          }

          const id = api.comment.nodeId(commentsEntry[0]);

          setOption('activeId', id ?? null);
          isSet = true;

          break;
        }

        leaf = leaf.parentElement;
      }

      if (!isSet) unsetActiveSuggestion();
    },
  },
  options: {
    activeId: null,
    commentingBlock: null,
    hotkey: ['meta+shift+m', 'ctrl+shift+m'],
    hoverId: null,
    uniquePathMap: new Map(),
  },
  useHooks: ({ editor, getOptions }) => {
    const { hotkey } = getOptions();
    useHotkeys(hotkey, (e) => {
      if (!editor.selection) return;

      e.preventDefault();

      if (!editor.api.isExpanded()) return;
    }, {
      enableOnContentEditable: true,
    });
  },
});
