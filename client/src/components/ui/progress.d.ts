import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

type ProgressProps = React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> & {
  value?: number;
};

declare const Progress: React.ForwardRefExoticComponent<
  ProgressProps &
    React.RefAttributes<React.ElementRef<typeof ProgressPrimitive.Root>>
>;

export { Progress };
