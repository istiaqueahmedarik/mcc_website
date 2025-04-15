import React from 'react';

import { cn } from '@udecode/cn';
import { NodeApi, SlateElement } from '@udecode/plate';

export function MediaVideoElementStatic({
  children,
  className,
  ...props
}) {
  const {
    align = 'center',
    caption,
    url,
    width,
  } = props.element;

  return (
    <SlateElement className={cn(className, 'py-2.5')} {...props}>
      <div style={{ textAlign: align }}>
        <figure
          className="group relative m-0 inline-block cursor-default"
          style={{ width }}>
          <video
            className={cn('w-full max-w-full object-cover px-0', 'rounded-sm')}
            src={url}
            controls />
          {caption && <figcaption>{NodeApi.string(caption[0])}</figcaption>}
        </figure>
      </div>
      {children}
    </SlateElement>
  );
}
