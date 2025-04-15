import React from 'react';

import { cn } from '@udecode/cn';
import { SlateElement } from '@udecode/plate';

export function MediaAudioElementStatic({
  children,
  className,
  ...props
}) {
  const { url } = props.element;

  return (
    <SlateElement className={cn(className, 'mb-1')} {...props}>
      <figure className="group relative cursor-default">
        <div className="h-16">
          <audio className="size-full" src={url} controls />
        </div>
      </figure>
      {children}
    </SlateElement>
  );
}
