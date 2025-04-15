import React from 'react';

import { cn } from '@udecode/cn';
import { SlateLeaf } from '@udecode/plate';

export function CodeSyntaxLeafStatic({
  children,
  className,
  ...props
}) {
  const tokenClassName = props.leaf.className;

  return (
    <SlateLeaf className={cn(tokenClassName, className)} {...props}>
      {children}
    </SlateLeaf>
  );
}
