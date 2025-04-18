'use client';

import React from 'react';

import { withRef } from '@udecode/cn';
import {
  useMarkToolbarButton,
  useMarkToolbarButtonState,
} from '@udecode/plate/react';

import { ToolbarButton } from './toolbar';

export const MarkToolbarButton = withRef(({ clear, nodeType, ...rest }, ref) => {
  const state = useMarkToolbarButtonState({ clear, nodeType });
  const { props } = useMarkToolbarButton(state);

  return <ToolbarButton ref={ref} {...props} {...rest} />;
});
