'use client';;
import { isSlateEditor, isSlateElement, isSlateString } from '@udecode/plate';
import { BaseSuggestionPlugin } from '@udecode/plate-suggestion';
import { toTPlatePlugin } from '@udecode/plate/react';

import { BlockSuggestion } from '@/components/plate-ui/block-suggestion';

export const suggestionPlugin = toTPlatePlugin(BaseSuggestionPlugin, {
  handlers: {
    // unset active suggestion when clicking outside of suggestion
    onClick: ({ api, event, setOption, type }) => {
      let leaf = event.target;
      let isSet = false;

      const unsetActiveSuggestion = () => {
        setOption('activeId', null);
        isSet = true;
      };

      if (!isSlateString(leaf)) unsetActiveSuggestion();

      while (
        leaf.parentElement &&
        !isSlateElement(leaf.parentElement) &&
        !isSlateEditor(leaf.parentElement)
      ) {
        if (leaf.classList.contains(`slate-${type}`)) {
          const suggestionEntry = api.suggestion.node({
            isText: true,
          });

          if (!suggestionEntry) {
            unsetActiveSuggestion();

            break;
          }

          const id = api.suggestion.nodeId(suggestionEntry[0]);

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
    currentUserId: 'user3',
    hoverId: null,
    uniquePathMap: new Map(),
  },
  render: {
    belowRootNodes: ({ api, element }) => {
      if (!api.suggestion.isBlockSuggestion(element)) {
        return null;
      }

      return <BlockSuggestion element={element} />;
    },
  },
});
