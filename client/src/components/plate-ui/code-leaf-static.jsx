import React from 'react';

import { cn } from '@udecode/cn';
import { SlateLeaf } from '@udecode/plate';

export const CodeLeafStatic = ({
  children,
  className,
  ...props
}) => {
  return (
    <SlateLeaf
      as="code"
      className={cn(
        className,
        'rounded-md bg-muted px-[0.3em] py-[0.2em] font-mono text-sm whitespace-pre-wrap'
      )}
      {...props}>
      {children}
    </SlateLeaf>
  );
};
