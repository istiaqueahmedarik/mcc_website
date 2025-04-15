import React from 'react';

import { cn } from '@udecode/cn';
import { SlateElement } from '@udecode/plate';

export function TableRowElementStatic({
  children,
  className,
  ...props
}) {
  return (
    <SlateElement as="tr" className={cn(className, 'h-full')} {...props}>
      {children}
    </SlateElement>
  );
}
