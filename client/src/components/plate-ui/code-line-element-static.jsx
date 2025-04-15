import React from 'react';

import { SlateElement } from '@udecode/plate';

export const CodeLineElementStatic = ({
  children,
  ...props
}) => {
  return <SlateElement {...props}>{children}</SlateElement>;
};
