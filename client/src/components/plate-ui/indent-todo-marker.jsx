'use client';;
import { cn } from '@udecode/cn';
import {
  useIndentTodoListElement,
  useIndentTodoListElementState,
} from '@udecode/plate-indent-list/react';
import { useReadOnly } from '@udecode/plate/react';

import { Checkbox } from './checkbox';

export const TodoMarker = ({
  element
}) => {
  const state = useIndentTodoListElementState({ element });
  const { checkboxProps } = useIndentTodoListElement(state);
  const readOnly = useReadOnly();

  return (
    <div contentEditable={false}>
      <Checkbox
        className={cn('absolute top-1 -left-6', readOnly && 'pointer-events-none')}
        {...checkboxProps} />
    </div>
  );
};

export const TodoLi = (props) => {
  const { children, element } = props;

  return (
    <li
      className={cn('list-none', (element.checked) && 'text-muted-foreground line-through')}>
      {children}
    </li>
  );
};
