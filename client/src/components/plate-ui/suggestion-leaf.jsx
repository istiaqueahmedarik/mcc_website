'use client';;
import React from 'react';

import { cn } from '@udecode/cn';
import { PlateLeaf, useEditorPlugin, usePluginOption } from '@udecode/plate/react';

import { suggestionPlugin } from '@/components/editor/plugins/suggestion-plugin';

export function SuggestionLeaf(props) {
  const { children, className, leaf } = props;

  const { api, setOption } = useEditorPlugin(suggestionPlugin);

  const leafId = api.suggestion.nodeId(leaf) ?? '';
  const activeSuggestionId = usePluginOption(suggestionPlugin, 'activeId');
  const hoverSuggestionId = usePluginOption(suggestionPlugin, 'hoverId');
  const dataList = api.suggestion.dataList(leaf);

  const hasRemove = dataList.some((data) => data.type === 'remove');
  const hasActive = dataList.some((data) => data.id === activeSuggestionId);
  const hasHover = dataList.some((data) => data.id === hoverSuggestionId);

  const diffOperation = {
    type: hasRemove ? 'delete' : 'insert'
  };

  const Component = (
    {
      delete: 'del',
      insert: 'ins',
      update: 'span'
    }
  )[diffOperation.type];

  return (
    <PlateLeaf
      {...props}
      as={Component}
      className={cn(
        'border-b-2 border-b-brand/[.24] bg-brand/[.08] text-brand/80 no-underline transition-colors duration-200',
        (hasActive || hasHover) && 'border-b-brand/[.60] bg-brand/[.13]',
        hasRemove &&
          'border-b-gray-300 bg-gray-300/25 text-gray-400 line-through',
        (hasActive || hasHover) &&
          hasRemove &&
          'border-b-gray-500 bg-gray-400/25 text-gray-500 no-underline',
        className
      )}
      onMouseEnter={() => setOption('hoverId', leafId)}
      onMouseLeave={() => setOption('hoverId', null)}>
      {children}
    </PlateLeaf>
  );
}
