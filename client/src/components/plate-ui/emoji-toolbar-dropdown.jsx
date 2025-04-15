'use client';;
import React from 'react';

import * as Popover from '@radix-ui/react-popover';

export function EmojiToolbarDropdown({
  children,
  control,
  isOpen,
  setIsOpen
}) {
  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>{control}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="z-100">{children}</Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
