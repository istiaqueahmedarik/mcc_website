"use client";

import Link from "next/link";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { usePathname } from "next/navigation";
import { forwardRef, useEffect, useRef } from "react";

const ProgressLink = forwardRef(function ProgressLink(
  { href, children, className, onClick, ...props },
  ref,
) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      NProgress.done();
      prevPath.current = pathname;
    }
  }, [pathname]);

  const handleClick = (event) => {
    onClick?.(event);

    if (!event.defaultPrevented && pathname !== href) {
      NProgress.start();
    }
  };

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
});

export default ProgressLink;
