import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  size?: string;
  asChild?: boolean;
};

declare const buttonVariants: (...args: any[]) => string;

declare const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<any>
>;

export { Button, buttonVariants };
