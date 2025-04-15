import React from 'react';

import { cn } from '@udecode/cn';

import { CheckboxStatic } from './checkbox-static';

export const TodoMarkerStatic = ({
  element
}) => {
  return (
    <div contentEditable={false}>
      <CheckboxStatic
        className="pointer-events-none absolute top-1 -left-6"
        checked={element.checked} />
    </div>
  );
};

export const TodoLiStatic = ({
  children,
  element
}) => {
  return (
    <li
      className={cn('list-none', (element.checked) && 'text-muted-foreground line-through')}>
      {children}
    </li>
  );
};
