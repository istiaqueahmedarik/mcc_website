import React from 'react';

import { cn } from '@udecode/cn';
import { SlateElement } from '@udecode/plate';

export const ParagraphElementStatic = ({
  children,
  className,
  ...props
}) => {
  return (
    <SlateElement className={cn(className, 'm-0 px-0 py-1')} {...props}>
      {children}
    </SlateElement>
  );
};
