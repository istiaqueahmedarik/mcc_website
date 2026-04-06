import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as React from "react";

type SeparatorProps = React.ComponentPropsWithoutRef<
  typeof SeparatorPrimitive.Root
>;

declare const Separator: React.ForwardRefExoticComponent<
  SeparatorProps &
    React.RefAttributes<React.ElementRef<typeof SeparatorPrimitive.Root>>
>;

export { Separator };
