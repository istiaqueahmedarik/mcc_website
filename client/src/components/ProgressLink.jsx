"use client";

import Link from "next/link";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function ProgressLink({ href, children, className }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      NProgress.done();
      prevPath.current = pathname;
    }
  }, [pathname]);

  const handleClick = () => {
    if (pathname !== href) {
      NProgress.start(); // start immediately on click
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
