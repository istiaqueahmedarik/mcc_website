"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function DeferredImage({
  src,
  alt,
  sizes,
  className = "object-cover",
  fallback = null,
}) {
  const containerRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!src) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  return (
    <span ref={containerRef} className="absolute inset-0">
      {src && shouldLoad ? (
        <Image src={src} alt={alt} fill sizes={sizes} className={className} />
      ) : (
        fallback
      )}
    </span>
  );
}
