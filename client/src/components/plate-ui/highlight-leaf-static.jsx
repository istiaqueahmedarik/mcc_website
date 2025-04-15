import React from 'react';

import { cn } from '@udecode/cn';
import { SlateLeaf } from '@udecode/plate';

export function HighlightLeafStatic({
  children,
  className,
  ...props
}) {
  return (
    <SlateLeaf
      as="mark"
      className={cn(className, 'bg-highlight/30 text-inherit')}
      {...props}>
      {children}
    </SlateLeaf>
  );
}
