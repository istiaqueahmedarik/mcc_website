'use client';

import { usePathname } from 'next/navigation';

export default function FooterBackdrop() {
  const pathname = usePathname();
  const plainSurface = pathname === '/admin/forms'
    || pathname?.startsWith('/admin/forms/')
    || pathname?.startsWith('/register/')
    || pathname?.startsWith('/contests_report/details/');

  if (plainSurface) return null;

  return <div aria-hidden="true" className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_50%_0%,black,transparent_70%)] bg-gradient-to-b from-primary/10 via-background to-background" />;
}
